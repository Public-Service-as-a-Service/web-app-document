import { Controller, Get, Post, Patch, Delete, Param, Body, Res } from 'routing-controllers';
import { Response } from 'express';
import ApiService from '@services/api.service';
import { logger } from '@utils/logger';
import { HttpException } from '@/exceptions/http.exception';
import { municipalityApiURL } from '@/utils/util';
import type {
  DocumentType,
  DocumentTypeCreateRequest,
  DocumentTypeUpdateRequest,
} from '@/interfaces/document.interface';

@Controller()
export class DocumentTypeController {
  private apiService = new ApiService();

  @Get('/admin/documenttypes')
  async getDocumentTypes(@Res() response: Response) {
    try {
      const res = await this.apiService.get<DocumentType[]>({
        url: municipalityApiURL('admin', 'documenttypes'),
      });

      return response.status(200).json({
        data: res.data,
        message: 'success',
      });
    } catch (error) {
      logger.error(`Failed to fetch document types: ${error}`);
      throw error instanceof HttpException ? error : new HttpException(500, 'Failed to fetch document types');
    }
  }

  @Post('/admin/documenttypes')
  async createDocumentType(@Body() body: DocumentTypeCreateRequest, @Res() response: Response) {
    try {
      const res = await this.apiService.post<DocumentType>({
        url: municipalityApiURL('admin', 'documenttypes'),
        data: body,
      });

      return response.status(201).json({
        data: res.data,
        message: 'success',
      });
    } catch (error) {
      logger.error(`Failed to create document type: ${error}`);
      throw error instanceof HttpException ? error : new HttpException(500, 'Failed to create document type');
    }
  }

  @Get('/admin/documenttypes/:type')
  async getDocumentType(@Param('type') type: string, @Res() response: Response) {
    try {
      const res = await this.apiService.get<DocumentType>({
        url: municipalityApiURL('admin', 'documenttypes', type),
      });

      return response.status(200).json({
        data: res.data,
        message: 'success',
      });
    } catch (error) {
      logger.error(`Failed to fetch document type ${type}: ${error}`);
      throw error instanceof HttpException ? error : new HttpException(500, 'Failed to fetch document type');
    }
  }

  @Patch('/admin/documenttypes/:type')
  async updateDocumentType(
    @Param('type') type: string,
    @Body() body: DocumentTypeUpdateRequest,
    @Res() response: Response,
  ) {
    try {
      await this.apiService.patch<void>({
        url: municipalityApiURL('admin', 'documenttypes', type),
        data: body,
      });

      return response.status(204).send();
    } catch (error) {
      logger.error(`Failed to update document type ${type}: ${error}`);
      throw error instanceof HttpException ? error : new HttpException(500, 'Failed to update document type');
    }
  }

  @Delete('/admin/documenttypes/:type')
  async deleteDocumentType(@Param('type') type: string, @Res() response: Response) {
    try {
      await this.apiService.delete<void>({
        url: municipalityApiURL('admin', 'documenttypes', type),
      });

      return response.status(204).send();
    } catch (error) {
      logger.error(`Failed to delete document type ${type}: ${error}`);
      throw error instanceof HttpException ? error : new HttpException(500, 'Failed to delete document type');
    }
  }
}
