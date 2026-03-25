import { Controller, Get, Post, Param, Body, Res } from 'routing-controllers';
import { Response } from 'express';
import ApiService from '@services/api.service';
import { logger } from '@utils/logger';
import { HttpException } from '@/exceptions/http.exception';

@Controller()
export class DocumentController {
  private apiService = new ApiService();

  @Get('/documents')
  async getDocuments(@Res() response: Response) {
    try {
      const res = await this.apiService.get<{ content: unknown[] }>({
        url: '/documents',
      });

      return response.status(200).json({
        data: res.data.content || [],
        message: 'success',
      });
    } catch (error) {
      logger.error(`Failed to fetch documents: ${error}`);
      throw error instanceof HttpException ? error : new HttpException(500, 'Failed to fetch documents');
    }
  }

  @Get('/documents/:id')
  async getDocument(@Param('id') id: string, @Res() response: Response) {
    try {
      const res = await this.apiService.get<unknown>({
        url: `/documents/${id}`,
      });

      return response.status(200).json({
        data: res.data,
        message: 'success',
      });
    } catch (error) {
      logger.error(`Failed to fetch document ${id}: ${error}`);
      throw error instanceof HttpException ? error : new HttpException(500, 'Failed to fetch document');
    }
  }

  @Post('/documents')
  async createDocument(@Body() body: unknown, @Res() response: Response) {
    try {
      const res = await this.apiService.post<unknown>({
        url: '/documents',
        data: body,
      });

      return response.status(201).json({
        data: res.data,
        message: 'success',
      });
    } catch (error) {
      logger.error(`Failed to create document: ${error}`);
      throw error instanceof HttpException ? error : new HttpException(500, 'Failed to create document');
    }
  }
}
