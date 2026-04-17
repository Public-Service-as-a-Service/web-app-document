import { Controller, Get, Param, Res, UseBefore } from 'routing-controllers';
import { Response } from 'express';
import archiver from 'archiver';
import ApiService from '@services/api.service';
import { HttpException } from '@/exceptions/http.exception';
import { municipalityApiURL } from '@/utils/util';
import { logger } from '@utils/logger';
import { apiRateLimiter } from '@middlewares/rate-limit.middleware';
import type { Document, DocumentData, DocumentType } from '@/interfaces/document.interface';
import {
  assertPublicDocumentAccess,
  assertRegistrationNumberMunicipality,
  contentDisposition,
  findDocumentFileByToken,
  sanitizePublicFileName,
  supportsPreview,
  toPublicDocumentResponse,
  uniqueZipEntryName,
} from '@/utils/public-document';

const NON_CONFIDENTIAL_QUERY = { includeConfidential: 'false' };
const NO_STORE = 'no-store';
const PRIVATE_REVISION_FILE_CACHE = 'private, max-age=300, must-revalidate';

@Controller('/public/d')
@UseBefore(apiRateLimiter)
export class PublicDocumentController {
  private apiService = new ApiService();

  @Get('/:registrationNumber')
  async getPublicDocument(
    @Param('registrationNumber') registrationNumber: string,
    @Res() response: Response
  ) {
    const document = await this.fetchLatestPublicDocument(registrationNumber);
    const typeDisplayName = await this.fetchDocumentTypeDisplayName(document.type);
    response.setHeader('Cache-Control', NO_STORE);
    return response.status(200).json(toPublicDocumentResponse(document, { typeDisplayName }));
  }

  @Get('/:registrationNumber/download')
  async downloadLatest(
    @Param('registrationNumber') registrationNumber: string,
    @Res() response: Response
  ) {
    const document = await this.fetchLatestPublicDocument(registrationNumber);
    return this.downloadAllFiles(document, response, NO_STORE);
  }

  @Get('/:registrationNumber/files/:fileToken')
  async downloadLatestFile(
    @Param('registrationNumber') registrationNumber: string,
    @Param('fileToken') fileToken: string,
    @Res() response: Response
  ) {
    const document = await this.fetchLatestPublicDocument(registrationNumber);
    const file = findDocumentFileByToken(document.documentData, fileToken);
    return this.streamFile(document, file, response, { cacheControl: NO_STORE });
  }

  @Get('/:registrationNumber/preview/:fileToken')
  async previewLatestFile(
    @Param('registrationNumber') registrationNumber: string,
    @Param('fileToken') fileToken: string,
    @Res() response: Response
  ) {
    const document = await this.fetchLatestPublicDocument(registrationNumber);
    const file = findDocumentFileByToken(document.documentData, fileToken);
    return this.streamPreview(document, file, response, NO_STORE);
  }

  @Get('/:registrationNumber/v/:revision')
  async getPublicRevision(
    @Param('registrationNumber') registrationNumber: string,
    @Param('revision') revision: string,
    @Res() response: Response
  ) {
    await this.fetchLatestPublicDocument(registrationNumber);
    const revisionNumber = this.parseRevision(revision);
    const document = await this.fetchPublicRevision(registrationNumber, revisionNumber);
    const typeDisplayName = await this.fetchDocumentTypeDisplayName(document.type);
    response.setHeader('Cache-Control', NO_STORE);
    return response
      .status(200)
      .json(toPublicDocumentResponse(document, { revision: revisionNumber, typeDisplayName }));
  }

  @Get('/:registrationNumber/v/:revision/download')
  async downloadRevision(
    @Param('registrationNumber') registrationNumber: string,
    @Param('revision') revision: string,
    @Res() response: Response
  ) {
    await this.fetchLatestPublicDocument(registrationNumber);
    const revisionNumber = this.parseRevision(revision);
    const document = await this.fetchPublicRevision(registrationNumber, revisionNumber);
    return this.downloadAllFiles(document, response, PRIVATE_REVISION_FILE_CACHE, revisionNumber);
  }

  @Get('/:registrationNumber/v/:revision/files/:fileToken')
  async downloadRevisionFile(
    @Param('registrationNumber') registrationNumber: string,
    @Param('revision') revision: string,
    @Param('fileToken') fileToken: string,
    @Res() response: Response
  ) {
    await this.fetchLatestPublicDocument(registrationNumber);
    const revisionNumber = this.parseRevision(revision);
    const document = await this.fetchPublicRevision(registrationNumber, revisionNumber);
    const file = findDocumentFileByToken(document.documentData, fileToken);
    return this.streamFile(document, file, response, {
      revision: revisionNumber,
      cacheControl: PRIVATE_REVISION_FILE_CACHE,
    });
  }

  @Get('/:registrationNumber/v/:revision/preview/:fileToken')
  async previewRevisionFile(
    @Param('registrationNumber') registrationNumber: string,
    @Param('revision') revision: string,
    @Param('fileToken') fileToken: string,
    @Res() response: Response
  ) {
    await this.fetchLatestPublicDocument(registrationNumber);
    const revisionNumber = this.parseRevision(revision);
    const document = await this.fetchPublicRevision(registrationNumber, revisionNumber);
    const file = findDocumentFileByToken(document.documentData, fileToken);
    return this.streamPreview(
      document,
      file,
      response,
      PRIVATE_REVISION_FILE_CACHE,
      revisionNumber
    );
  }

