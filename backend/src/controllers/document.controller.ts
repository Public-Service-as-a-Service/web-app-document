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
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';
import { Request, Response } from 'express';
import type { RequestBodyObject } from 'openapi3-ts';
import ApiService from '@services/api.service';
import { logger } from '@utils/logger';
import { HttpException } from '@/exceptions/http.exception';
import { municipalityApiURL } from '@/utils/util';
import authMiddleware from '@middlewares/auth.middleware';
import { validationMiddleware } from '@middlewares/validation.middleware';
import {
  DocumentFilterParametersDto,
  DocumentResponsibilitiesUpdateDto,
  DocumentUpdateDto,
} from '@/dtos/document.dto';
import {
  DocumentDto,
  PagedDocumentResponseDto,
} from '@/responses/document.response';
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

// Authenticated paths should see the full set of documents regardless of
// lifecycle status — DRAFT/REVOKED are hidden from upstream's default GET
// unless `includeNonPublic=true` is set. Confidential docs are still stripped
// client-side by our sanitizer (we never want them on the wire).
const NON_CONFIDENTIAL_QUERY = {
  includeConfidential: 'false',
  includeNonPublic: 'true',
};
const NON_CONFIDENTIAL_FILTER = { includeConfidential: false };
const fileStreamResponse = {
  200: {
    description: 'File stream',
    content: {
      'application/octet-stream': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  },
} as const;
const noContentResponses = { 204: { description: 'No content' } } as const;
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

const withoutConfidentialQuery = (query: Request['query']): Record<string, unknown> => {
  const {
    includeConfidential: _includeConfidential,
    includeNonPublic: _includeNonPublic,
    ...rest
  } = query as Record<string, unknown>;
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

const extractRegistrationNumberFromUpstream404 = (error: unknown): string | null => {
  if (!(error instanceof HttpException) || error.status !== 404) return null;
  const detail = (error.upstreamDetail as { detail?: unknown } | undefined)?.detail;
  if (typeof detail !== 'string') return null;
  const match = detail.match(/registrationNumber:\s*'?([^'\s]+)'?/i);
  return match ? match[1] : null;
};

const extractRegistrationNumberFromLocation = (
  headers: Record<string, string> | undefined
): string | null => {
  const location = headers?.location;
  if (!location) return null;
  const tail = location.split('/').filter(Boolean).pop();
  return tail ? decodeURIComponent(tail) : null;
};

const hasRegistrationNumber = (value: unknown): value is { registrationNumber: string } =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { registrationNumber?: unknown }).registrationNumber === 'string' &&
  (value as { registrationNumber: string }).registrationNumber.length > 0;

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
  @OpenAPI({ summary: 'Search documents with query parameters' })
  @ResponseSchema(PagedDocumentResponseDto)
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
  @OpenAPI({ summary: 'Filter documents with structured parameters' })
  @ResponseSchema(PagedDocumentResponseDto)
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
  @OpenAPI({ summary: 'Get a document by registration number' })
  @ResponseSchema(DocumentDto)
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
  @OpenAPI({
    summary: 'Create a new document with file attachments',
    requestBody: documentMultipartRequestBody,
  })
  @ResponseSchema(DocumentDto, { statusCode: 201, description: 'Created' })
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

      // Upstream responds one of two ways after create, and neither returns
      // the new document: (a) 201 with only a Location header + empty body,
      // or (b) 404 with the freshly issued registrationNumber in the error
      // detail because its read-back filter hides DRAFTs. In both cases we
      // need to GET the doc with `includeNonPublic=true` to return it.
      let created: UpstreamDocument;
      let regNr: string | null = null;
      try {
        const res = await this.apiService.postMultipart<UpstreamDocument>({
          url: municipalityApiURL('documents'),
          data: formData,
          headers: formData.getHeaders(),
          params: NON_CONFIDENTIAL_QUERY,
        });
        if (hasRegistrationNumber(res.data)) {
          created = res.data;
        } else {
          regNr = extractRegistrationNumberFromLocation(res.headers);
          if (!regNr) {
            throw new HttpException(502, 'Upstream did not return a registration number');
          }
          const refetched = await this.apiService.get<UpstreamDocument>({
            url: municipalityApiURL('documents', regNr),
            params: NON_CONFIDENTIAL_QUERY,
          });
          created = refetched.data;
        }
      } catch (error) {
        regNr = extractRegistrationNumberFromUpstream404(error);
        if (!regNr) throw error;
        const refetched = await this.apiService.get<UpstreamDocument>({
          url: municipalityApiURL('documents', regNr),
          params: NON_CONFIDENTIAL_QUERY,
        });
        created = refetched.data;
      }

      return response.status(201).json({
        data: sanitizeDocumentResponse(created),
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
  @OpenAPI({ summary: 'Update a document by registration number' })
  @ResponseSchema(DocumentDto)
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
              metadataList: sanitizeUpdateMetadataList(
                body.metadataList,
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

  @Post('/documents/:registrationNumber/publish')
  @OpenAPI({
    summary: 'Publish a document (DRAFT → ACTIVE/SCHEDULED based on validity)',
    responses: noContentResponses,
  })
  async publishDocument(
    @Param('registrationNumber') registrationNumber: string,
    @Req() req: Request,
    @Res() response: Response
  ) {
    try {
      const changedBy = asNonEmptyString(
        (req.query.changedBy ?? req.body?.changedBy) as unknown
      );
      if (!changedBy) {
        throw new HttpException(400, 'changedBy is required');
      }

      const existingDocument = await this.apiService.get<UpstreamDocument>({
        url: municipalityApiURL('documents', registrationNumber),
        params: NON_CONFIDENTIAL_QUERY,
      });
      assertNonConfidentialDocument(existingDocument.data);

      await this.apiService.post<void>({
        url: municipalityApiURL('documents', registrationNumber, 'publish'),
        params: { changedBy },
      });

      return response.status(204).send();
    } catch (error) {
      logger.error(`Failed to publish document ${registrationNumber}: ${error}`);
      throw error instanceof HttpException
        ? error
        : new HttpException(500, 'Failed to publish document');
    }
  }

  @Post('/documents/:registrationNumber/revoke')
  @OpenAPI({
    summary: 'Revoke a document (ACTIVE → REVOKED, in-place on the latest revision)',
    responses: noContentResponses,
  })
  async revokeDocument(
    @Param('registrationNumber') registrationNumber: string,
    @Req() req: Request,
    @Res() response: Response
  ) {
    try {
      const changedBy = asNonEmptyString(
        (req.query.changedBy ?? req.body?.changedBy) as unknown
      );
      if (!changedBy) {
        throw new HttpException(400, 'changedBy is required');
      }

      const existingDocument = await this.apiService.get<UpstreamDocument>({
        url: municipalityApiURL('documents', registrationNumber),
        params: NON_CONFIDENTIAL_QUERY,
      });
      assertNonConfidentialDocument(existingDocument.data);

      await this.apiService.post<void>({
        url: municipalityApiURL('documents', registrationNumber, 'revoke'),
        params: { changedBy },
      });

      return response.status(204).send();
    } catch (error) {
      logger.error(`Failed to revoke document ${registrationNumber}: ${error}`);
      throw error instanceof HttpException
        ? error
        : new HttpException(500, 'Failed to revoke document');
    }
  }

  @Post('/documents/:registrationNumber/unrevoke')
  @OpenAPI({
    summary: 'Unrevoke a document (REVOKED → ACTIVE/SCHEDULED based on validity)',
    responses: noContentResponses,
  })
  async unrevokeDocument(
    @Param('registrationNumber') registrationNumber: string,
    @Req() req: Request,
    @Res() response: Response
  ) {
    try {
      const changedBy = asNonEmptyString(
        (req.query.changedBy ?? req.body?.changedBy) as unknown
      );
      if (!changedBy) {
        throw new HttpException(400, 'changedBy is required');
      }

      const existingDocument = await this.apiService.get<UpstreamDocument>({
        url: municipalityApiURL('documents', registrationNumber),
        params: NON_CONFIDENTIAL_QUERY,
      });
      assertNonConfidentialDocument(existingDocument.data);

      // Upstream returns 409 CONFLICT when validTo has already passed —
      // surfaced as-is so the UI can show a specific message.
      await this.apiService.post<void>({
        url: municipalityApiURL('documents', registrationNumber, 'unrevoke'),
        params: { changedBy },
      });

      return response.status(204).send();
    } catch (error) {
      logger.error(`Failed to unrevoke document ${registrationNumber}: ${error}`);
      throw error instanceof HttpException
        ? error
        : new HttpException(500, 'Failed to unrevoke document');
    }
  }

  @Put('/documents/:registrationNumber/responsibilities')
  @OpenAPI({
    summary: 'Replace the list of responsible users for a document',
    responses: noContentResponses,
  })
  @UseBefore(validationMiddleware(DocumentResponsibilitiesUpdateDto, 'body'))
  async updateResponsibilities(
    @Param('registrationNumber') registrationNumber: string,
    @Body() body: DocumentResponsibilitiesUpdateDto,
    @Res() response: Response
  ) {
    try {
      const existingDocument = await this.apiService.get<UpstreamDocument>({
        url: municipalityApiURL('documents', registrationNumber),
        params: NON_CONFIDENTIAL_QUERY,
      });
      assertNonConfidentialDocument(existingDocument.data);

      await this.apiService.put<void>({
        url: municipalityApiURL('documents', registrationNumber, 'responsibilities'),
        data: body,
      });

      return response.status(204).send();
    } catch (error) {
      logger.error(`Failed to update responsibilities for ${registrationNumber}: ${error}`);
      throw error instanceof HttpException
        ? error
        : new HttpException(500, 'Failed to update responsibilities');
    }
  }

  @Put('/documents/:registrationNumber/files')
  @OpenAPI({
    summary: 'Add or replace a file on a document',
    requestBody: documentFileMultipartRequestBody,
    responses: noContentResponses,
  })
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
  @OpenAPI({ summary: 'Download a document file', responses: fileStreamResponse })
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
        params: NON_CONFIDENTIAL_QUERY,
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
  @OpenAPI({ summary: 'Delete a document file', responses: noContentResponses })
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
  @OpenAPI({ summary: 'List revisions for a document' })
  @ResponseSchema(PagedDocumentResponseDto)
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
  @OpenAPI({ summary: 'Get a specific document revision' })
  @ResponseSchema(DocumentDto)
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
  @OpenAPI({
    summary: 'Download a file from a specific revision',
    responses: fileStreamResponse,
  })
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
