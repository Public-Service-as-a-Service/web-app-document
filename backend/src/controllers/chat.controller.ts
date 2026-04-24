import { Body, Controller, Post, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { Request, Response } from 'express';
import ChatService from '@services/chat.service';
import { logger } from '@utils/logger';
import { HttpException } from '@/exceptions/http.exception';
import authMiddleware from '@middlewares/auth.middleware';
import { validationMiddleware } from '@middlewares/validation.middleware';
import { ChatConversationRequestDto } from '@/dtos/chat.dto';

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

      upstream.pipe(res);
      return res;
    } catch (error) {
      logger.error(`Failed to stream chat conversation: ${error}`);
      throw error instanceof HttpException
        ? error
        : new HttpException(500, 'Failed to stream chat conversation');
    }
  }
}
