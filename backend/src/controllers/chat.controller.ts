import { Body, Controller, Post, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { Request, Response } from 'express';
import { Transform } from 'stream';
import ChatService from '@services/chat.service';
import { logger } from '@utils/logger';
import { HttpException } from '@/exceptions/http.exception';
import authMiddleware from '@middlewares/auth.middleware';
import { validationMiddleware } from '@middlewares/validation.middleware';
import { ChatConversationRequestDto } from '@/dtos/chat.dto';

// Diagnostic passthrough — logs each incoming SSE chunk as it arrives and
// the full concatenated stream at end. Shows event names, data payloads,
// cadence and total size, so we can stop guessing what Eneo emits and fix
// the parser/UI accordingly. Safe to remove once streaming is proven.
const createSampleTap = (requestId: string): Transform => {
  const MAX_TOTAL_LOG = 32_000;
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  let chunkCount = 0;
  const startedAt = Date.now();

  return new Transform({
    transform(chunk: Buffer, _enc, callback) {
      chunkCount += 1;
      totalBytes += chunk.length;
      chunks.push(chunk);
      const preview = chunk.toString('utf-8').replace(/\n/g, '\\n').slice(0, 200);
      logger.info(
        `Eneo SSE chunk #${chunkCount} [${requestId}] (${chunk.length} B, +${
          Date.now() - startedAt
        }ms): ${preview}`
      );
      callback(null, chunk);
    },
    flush(callback) {
      const full = Buffer.concat(chunks).toString('utf-8');
      const truncated = full.length > MAX_TOTAL_LOG ? full.slice(0, MAX_TOTAL_LOG) + '…' : full;
      logger.info(
        `Eneo SSE complete [${requestId}] ${chunkCount} chunks, ${totalBytes} bytes, ${
          Date.now() - startedAt
        }ms total:\n${truncated}`
      );
      callback();
    },
  });
};

@Controller()
@UseBefore(authMiddleware)
export class ChatController {
  private chatService = new ChatService();

  @Post('/chat/conversations')
  @OpenAPI({
    summary:
      'Start or continue a conversation with the Eneo assistant. Streams Server-Sent Events back to the client.',
    responses: {
      200: {
        description: 'SSE stream (text/event-stream)',
        content: {
          'text/event-stream': {
            schema: { type: 'string' },
          },
        },
      },
    },
  })
  @UseBefore(validationMiddleware(ChatConversationRequestDto, 'body'))
  async streamConversation(
    @Body() body: ChatConversationRequestDto,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      const upstream = await this.chatService.streamConversation({
        question: body.question,
        sessionId: body.sessionId,
      });

      res.status(200);
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();

      // If the user closes the browser tab, stop reading from upstream.
      req.on('close', () => {
        upstream.destroy();
      });

      upstream.on('error', (err) => {
        logger.error(`Eneo stream error: ${err.message}`);
        if (!res.writableEnded) {
          res.write(`event: error\ndata: ${JSON.stringify({ message: 'stream_error' })}\n\n`);
          res.end();
        }
      });

      const tap = createSampleTap(req.header('x-request-id') ?? 'no-id');
      upstream.pipe(tap).pipe(res);
      return res;
    } catch (error) {
      logger.error(`Failed to stream chat conversation: ${error}`);
      throw error instanceof HttpException
        ? error
        : new HttpException(500, 'Failed to stream chat conversation');
    }
  }
}
