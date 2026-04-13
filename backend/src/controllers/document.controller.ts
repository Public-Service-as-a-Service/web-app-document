import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Body,
  Res,
  Req,
  UseBefore,
} from 'routing-controllers';
import { Request, Response } from 'express';
import ApiService from '@services/api.service';
import { logger } from '@utils/logger';
import { HttpException } from '@/exceptions/http.exception';
import { municipalityApiURL } from '@/utils/util';
import authMiddleware from '@middlewares/auth.middleware';
import type {
  PagedDocumentResponse,
  Document,
  DocumentUpdateRequest,
  ConfidentialityUpdateRequest,
  DocumentFilterParameters,
} from '@/interfaces/document.interface';
import FormData from 'form-data';
import multer from 'multer';

const upload = multer();

@Controller()
@UseBefore(authMiddleware)
export class DocumentController {
  private apiService = new ApiService();

  @Get('/documents')
  async searchDocuments(@Req() req: Request, @Res() response: Response) {
    try {
      const res = await this.apiService.get<PagedDocumentResponse>({
        url: municipalityApiURL('documents'),
        params: req.query,
      });

      return response.status(200).json({
        data: res.data,
        message: 'success',
      });
    } catch (error) {
      logger.error(`Failed to search documents: ${error}`);
      throw error instanceof HttpException
        ? error
        : new HttpException(500, 'Failed to search documents');
    }
  }

  @Post('/documents/filter')
  async filterDocuments(@Body() body: DocumentFilterParameters, @Res() response: Response) {
    try {
      const res = await this.apiService.post<PagedDocumentResponse>({
        url: municipalityApiURL('documents', 'filter'),
        data: body,
      });

      return response.status(200).json({
        data: res.data,
        message: 'success',
      });
    } catch (error) {
      logger.error(`Failed to filter documents: ${error}`);
      throw error instanceof HttpException
        ? error
        : new HttpException(500, 'Failed to filter documents');
    }
  }

  @Get('/documents/:registrationNumber')
  async getDocument(
    @Param('registrationNumber') registrationNumber: string,
    @Req() req: Request,
    @Res() response: Response
  ) {
    try {
      const res = await this.apiService.get<Document>({
        url: municipalityApiURL('documents', registrationNumber),
        params: req.query,
      });

      return response.status(200).json({
        data: res.data,
        message: 'success',
      });
    } catch (error) {
      logger.error(`Failed to fetch document ${registrationNumber}: ${error}`);
      throw error instanceof HttpException
        ? error
        : new HttpException(500, 'Failed to fetch document');
    }
  }

