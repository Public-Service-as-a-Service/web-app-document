import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Res,
  UseBefore,
} from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';
import { Response } from 'express';
import ApiService from '@services/api.service';
import { logger } from '@utils/logger';
import { HttpException } from '@/exceptions/http.exception';
import { municipalityApiURL } from '@/utils/util';
import authMiddleware from '@middlewares/auth.middleware';
import { hasPermissions } from '@middlewares/permissions.middleware';
import { validationMiddleware } from '@middlewares/validation.middleware';
import { DocumentTypeCreateDto, DocumentTypeUpdateDto } from '@/dtos/document.dto';
import { DocumentTypeDto } from '@/responses/document.response';

const noContentResponses = { 204: { description: 'No content' } } as const;

@Controller()
@UseBefore(authMiddleware)
export class DocumentTypeController {
  private apiService = new ApiService();

  @Get('/admin/documenttypes')
  @OpenAPI({ summary: 'List document types' })
  @ResponseSchema(DocumentTypeDto, { isArray: true })
  async getDocumentTypes(@Res() response: Response) {
    try {
      const res = await this.apiService.get<DocumentTypeDto[]>({
        url: municipalityApiURL('admin', 'documenttypes'),
      });

      return response.status(200).json({
        data: res.data,
        message: 'success',
      });
    } catch (error) {
      logger.error(`Failed to fetch document types: ${error}`);
      throw error instanceof HttpException
        ? error
        : new HttpException(500, 'Failed to fetch document types');
    }
  }

  @Post('/admin/documenttypes')
  @OpenAPI({ summary: 'Create document type' })
  @ResponseSchema(DocumentTypeDto, { statusCode: 201, description: 'Created' })
  @UseBefore(hasPermissions(['canManageDocumentTypes']))
  @UseBefore(validationMiddleware(DocumentTypeCreateDto, 'body'))
  async createDocumentType(@Body() body: DocumentTypeCreateDto, @Res() response: Response) {
    try {
      const res = await this.apiService.post<DocumentTypeDto>({
        url: municipalityApiURL('admin', 'documenttypes'),
        data: body,
      });

      return response.status(201).json({
        data: res.data,
        message: 'success',
      });
    } catch (error) {
      logger.error(`Failed to create document type: ${error}`);
      throw error instanceof HttpException
        ? error
        : new HttpException(500, 'Failed to create document type');
    }
  }

  @Get('/admin/documenttypes/:type')
  @OpenAPI({ summary: 'Get document type' })
  @ResponseSchema(DocumentTypeDto)
  async getDocumentType(@Param('type') type: string, @Res() response: Response) {
    try {
      const res = await this.apiService.get<DocumentTypeDto>({
        url: municipalityApiURL('admin', 'documenttypes', type),
      });

      return response.status(200).json({
        data: res.data,
        message: 'success',
      });
    } catch (error) {
      logger.error(`Failed to fetch document type ${type}: ${error}`);
      throw error instanceof HttpException
        ? error
        : new HttpException(500, 'Failed to fetch document type');
    }
  }

  @Patch('/admin/documenttypes/:type')
  @OpenAPI({ summary: 'Update document type', responses: noContentResponses })
  @UseBefore(hasPermissions(['canManageDocumentTypes']))
  @UseBefore(validationMiddleware(DocumentTypeUpdateDto, 'body'))
  async updateDocumentType(
    @Param('type') type: string,
    @Body() body: DocumentTypeUpdateDto,
    @Res() response: Response
  ) {
    try {
      await this.apiService.patch<void>({
        url: municipalityApiURL('admin', 'documenttypes', type),
        data: body,
      });

      return response.status(204).send();
    } catch (error) {
      logger.error(`Failed to update document type ${type}: ${error}`);
      throw error instanceof HttpException
        ? error
        : new HttpException(500, 'Failed to update document type');
    }
  }

  @Delete('/admin/documenttypes/:type')
  @OpenAPI({ summary: 'Delete document type', responses: noContentResponses })
  @UseBefore(hasPermissions(['canManageDocumentTypes']))
  async deleteDocumentType(@Param('type') type: string, @Res() response: Response) {
    try {
      await this.apiService.delete<void>({
        url: municipalityApiURL('admin', 'documenttypes', type),
      });

      return response.status(204).send();
    } catch (error) {
      logger.error(`Failed to delete document type ${type}: ${error}`);
      throw error instanceof HttpException
        ? error
        : new HttpException(500, 'Failed to delete document type');
    }
  }
}
