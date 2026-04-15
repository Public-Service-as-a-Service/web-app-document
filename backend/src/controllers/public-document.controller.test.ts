import 'reflect-metadata';
import express from 'express';
import request from 'supertest';
import { Readable } from 'stream';
import { useExpressServer } from 'routing-controllers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpException } from '@/exceptions/http.exception';
import type { Document } from '@/interfaces/document.interface';

const { apiServiceMock } = vi.hoisted(() => ({
  apiServiceMock: {
    get: vi.fn(),
    getRaw: vi.fn(),
  },
}));

vi.mock('@services/api.service', () => ({
  default: vi.fn().mockImplementation(function ApiServiceMock() {
    return apiServiceMock;
  }),
}));

import errorMiddleware from '@/middlewares/error.middleware';
import { PublicDocumentController } from './public-document.controller';
import { buildPublicFileToken, mergeReservedPublicationMetadata } from '@/utils/public-document';

const createApp = () => {
  const app = express();
  app.use(express.json());
  useExpressServer(app, {
    routePrefix: '/api',
    controllers: [PublicDocumentController],
    defaultErrorHandler: false,
  });
  app.use(errorMiddleware);
  return app;
};

const publicDocument = (overrides: Partial<Document> = {}): Document => ({
  id: 'internal-document-id',
  municipalityId: '2281',
  registrationNumber: '2026-2281-0001',
  revision: 1,
  confidentiality: {
    confidential: false,
    legalCitation: '',
  },
  description: 'Public policy',
  created: '2026-04-14T10:00:00.000Z',
  createdBy: 'internal-user',
  archive: false,
  metadataList: [
    { key: 'published', value: 'true' },
    { key: 'departmentOrgId', value: '42' },
    { key: 'public:category', value: 'Policy' },
  ],
  documentData: [
    {
      id: 'file-id-1',
      fileName: 'policy.pdf',
      mimeType: 'application/pdf',
      fileSizeInBytes: 12,
    },
  ],
  type: 'POLICY',
  ...overrides,
});

describe('PublicDocumentController', () => {
  beforeEach(() => {
    apiServiceMock.get.mockReset();
    apiServiceMock.getRaw.mockReset();
  });

  it('returns a filtered public DTO for a published document', async () => {
    apiServiceMock.get
      .mockResolvedValueOnce({ data: publicDocument() })
      .mockResolvedValueOnce({ data: { type: 'POLICY', displayName: 'Policy document' } });

    const response = await request(createApp()).get('/api/public/d/2026-2281-0001').expect(200);

    expect(response.body).toMatchObject({
      registrationNumber: '2026-2281-0001',
      revision: 1,
      description: 'Public policy',
      type: 'POLICY',
      typeDisplayName: 'Policy document',
      metadataList: [{ key: 'category', value: 'Policy' }],
    });
    expect(response.body.createdBy).toBeUndefined();
    expect(response.body.municipalityId).toBeUndefined();
    expect(response.body.confidentiality).toBeUndefined();
    expect(response.body.metadataList).not.toContainEqual({ key: 'published', value: 'true' });
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('returns 404 for unpublished documents', async () => {
    apiServiceMock.get.mockResolvedValue({
      data: publicDocument({ metadataList: [] }),
    });

    await request(createApp()).get('/api/public/d/2026-2281-0001').expect(404);
  });

  it('returns 404 for confidential documents', async () => {
    apiServiceMock.get.mockResolvedValue({
      data: publicDocument({ confidentiality: { confidential: true, legalCitation: 'OSL' } }),
    });

    await request(createApp()).get('/api/public/d/2026-2281-0001').expect(404);
  });

  it('returns 404 for archived documents by default', async () => {
    apiServiceMock.get.mockResolvedValue({
      data: publicDocument({ archive: true }),
    });

    await request(createApp()).get('/api/public/d/2026-2281-0001').expect(404);
  });

  it('normalizes upstream 403 to 404', async () => {
    apiServiceMock.get.mockRejectedValue(new HttpException(403, 'Forbidden'));

    await request(createApp()).get('/api/public/d/2026-2281-0001').expect(404);
  });

  it('supports revision 0 routes', async () => {
    apiServiceMock.get
      .mockResolvedValueOnce({ data: publicDocument({ revision: 3 }) })
      .mockResolvedValueOnce({ data: publicDocument({ revision: 0 }) });

    const response = await request(createApp()).get('/api/public/d/2026-2281-0001/v/0').expect(200);

    expect(response.body.revision).toBe(0);
  });

  it('streams public files with sanitized public headers', async () => {
    const document = publicDocument({
      documentData: [
        {
          id: 'file-id-1',
          fileName: 'policy\r\nbad.pdf',
          mimeType: 'application/pdf',
          fileSizeInBytes: 12,
        },
      ],
    });
    const token = buildPublicFileToken(document.documentData[0]);
    apiServiceMock.get.mockResolvedValue({ data: document });
    apiServiceMock.getRaw.mockResolvedValue({
      data: Readable.from(['file-content']),
      headers: {
        'content-disposition': 'attachment; filename="unsafe.pdf"',
      },
    });

    const response = await request(createApp())
      .get(`/api/public/d/2026-2281-0001/files/${encodeURIComponent(token)}`)
      .expect(200);

    expect(response.body.toString()).toBe('file-content');
    expect(response.headers['content-type']).toMatch(/application\/pdf/);
    expect(response.headers['content-disposition']).toContain('policybad.pdf');
    expect(response.headers['content-disposition']).not.toContain('unsafe.pdf');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });
});

describe('mergeReservedPublicationMetadata', () => {
  it('preserves publication metadata when ordinary metadata updates omit it', () => {
    expect(
      mergeReservedPublicationMetadata(
        [{ key: 'public:category', value: 'Policy' }],
        [{ key: 'published', value: 'true' }]
      )
    ).toEqual([
      { key: 'public:category', value: 'Policy' },
      { key: 'published', value: 'true' },
    ]);
  });

  it('allows explicit publication changes from the publication UI', () => {
    expect(
      mergeReservedPublicationMetadata(
        [{ key: 'published', value: 'false' }],
        [{ key: 'published', value: 'true' }]
      )
    ).toEqual([{ key: 'published', value: 'false' }]);
  });
});
