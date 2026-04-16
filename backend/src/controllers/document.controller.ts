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
import { OpenAPI } from 'routing-controllers-openapi';
import { Request, Response } from 'express';
import type { OperationObject, RequestBodyObject } from 'openapi3-ts';
import ApiService from '@services/api.service';
import { logger } from '@utils/logger';
import { HttpException } from '@/exceptions/http.exception';
import { municipalityApiURL } from '@/utils/util';
import authMiddleware from '@middlewares/auth.middleware';
import { validationMiddleware } from '@middlewares/validation.middleware';
import { DocumentFilterParametersDto, DocumentUpdateDto } from '@/dtos/document.dto';
import { mergeReservedPublicationMetadata } from '@/utils/public-document';
import {
  sanitizeCreateMetadataList,
  sanitizeUpdateMetadataList,
} from '@/utils/document-metadata-policy';
import type {
  PagedDocumentResponse,
  Document,
  DocumentFilterParameters,
} from '@/interfaces/document.interface';
import FormData from 'form-data';
import multer from 'multer';

const upload = multer();

type UpstreamDocument = Document & {
  confidentiality?: {
    confidential?: boolean;
  };
};

type SafeDocument = Omit<Document, 'confidentiality'>;

type PagedUpstreamDocumentResponse = Omit<PagedDocumentResponse, 'documents'> & {
  documents: UpstreamDocument[];
};

type SafePagedDocumentResponse = Omit<PagedDocumentResponse, 'documents'> & {
  documents: SafeDocument[];
};

const NON_CONFIDENTIAL_QUERY = { includeConfidential: 'false' };
const NON_CONFIDENTIAL_FILTER = { includeConfidential: false };
const jsonResponse = (description = 'Successful response') =>
  ({
    description,
    content: {
      'application/json': {
        schema: {
          type: 'object',
        },
      },
    },
  }) as const;
const noContentResponse = { description: 'No content' } as const;
const fileResponse = {
  description: 'File stream',
  content: {
    'application/octet-stream': {
      schema: {
        type: 'string',
        format: 'binary',
      },
    },
  },
} as const;
const documentMultipartRequestBody: RequestBodyObject = {
  required: true,
  content: {
    'multipart/form-data': {
      schema: {
        type: 'object',
        properties: {
          document: {
            oneOf: [{ type: 'string' }, { type: 'string', format: 'binary' }],
          },
          documentFiles: {
            type: 'array',
            items: {
              type: 'string',
              format: 'binary',
            },
          },
        },
        required: ['document'],
      },
    },
  },
};
const documentFileMultipartRequestBody: RequestBodyObject = {
  required: true,
  content: {
    'multipart/form-data': {
      schema: {
        type: 'object',
        properties: {
          document: {
            oneOf: [{ type: 'string' }, { type: 'string', format: 'binary' }],
          },
          documentFile: {
            type: 'string',
            format: 'binary',
          },
        },
        required: ['document'],
      },
    },
  },
};
const openApi = ({
  summary,
  responses,
  requestBody,
}: {
  summary: string;
  responses: OperationObject['responses'];
  requestBody?: RequestBodyObject;
}) => {
  return (operation: OperationObject) => ({
    ...operation,
    summary,
    responses,
    ...(requestBody ? { requestBody } : {}),
  });
};

const withoutConfidentialQuery = (query: Request['query']): Record<string, unknown> => {
  const { includeConfidential: _includeConfidential, ...rest } = query as Record<string, unknown>;
  return { ...rest, ...NON_CONFIDENTIAL_QUERY };
};

const withoutConfidentialFilter = (body: DocumentFilterParameters): Record<string, unknown> => {
  const { includeConfidential: _includeConfidential, ...rest } = (body || {}) as Record<
    string,
    unknown
  >;
  return { ...rest, ...NON_CONFIDENTIAL_FILTER };
};