  private parseRevision(revision: string): number {
    const parsed = Number(revision);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new HttpException(404, 'Not found');
    }
    return parsed;
  }

  private async fetchLatestPublicDocument(registrationNumber: string): Promise<Document> {
    assertRegistrationNumberMunicipality(registrationNumber);

    try {
      const res = await this.apiService.get<Document>({
        url: municipalityApiURL('documents', registrationNumber),
        params: NON_CONFIDENTIAL_QUERY,
      });
      assertPublicDocumentAccess(res.data, { requireActive: true });
      return res.data;
    } catch (error) {
      throw this.toPublicError(error, `Failed to fetch public document ${registrationNumber}`);
    }
  }

  private async fetchPublicRevision(
    registrationNumber: string,
    revision: number
  ): Promise<Document> {
    assertRegistrationNumberMunicipality(registrationNumber);

    try {
      const res = await this.apiService.get<Document>({
        url: municipalityApiURL('documents', registrationNumber, 'revisions', String(revision)),
        params: NON_CONFIDENTIAL_QUERY,
      });
      assertPublicDocumentAccess(res.data, { requireActive: false });
      return res.data;
    } catch (error) {
      throw this.toPublicError(
        error,
        `Failed to fetch public document ${registrationNumber} revision ${revision}`
      );
    }
  }

  private async fetchDocumentTypeDisplayName(type: string): Promise<string | undefined> {
    try {
      const res = await this.apiService.get<DocumentType>({
        url: municipalityApiURL('admin', 'documenttypes', type),
      });
      return res.data.displayName || undefined;
    } catch {
      return undefined;
    }
  }

  private toPublicError(error: unknown, logMessage: string): HttpException {
    const status =
      error instanceof HttpException
        ? error.status
        : error && typeof error === 'object' && 'status' in error
          ? Number((error as { status: unknown }).status)
          : error && typeof error === 'object' && 'httpCode' in error
            ? Number((error as { httpCode: unknown }).httpCode)
            : undefined;

    if (status) {
      if ([401, 403, 404].includes(status)) {
        return new HttpException(404, 'Not found');
      }
      if (status >= 500) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`${logMessage}: ${message}`);
        return new HttpException(502, 'Upstream API is unavailable');
      }
      return new HttpException(status, error instanceof Error ? error.message : 'Request failed');
    }

    logger.error(`${logMessage}: ${error}`);
    return new HttpException(500, 'Failed to fetch public document');
  }

  private async streamFile(
    document: Document,
    file: DocumentData,
    response: Response,
    options: { revision?: number; cacheControl: string }
  ) {
    const url =
      typeof options.revision === 'number'
        ? municipalityApiURL(
            'documents',
            document.registrationNumber,
            'revisions',
            String(options.revision),
            'files',
            file.id
          )
        : municipalityApiURL('documents', document.registrationNumber, 'files', file.id);

    const upstream = await this.apiService.getRaw({ url });
    this.setFileHeaders(response, file, {
      disposition: 'attachment',
      cacheControl: options.cacheControl,
    });
    upstream.data.pipe(response);
    return response;
  }

  private async streamPreview(
    document: Document,
    file: DocumentData,
    response: Response,
    cacheControl: string,
    revision?: number
  ) {
    if (!supportsPreview(file.mimeType)) {
      throw new HttpException(404, 'Not found');
    }

    const url =
      typeof revision === 'number'
        ? municipalityApiURL(
            'documents',
            document.registrationNumber,
            'revisions',
            String(revision),
            'files',
            file.id
          )
        : municipalityApiURL('documents', document.registrationNumber, 'files', file.id);

    const upstream = await this.apiService.getRaw({ url });
    this.setFileHeaders(response, file, {
      disposition: 'inline',
      cacheControl,
    });
    upstream.data.pipe(response);
    return response;
  }

  private async downloadAllFiles(
    document: Document,
    response: Response,
    cacheControl: string,
    revision?: number
  ) {
    const files = document.documentData || [];

    if (files.length === 0) {
      throw new HttpException(404, 'Not found');
    }

    if (files.length === 1) {
      return this.streamFile(document, files[0], response, { cacheControl, revision });
    }

    const upstreamFiles = [];
    for (const file of files) {
      upstreamFiles.push({
        file,
        upstream: await this.apiService.getRaw({
          url:
            typeof revision === 'number'
              ? municipalityApiURL(
                  'documents',
                  document.registrationNumber,
                  'revisions',
                  String(revision),
                  'files',
                  file.id
                )
              : municipalityApiURL('documents', document.registrationNumber, 'files', file.id),
        }),
      });
    }

    const zipName = sanitizePublicFileName(`${document.registrationNumber}.zip`);
    response.setHeader('Cache-Control', cacheControl);
    response.setHeader('Content-Type', 'application/zip');
    response.setHeader('Content-Disposition', contentDisposition(zipName, 'attachment'));
    response.setHeader('X-Content-Type-Options', 'nosniff');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (error) => {
      logger.error(`Failed to stream public zip ${document.registrationNumber}: ${error}`);
      response.destroy(error);
    });

    const usedNames = new Set<string>();
    archive.pipe(response);

    upstreamFiles.forEach(({ file, upstream }, index) => {
      archive.append(upstream.data, {
        name: uniqueZipEntryName(file.fileName, usedNames, `file-${index + 1}`),
      });
    });

    await archive.finalize();
    return response;
  }

  private setFileHeaders(
    response: Response,
    file: DocumentData,
    options: {
      disposition: 'attachment' | 'inline';
      cacheControl: string;
      contentSecurityPolicy?: string;
    }
  ) {
    // Public responses set our own Content-Disposition. Forwarding upstream
    // filenames directly would expose us to invalid header values and client
    // quirks around unicode/control characters.
    response.setHeader('Cache-Control', options.cacheControl);
    response.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    response.setHeader(
      'Content-Disposition',
      contentDisposition(file.fileName, options.disposition)
    );
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (options.contentSecurityPolicy) {
      response.setHeader('Content-Security-Policy', options.contentSecurityPolicy);
    }
  }
}
