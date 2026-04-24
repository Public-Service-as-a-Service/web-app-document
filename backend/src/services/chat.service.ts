import axios from 'axios';
import type { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import { ENEO_API_KEY, ENEO_ASSISTANT_ID } from '@config';
import { getApiBase, getServiceBaseUrl } from '@config/api-config';
import { HttpException } from '@/exceptions/http.exception';
import { logger } from '@utils/logger';
import { createAuthStrategy, type AuthStrategy } from './auth';
import type { EneoConversationRequest } from '@/interfaces/chat.interface';

const ENEO_SERVICE = 'eneo-sundsvall';

const eneoUrl = (...parts: string[]): string => {
  const baseUrl = getServiceBaseUrl(ENEO_SERVICE);
  const apiBase = getApiBase(ENEO_SERVICE);
  return [baseUrl, apiBase, ...parts]
    .map((part) => part?.replace(/(^\/|\/+$)/g, ''))
    .filter(Boolean)
    .join('/');
};

// Drains an axios error-response stream so we can log what upstream actually
// said. When responseType='stream' the error body isn't parsed automatically.
const readErrorBody = async (stream: unknown): Promise<string> => {
  if (!stream || typeof (stream as Readable).on !== 'function') return '';
  return await new Promise<string>((resolve) => {
    const chunks: Buffer[] = [];
    const readable = stream as Readable;
    const finish = () => resolve(Buffer.concat(chunks).toString('utf-8').slice(0, 2000));
    readable.on('data', (chunk: Buffer) => chunks.push(chunk));
    readable.on('end', finish);
    readable.on('error', finish);
    setTimeout(finish, 2000);
  });
};

// Headers we care about when diagnosing a rejected request. Auth headers
// are reported as `Bearer <N chars>` / `<N chars>` so a typo or empty
// secret surfaces without leaking the secret itself.
const SECRET_HEADERS = new Set(['authorization', 'x-authorization', 'api-key']);

const summariseRequestHeaders = (headers: Record<string, unknown>): Record<string, string> => {
  const summary: Record<string, string> = {};
  for (const [rawKey, rawValue] of Object.entries(headers)) {
    if (rawValue === undefined || rawValue === null) continue;
    const value = String(rawValue);
    if (SECRET_HEADERS.has(rawKey.toLowerCase())) {
      summary[rawKey] = value.startsWith('Bearer ')
        ? `Bearer <${value.length - 7} chars>`
        : `<${value.length} chars>`;
    } else {
      summary[rawKey] = value;
    }
  }
  return summary;
};

export class ChatService {
  private authStrategy: AuthStrategy = createAuthStrategy();

  public async streamConversation(args: {
    question: string;
    sessionId?: string;
  }): Promise<Readable> {
    if (!ENEO_API_KEY) {
      throw new HttpException(500, 'Eneo chat not configured (missing ENEO_API_KEY)');
    }
    if (!ENEO_ASSISTANT_ID) {
      throw new HttpException(500, 'Eneo chat not configured (missing ENEO_ASSISTANT_ID)');
    }

    // Mirrors the /assistants/{id}/sessions/ shape that felanmalan already
    // calls successfully through the same gateway — proven subscription and
    // path. assistant_id lives in the URL path (not the body), session_id is
    // optional in the body for continuing an existing session.
    const body: Pick<EneoConversationRequest, 'question' | 'session_id' | 'stream'> = {
      question: args.question,
      stream: true,
      ...(args.sessionId ? { session_id: args.sessionId } : {}),
    };

    const gatewayHeaders = await this.authStrategy.getHeaders();
    const requestId = uuidv4();
    const url = `${eneoUrl('assistants', encodeURIComponent(ENEO_ASSISTANT_ID), 'sessions')}/`;

    // WSO2 has an XAuthorization token-exchange policy on this API:
    // it reads `X-Authorization` and rewrites it to `Authorization` before
    // forwarding to Eneo (overwriting WSO2's own Bearer which is only for
    // subscription validation). So we carry *two* auth tokens: WSO2's in
    // `Authorization`, Eneo's in `X-Authorization`.
    const requestHeaders: Record<string, string> = {
      ...gatewayHeaders,
      'X-Authorization': `Bearer ${ENEO_API_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      'X-Request-Id': requestId,
      'X-Sent-By': 'document-app',
    };

    logger.info(
      `Eneo → POST ${url} (requestId=${requestId}, sessionId=${
        args.sessionId ?? 'new'
      }, assistantId=${ENEO_ASSISTANT_ID}, questionChars=${args.question.length})`
    );
    logger.info(`Eneo request headers: ${JSON.stringify(summariseRequestHeaders(requestHeaders))}`);

    try {
      const response = await axios({
        method: 'POST',
        url,
        // `?version=1` is required by Eneo's OpenAPI spec and also acts as
        // WSO2's subscription-version selector — omitting it gets the request
        // routed to a product the client isn't subscribed to and comes back as
        // NOT_AUTHORIZED even when the Bearer is perfectly valid.
        params: { version: 1 },
        data: body,
        timeout: 60000,
        responseType: 'stream',
        headers: requestHeaders,
      });

      logger.info(
        `Eneo conversation stream opened (status=${response.status}, requestId=${requestId})`
      );
      return response.data as Readable;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status) {
        const status = error.response.status;
        const respHeaders = error.response.headers as Record<string, string> | undefined;
        const responseBody = await readErrorBody(error.response.data);
        logger.error(`Eneo conversation request failed (status=${status}, requestId=${requestId})`);
        logger.error(`Eneo response content-type: ${respHeaders?.['content-type'] ?? 'unknown'}`);
        logger.error(`Eneo response body: ${responseBody || '<empty>'}`);
        if (status === 401) {
          // Only invalidate WSO2's cached token when the gateway itself rejected
          // us. A 401 from Eneo (with api-key error) shouldn't wipe the Bearer.
          const isGatewayRejection = /NOT_AUTHORIZED|APIM|WSO2|token/i.test(responseBody);
          if (isGatewayRejection) {
            this.authStrategy.invalidate();
          }
        }
        const mappedStatus = status >= 500 ? 502 : status;
        throw new HttpException(mappedStatus, 'Eneo chat request failed');
      }
      logger.error(`Eneo conversation request failed: ${String(error)}`);
      throw new HttpException(502, 'Eneo chat is unavailable');
    }
  }
}

export default ChatService;