const hasConfidentialityField = (data: unknown): boolean =>
  typeof data === 'object' &&
  data !== null &&
  !Array.isArray(data) &&
  Object.prototype.hasOwnProperty.call(data, 'confidentiality');

const assertNoConfidentialityPayload = (data: unknown): void => {
  if (hasConfidentialityField(data)) {
    throw new HttpException(400, 'Confidential documents are not supported');
  }
};

const parseDocumentPayload = (documentJson: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(documentJson) as unknown;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('Document payload must be an object');
    }
    assertNoConfidentialityPayload(parsed);
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof HttpException) {
      throw error;
    }
    throw new HttpException(400, 'Invalid document payload');
  }
};

const asNonEmptyString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const normalizeFileRevisionActorPayload = (
  payload: Record<string, unknown>
): { createdBy: string } => {
  const updatedBy = asNonEmptyString(payload.updatedBy);
  const createdBy = asNonEmptyString(payload.createdBy);
  const actor = updatedBy || createdBy;

  if (!actor) {
    throw new HttpException(400, 'Invalid document payload');
  }

  // Upstream contract still expects `createdBy` for file changes.
  // Accept `updatedBy` from frontend as a clearer intent and map it here.
  return { createdBy: actor };
};

const isConfidentialDocument = (document: UpstreamDocument): boolean =>
  document.confidentiality?.confidential === true;

const stripConfidentiality = (document: UpstreamDocument): SafeDocument => {
  const { confidentiality: _confidentiality, ...safeDocument } = document;
  return safeDocument;
};

const assertNonConfidentialDocument = (document: UpstreamDocument): void => {
  if (isConfidentialDocument(document)) {
    throw new HttpException(404, 'Not found');
  }
};

const sanitizeDocumentResponse = (document: UpstreamDocument): SafeDocument => {
  assertNonConfidentialDocument(document);
  return stripConfidentiality(document);
};

const sanitizePagedDocumentResponse = (
  response: PagedUpstreamDocumentResponse
): SafePagedDocumentResponse => {
  const documents = (response.documents || [])
    .filter((document) => !isConfidentialDocument(document))
    .map(stripConfidentiality);

  return { ...response, documents };
};

@Controller()
@UseBefore(authMiddleware)
export class DocumentController {
  private apiService = new ApiService();

