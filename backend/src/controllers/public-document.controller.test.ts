import 'reflect-metadata';
import express from 'express';
import request from 'supertest';
import { Readable } from 'stream';
import { useExpressServer } from 'routing-controllers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpException } from '@/exceptions/http.exception';
import { DocumentStatus } from '@/interfaces/document.interface';
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
import { buildPublicFileToken } from '@/utils/public-document';

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

const revisionsPage = (documents: Document[]) => ({
  data: {
    documents,
    _meta: {
      page: 0,
      limit: documents.length,
      count: documents.length,
      totalRecords: documents.length,
      totalPages: 1,
    },
  },
});

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
  status: DocumentStatus.ACTIVE,
  metadataList: [
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

  it('returns a filtered public DTO for an active document', async () => {
    apiServiceMock.get
      .mockResolvedValueOnce(revisionsPage([publicDocument()]))
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
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('skips a newer SCHEDULED revision and returns the latest ACTIVE one', async () => {
    apiServiceMock.get
      .mockResolvedValueOnce(
        revisionsPage([
          publicDocument({
            revision: 2,
            status: DocumentStatus.SCHEDULED,
            description: 'Next draft',
          }),
          publicDocument({
            revision: 1,
            status: DocumentStatus.ACTIVE,
            description: 'Currently published',
          }),
        ])
      )
      .mockResolvedValueOnce({ data: { type: 'POLICY', displayName: 'Policy document' } });

    const response = await request(createApp()).get('/api/public/d/2026-2281-0001').expect(200);

    expect(response.body.revision).toBe(1);
    expect(response.body.description).toBe('Currently published');
  });

  it('returns 404 when no revision is ACTIVE', async () => {
    apiServiceMock.get.mockResolvedValueOnce(
      revisionsPage([
        publicDocument({ revision: 2, status: DocumentStatus.DRAFT }),
        publicDocument({ revision: 1, status: DocumentStatus.EXPIRED }),
      ])
    );

    await request(createApp()).get('/api/public/d/2026-2281-0001').expect(404);
  });

  it('returns 404 when the revisions list is empty', async () => {
    apiServiceMock.get.mockResolvedValueOnce(revisionsPage([]));

    await request(createApp()).get('/api/public/d/2026-2281-0001').expect(404);
  });

  it('returns 404 when every revision is DRAFT', async () => {
    apiServiceMock.get.mockResolvedValueOnce(
      revisionsPage([
        publicDocument({ revision: 3, status: DocumentStatus.DRAFT }),
        publicDocument({ revision: 2, status: DocumentStatus.DRAFT }),
        publicDocument({ revision: 1, status: DocumentStatus.DRAFT }),
      ])
    );

    await request(createApp()).get('/api/public/d/2026-2281-0001').expect(404);
  });

  it('returns 404 when the only never-active chain is DRAFT then REVOKED', async () => {
    apiServiceMock.get.mockResolvedValueOnce(
      revisionsPage([
        publicDocument({ revision: 2, status: DocumentStatus.REVOKED }),
        publicDocument({ revision: 1, status: DocumentStatus.DRAFT }),
      ])
    );

    await request(createApp()).get('/api/public/d/2026-2281-0001').expect(404);
  });

  it('skips a DRAFT sitting on top of an ACTIVE revision', async () => {
    apiServiceMock.get
      .mockResolvedValueOnce(
        revisionsPage([
          publicDocument({
            revision: 2,
            status: DocumentStatus.DRAFT,
            description: 'Work in progress',
          }),
          publicDocument({
            revision: 1,
            status: DocumentStatus.ACTIVE,
            description: 'Currently published',
          }),
        ])
      )
      .mockResolvedValueOnce({ data: { type: 'POLICY', displayName: 'Policy document' } });

    const response = await request(createApp()).get('/api/public/d/2026-2281-0001').expect(200);

    expect(response.body.revision).toBe(1);
    expect(response.body.description).toBe('Currently published');
  });

  it('skips a DRAFT+SCHEDULED pile and still returns the older ACTIVE revision', async () => {
    apiServiceMock.get
      .mockResolvedValueOnce(
        revisionsPage([
          publicDocument({ revision: 3, status: DocumentStatus.DRAFT, description: 'Latest edit' }),
          publicDocument({
            revision: 2,
            status: DocumentStatus.SCHEDULED,
            description: 'Next version',
          }),
          publicDocument({
            revision: 1,
            status: DocumentStatus.ACTIVE,
            description: 'Currently published',
          }),
        ])
      )
      .mockResolvedValueOnce({ data: { type: 'POLICY', displayName: 'Policy document' } });

    const response = await request(createApp()).get('/api/public/d/2026-2281-0001').expect(200);

    expect(response.body.revision).toBe(1);
    expect(response.body.description).toBe('Currently published');
  });

  it('prefers the highest-revision ACTIVE when multiple are ACTIVE', async () => {
    apiServiceMock.get
      .mockResolvedValueOnce(
        revisionsPage([
          publicDocument({
            revision: 3,
            status: DocumentStatus.ACTIVE,
            description: 'Newest active',
          }),
          publicDocument({
            revision: 2,
            status: DocumentStatus.ACTIVE,
            description: 'Older active',
          }),
          publicDocument({ revision: 1, status: DocumentStatus.EXPIRED, description: 'Ancient' }),
        ])
      )
      .mockResolvedValueOnce({ data: { type: 'POLICY', displayName: 'Policy document' } });

    const response = await request(createApp()).get('/api/public/d/2026-2281-0001').expect(200);

    expect(response.body.revision).toBe(3);
    expect(response.body.description).toBe('Newest active');
  });

  it('returns 404 when the latest ACTIVE revision is confidential', async () => {
    apiServiceMock.get.mockResolvedValueOnce(
      revisionsPage([
        publicDocument({
          revision: 2,
          status: DocumentStatus.ACTIVE,
          confidentiality: { confidential: true, legalCitation: 'OSL' },
        }),
        publicDocument({ revision: 1, status: DocumentStatus.EXPIRED }),
      ])
    );

    await request(createApp()).get('/api/public/d/2026-2281-0001').expect(404);
  });

  it('returns 404 when the latest ACTIVE revision is archived', async () => {
    apiServiceMock.get.mockResolvedValueOnce(
      revisionsPage([
        publicDocument({ revision: 2, status: DocumentStatus.ACTIVE, archive: true }),
        publicDocument({ revision: 1, status: DocumentStatus.EXPIRED }),
      ])
    );

    await request(createApp()).get('/api/public/d/2026-2281-0001').expect(404);
  });

  it('returns 404 for confidential documents', async () => {
    apiServiceMock.get.mockResolvedValueOnce(
      revisionsPage([
        publicDocument({ confidentiality: { confidential: true, legalCitation: 'OSL' } }),
      ])
    );

    await request(createApp()).get('/api/public/d/2026-2281-0001').expect(404);
  });

  it('returns 404 for archived documents by default', async () => {
    apiServiceMock.get.mockResolvedValueOnce(revisionsPage([publicDocument({ archive: true })]));

    await request(createApp()).get('/api/public/d/2026-2281-0001').expect(404);
  });

  it('normalizes upstream 403 to 404', async () => {
    apiServiceMock.get.mockRejectedValue(new HttpException(403, 'Forbidden'));

    await request(createApp()).get('/api/public/d/2026-2281-0001').expect(404);
  });

  it('supports revision 0 routes without requiring ACTIVE status on the revision', async () => {
    // /v/0 first re-uses the latest-active lookup as an auth gate (pre-check
    // that the document itself is publicly visible), then fetches the
    // specific revision.
    apiServiceMock.get
      .mockResolvedValueOnce(revisionsPage([publicDocument({ revision: 3 })]))
      .mockResolvedValueOnce({
        data: publicDocument({ revision: 0, status: DocumentStatus.EXPIRED }),
      });

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
    apiServiceMock.get.mockResolvedValueOnce(revisionsPage([document]));
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
