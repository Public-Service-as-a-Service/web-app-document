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

export class ChatService {
  private authStrategy: AuthStrategy = createAuthStrategy();

  public async streamConversation(args: {
    question: string;
    sessionId?: string;
  }): Promise<Readable> {
    if (!ENEO_API_KEY) {
      throw new HttpException(500, 'Eneo chat not configured (missing ENEO_API_KEY)');
    }
    if (!ENEO_ASSISTANT_ID && !args.sessionId) {
      throw new HttpException(500, 'Eneo chat not configured (missing ENEO_ASSISTANT_ID)');
    }

    // When continuing an existing session, Eneo uses the session's assistant —
    // don't resend assistant_id, it's only valid for new conversations.
    const body: EneoConversationRequest = args.sessionId
      ? { question: args.question, session_id: args.sessionId, stream: true }
      : { question: args.question, assistant_id: ENEO_ASSISTANT_ID, stream: true };

    const gatewayHeaders = await this.authStrategy.getHeaders();
    const requestId = uuidv4();

    try {
      const response = await axios({
        method: 'POST',
        url: `${eneoUrl('conversations')}/`,
        data: body,
        timeout: 60000,
        responseType: 'stream',
        headers: {
          ...gatewayHeaders,
          'api-key': ENEO_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          'X-Request-Id': requestId,
          'X-Sent-By': 'document-app',
        },
      });

      logger.info(
        `Eneo conversation stream opened (sessionId=${args.sessionId ?? 'new'}, requestId=${requestId})`
      );
      return response.data as Readable;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status) {
        const status = error.response.status;
        if (status === 401) {
          this.authStrategy.invalidate();
        }
        logger.error(`Eneo conversation request failed (${status})`);
        const mappedStatus = status >= 500 ? 502 : status;
        throw new HttpException(mappedStatus, 'Eneo chat request failed');
      }
      logger.error(`Eneo conversation request failed: ${String(error)}`);
      throw new HttpException(502, 'Eneo chat is unavailable');
    }
  }
}

export default ChatService;