  @Get('/documents')
  @OpenAPI(
    openApi({
      summary: 'Search documents with query parameters',
      responses: { 200: jsonResponse() },
    })
  )
  async searchDocuments(@Req() req: Request, @Res() response: Response) {
    try {
      const res = await this.apiService.get<PagedUpstreamDocumentResponse>({
        url: municipalityApiURL('documents'),
        params: withoutConfidentialQuery(req.query),
      });

      return response.status(200).json({
        data: sanitizePagedDocumentResponse(res.data),
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
  @OpenAPI(
    openApi({
      summary: 'Filter documents with structured parameters',
      responses: { 200: jsonResponse() },
    })
  )
  @UseBefore(validationMiddleware(DocumentFilterParametersDto, 'body'))
  async filterDocuments(@Body() body: DocumentFilterParametersDto, @Res() response: Response) {
    try {
      const res = await this.apiService.post<PagedUpstreamDocumentResponse>({
        url: municipalityApiURL('documents', 'filter'),
        data: withoutConfidentialFilter(body),
      });

      return response.status(200).json({
        data: sanitizePagedDocumentResponse(res.data),
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
  @OpenAPI(
    openApi({
      summary: 'Get a document by registration number',
      responses: { 200: jsonResponse() },
    })
  )
  async getDocument(
    @Param('registrationNumber') registrationNumber: string,
    @Req() req: Request,
    @Res() response: Response
  ) {
    try {
      const res = await this.apiService.get<UpstreamDocument>({
        url: municipalityApiURL('documents', registrationNumber),
        params: withoutConfidentialQuery(req.query),
      });

      return response.status(200).json({
        data: sanitizeDocumentResponse(res.data),
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
  @OpenAPI(
    openApi({
      summary: 'Create a new document with file attachments',
      requestBody: documentMultipartRequestBody,
      responses: { 201: jsonResponse('Created') },
    })
  )
  async createDocument(@Req() req: Request, @Res() response: Response) {
    try {
      await new Promise<void>((resolve, reject) => {
        upload.fields([{ name: 'document', maxCount: 1 }, { name: 'documentFiles' }])(
          req,
          response,
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      const formData = new FormData();
      const parsedFiles = req.files as Record<string, Express.Multer.File[]>;
      const documentFile = parsedFiles?.document?.[0];
      const documentJson = documentFile
        ? documentFile.buffer.toString('utf-8')
        : typeof req.body.document === 'string'
          ? req.body.document
          : JSON.stringify(req.body.document);
      const parsedDocumentPayload = parseDocumentPayload(documentJson);
      const documentPayloadForUpstream = {
        ...parsedDocumentPayload,
        metadataList: sanitizeCreateMetadataList(parsedDocumentPayload.metadataList),
      };

      formData.append('document', JSON.stringify(documentPayloadForUpstream), {
        contentType: 'application/json',
      });

      const documentFiles = parsedFiles?.documentFiles || [];
      for (const file of documentFiles) {
        formData.append('documentFiles', file.buffer, {
          filename: file.originalname,
          contentType: file.mimetype,
        });
      }

      const res = await this.apiService.postMultipart<UpstreamDocument>({
        url: municipalityApiURL('documents'),
        data: formData,
        headers: formData.getHeaders(),
      });

      return response.status(201).json({
        data: sanitizeDocumentResponse(res.data),
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
  @OpenAPI(
    openApi({
      summary: 'Update a document by registration number',
      responses: { 200: jsonResponse() },
    })
  )
  @UseBefore(validationMiddleware(DocumentUpdateDto, 'body'))
  async updateDocument(
    @Param('registrationNumber') registrationNumber: string,
    @Body() body: DocumentUpdateDto,
    @Req() req: Request,
    @Res() response: Response
  ) {
    try {
      assertNoConfidentialityPayload(body);

      const existingDocument = await this.apiService.get<UpstreamDocument>({
        url: municipalityApiURL('documents', registrationNumber),
        params: NON_CONFIDENTIAL_QUERY,
      });
      assertNonConfidentialDocument(existingDocument.data);

      const updateBody: DocumentUpdateDto = {
        ...body,
        ...(body.metadataList
          ? {
              metadataList: mergeReservedPublicationMetadata(
                sanitizeUpdateMetadataList(body.metadataList, existingDocument.data.metadataList),
                existingDocument.data.metadataList
              ),
            }
          : {}),
      };

      const res = await this.apiService.patch<UpstreamDocument>({
        url: municipalityApiURL('documents', registrationNumber),
        data: updateBody,
        params: withoutConfidentialQuery(req.query),
      });

      return response.status(200).json({
        data: sanitizeDocumentResponse(res.data),
        message: 'success',
      });
    } catch (error) {
      logger.error(`Failed to update document ${registrationNumber}: ${error}`);
      throw error instanceof HttpException
        ? error
        : new HttpException(500, 'Failed to update document');
    }
  }

  @Put('/documents/:registrationNumber/files')
  @OpenAPI(
    openApi({
      summary: 'Add or replace a file on a document',
      requestBody: documentFileMultipartRequestBody,
      responses: { 204: noContentResponse },
    })
  )
  async addOrReplaceFile(
    @Param('registrationNumber') registrationNumber: string,
    @Req() req: Request,
    @Res() response: Response
  ) {
    try {
      await new Promise<void>((resolve, reject) => {
        upload.fields([
          { name: 'document', maxCount: 1 },
          { name: 'documentFile', maxCount: 1 },
        ])(req, response, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const formData = new FormData();
      const parsedFiles = req.files as Record<string, Express.Multer.File[]>;

      const existingDocument = await this.apiService.get<UpstreamDocument>({
        url: municipalityApiURL('documents', registrationNumber),
        params: NON_CONFIDENTIAL_QUERY,
      });
      assertNonConfidentialDocument(existingDocument.data);

      const documentFile = parsedFiles?.document?.[0];
      const documentJson = documentFile
        ? documentFile.buffer.toString('utf-8')
        : typeof req.body.document === 'string'
          ? req.body.document
          : JSON.stringify(req.body.document);
      const parsedDocumentPayload = parseDocumentPayload(documentJson);
      const normalizedActorPayload = normalizeFileRevisionActorPayload(parsedDocumentPayload);
      const documentPayloadForUpstream = Object.prototype.hasOwnProperty.call(
        parsedDocumentPayload,
        'metadataList'
      )
        ? {
            ...normalizedActorPayload,
            metadataList: sanitizeUpdateMetadataList(
              parsedDocumentPayload.metadataList,
              existingDocument.data.metadataList
            ),
          }
        : normalizedActorPayload;

      formData.append('document', JSON.stringify(documentPayloadForUpstream), {
        contentType: 'application/json',
      });

      const file = parsedFiles?.documentFile?.[0];
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
  @OpenAPI(openApi({ summary: 'Download a document file', responses: { 200: fileResponse } }))
  async downloadFile(
    @Param('registrationNumber') registrationNumber: string,
    @Param('documentDataId') documentDataId: string,
    @Res() response: Response
  ) {
    try {
      const document = await this.apiService.get<UpstreamDocument>({
        url: municipalityApiURL('documents', registrationNumber),
        params: NON_CONFIDENTIAL_QUERY,
      });
      assertNonConfidentialDocument(document.data);

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
  @OpenAPI(openApi({ summary: 'Delete a document file', responses: { 204: noContentResponse } }))
  async deleteFile(
    @Param('registrationNumber') registrationNumber: string,
    @Param('documentDataId') documentDataId: string,
    @Res() response: Response
  ) {
    try {
      const document = await this.apiService.get<UpstreamDocument>({
        url: municipalityApiURL('documents', registrationNumber),
        params: NON_CONFIDENTIAL_QUERY,
      });
      assertNonConfidentialDocument(document.data);

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
  @OpenAPI(
    openApi({ summary: 'List revisions for a document', responses: { 200: jsonResponse() } })
  )
  async getRevisions(
    @Param('registrationNumber') registrationNumber: string,
    @Req() req: Request,
    @Res() response: Response
  ) {
    try {
      const res = await this.apiService.get<PagedUpstreamDocumentResponse>({
        url: municipalityApiURL('documents', registrationNumber, 'revisions'),
        params: withoutConfidentialQuery(req.query),
      });

      return response.status(200).json({
        data: sanitizePagedDocumentResponse(res.data),
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
  @OpenAPI(
    openApi({ summary: 'Get a specific document revision', responses: { 200: jsonResponse() } })
  )
  async getRevision(
    @Param('registrationNumber') registrationNumber: string,
    @Param('revision') revision: number,
    @Req() req: Request,
    @Res() response: Response
  ) {
    try {
      const res = await this.apiService.get<UpstreamDocument>({
        url: municipalityApiURL('documents', registrationNumber, 'revisions', String(revision)),
        params: withoutConfidentialQuery(req.query),
      });

      return response.status(200).json({
        data: sanitizeDocumentResponse(res.data),
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
  @OpenAPI(
    openApi({
      summary: 'Download a file from a specific revision',
      responses: { 200: fileResponse },
    })
  )
  async downloadRevisionFile(
    @Param('registrationNumber') registrationNumber: string,
    @Param('revision') revision: number,
    @Param('documentDataId') documentDataId: string,
    @Res() response: Response
  ) {
    try {
      const document = await this.apiService.get<UpstreamDocument>({
        url: municipalityApiURL('documents', registrationNumber, 'revisions', String(revision)),
        params: NON_CONFIDENTIAL_QUERY,
      });
      assertNonConfidentialDocument(document.data);

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