  @Post('/documents')
  async createDocument(@Req() req: Request, @Res() response: Response) {
    try {
      await new Promise<void>((resolve, reject) => {
        upload.array('documentFiles')(req, response, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const formData = new FormData();
      const documentJson = req.body.document;
      formData.append(
        'document',
        typeof documentJson === 'string' ? documentJson : JSON.stringify(documentJson),
        {
          contentType: 'application/json',
        }
      );

      const files = req.files as Express.Multer.File[];
      if (files) {
        for (const file of files) {
          formData.append('documentFiles', file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype,
          });
        }
      }

      const res = await this.apiService.postMultipart<Document>({
        url: municipalityApiURL('documents'),
        data: formData,
        headers: formData.getHeaders(),
      });

      return response.status(201).json({
        data: res.data,
        message: 'success',
      });
    } catch (error) {
      logger.error(`Failed to create document: ${error}`);
      throw error instanceof HttpException
        ? error
        : new HttpException(500, 'Failed to create document');
    }
  }

  @Patch('/documents/:registrationNumber')
  async updateDocument(
    @Param('registrationNumber') registrationNumber: string,
    @Body() body: DocumentUpdateRequest,
    @Req() req: Request,
    @Res() response: Response
  ) {
    try {
      const res = await this.apiService.patch<Document>({
        url: municipalityApiURL('documents', registrationNumber),
        data: body,
        params: req.query,
      });

      return response.status(200).json({
        data: res.data,
        message: 'success',
      });
    } catch (error) {
      logger.error(`Failed to update document ${registrationNumber}: ${error}`);
      throw error instanceof HttpException
        ? error
        : new HttpException(500, 'Failed to update document');
    }
  }

  @Patch('/documents/:registrationNumber/confidentiality')
  async updateConfidentiality(
    @Param('registrationNumber') registrationNumber: string,
    @Body() body: ConfidentialityUpdateRequest,
    @Res() response: Response
  ) {
    try {
      await this.apiService.patch<void>({
        url: municipalityApiURL('documents', registrationNumber, 'confidentiality'),
        data: body,
      });

      return response.status(200).json({
        data: null,
        message: 'success',
      });
    } catch (error) {
      logger.error(`Failed to update confidentiality for ${registrationNumber}: ${error}`);
      throw error instanceof HttpException
        ? error
        : new HttpException(500, 'Failed to update confidentiality');
    }
  }

  @Put('/documents/:registrationNumber/files')
  async addOrReplaceFile(
    @Param('registrationNumber') registrationNumber: string,
    @Req() req: Request,
    @Res() response: Response
  ) {
    try {
      await new Promise<void>((resolve, reject) => {
        upload.single('documentFile')(req, response, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const formData = new FormData();
      const documentJson = req.body.document;
      formData.append(
        'document',
        typeof documentJson === 'string' ? documentJson : JSON.stringify(documentJson),
        {
          contentType: 'application/json',
        }
      );

      const file = req.file as Express.Multer.File;
      if (file) {
        formData.append('documentFile', file.buffer, {
          filename: file.originalname,
          contentType: file.mimetype,
        });
      }

      await this.apiService.putMultipart<void>({
        url: municipalityApiURL('documents', registrationNumber, 'files'),
        data: formData,
        headers: formData.getHeaders(),
      });

      return response.status(204).send();
    } catch (error) {
      logger.error(`Failed to upload file for ${registrationNumber}: ${error}`);
      throw error instanceof HttpException
        ? error
        : new HttpException(500, 'Failed to upload file');
    }
  }

  @Get('/documents/:registrationNumber/files/:documentDataId')
  async downloadFile(
    @Param('registrationNumber') registrationNumber: string,
    @Param('documentDataId') documentDataId: string,
    @Res() response: Response
  ) {
    try {
      const upstream = await this.apiService.getRaw({
        url: municipalityApiURL('documents', registrationNumber, 'files', documentDataId),
      });

      const contentType = upstream.headers['content-type'];
      const contentDisposition = upstream.headers['content-disposition'];

      if (contentType) response.setHeader('Content-Type', contentType);
      if (contentDisposition) response.setHeader('Content-Disposition', contentDisposition);

      upstream.data.pipe(response);
      return response;
    } catch (error) {
      logger.error(`Failed to download file ${documentDataId}: ${error}`);
      throw error instanceof HttpException
        ? error
        : new HttpException(500, 'Failed to download file');
    }
  }

  @Delete('/documents/:registrationNumber/files/:documentDataId')
  async deleteFile(
    @Param('registrationNumber') registrationNumber: string,
    @Param('documentDataId') documentDataId: string,
    @Res() response: Response
  ) {
    try {
      await this.apiService.delete<void>({
        url: municipalityApiURL('documents', registrationNumber, 'files', documentDataId),
      });

      return response.status(204).send();
    } catch (error) {
      logger.error(`Failed to delete file ${documentDataId}: ${error}`);
      throw error instanceof HttpException
        ? error
        : new HttpException(500, 'Failed to delete file');
    }
  }

  @Get('/documents/:registrationNumber/revisions')
  async getRevisions(
    @Param('registrationNumber') registrationNumber: string,
    @Req() req: Request,
    @Res() response: Response
  ) {
    try {
      const res = await this.apiService.get<PagedDocumentResponse>({
        url: municipalityApiURL('documents', registrationNumber, 'revisions'),
        params: req.query,
      });

      return response.status(200).json({
        data: res.data,
        message: 'success',
      });
    } catch (error) {
      logger.error(`Failed to fetch revisions for ${registrationNumber}: ${error}`);
      throw error instanceof HttpException
        ? error
        : new HttpException(500, 'Failed to fetch revisions');
    }
  }

  @Get('/documents/:registrationNumber/revisions/:revision')
  async getRevision(
    @Param('registrationNumber') registrationNumber: string,
    @Param('revision') revision: number,
    @Req() req: Request,
    @Res() response: Response
  ) {
    try {
      const res = await this.apiService.get<Document>({
        url: municipalityApiURL('documents', registrationNumber, 'revisions', String(revision)),
        params: req.query,
      });

      return response.status(200).json({
        data: res.data,
        message: 'success',
      });
    } catch (error) {
      logger.error(`Failed to fetch revision ${revision} for ${registrationNumber}: ${error}`);
      throw error instanceof HttpException
        ? error
        : new HttpException(500, 'Failed to fetch revision');
    }
  }

  @Get('/documents/:registrationNumber/revisions/:revision/files/:documentDataId')
  async downloadRevisionFile(
    @Param('registrationNumber') registrationNumber: string,
    @Param('revision') revision: number,
    @Param('documentDataId') documentDataId: string,
    @Res() response: Response
  ) {
    try {
      const upstream = await this.apiService.getRaw({
        url: municipalityApiURL(
          'documents',
          registrationNumber,
          'revisions',
          String(revision),
          'files',
          documentDataId
        ),
      });

      const contentType = upstream.headers['content-type'];
      const contentDisposition = upstream.headers['content-disposition'];

      if (contentType) response.setHeader('Content-Type', contentType);
      if (contentDisposition) response.setHeader('Content-Disposition', contentDisposition);

      upstream.data.pipe(response);
      return response;
    } catch (error) {
      logger.error(`Failed to download revision file ${documentDataId}: ${error}`);
      throw error instanceof HttpException
        ? error
        : new HttpException(500, 'Failed to download revision file');
    }
  }
}
