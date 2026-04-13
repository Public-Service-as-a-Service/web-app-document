import type { ApiResponse } from './api-service';
import type { Document, DocumentType, PagedDocumentResponse } from '@interfaces/document.interface';
import { mockDocuments, mockDocumentTypes, buildPageMeta } from './mock-data';

let documents = [...mockDocuments];
let documentTypes = [...mockDocumentTypes];

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

const wrap = <T>(data: T): { data: ApiResponse<T> } => ({
  data: { data, message: 'OK' },
});

const parseUrl = (url: string) => {
  const clean = url.replace(/^\/?(api\/)?/, '');
  return clean;
};

const get = async <T>(url: string): Promise<{ data: T }> => {
  await delay();
  const path = parseUrl(url);

  // GET documents?query=...&page=0&size=20&includeConfidential=false&onlyLatestRevision=true
  if (path.startsWith('documents?') || path === 'documents') {
    const params = new URLSearchParams(path.split('?')[1] || '');
    const query = params.get('query') || '*';
    const page = parseInt(params.get('page') || '0');
    const size = parseInt(params.get('size') || '20');
    const includeConfidential = params.get('includeConfidential') === 'true';
    const onlyLatestRevision = params.get('onlyLatestRevision') === 'true';

    let filtered = [...documents];

    if (!includeConfidential) {
      filtered = filtered.filter((d) => !d.confidentiality?.confidential);
    }

    if (onlyLatestRevision) {
      const latest = new Map<string, Document>();
      for (const d of filtered) {
        const existing = latest.get(d.registrationNumber);
        if (!existing || d.revision > existing.revision) {
          latest.set(d.registrationNumber, d);
        }
      }
      filtered = Array.from(latest.values());
    }

    if (query !== '*') {
      const q = query.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.description?.toLowerCase().includes(q) ||
          d.registrationNumber.toLowerCase().includes(q) ||
          d.type.toLowerCase().includes(q) ||
          d.createdBy.toLowerCase().includes(q)
      );
    }

    filtered.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

    const start = page * size;
    const paged = filtered.slice(start, start + size);

    return wrap<PagedDocumentResponse>({
      documents: paged,
      _meta: buildPageMeta(filtered.length, page, size),
    }) as { data: T };
  }

  // GET documents/:regNum/revisions
  const revisionsMatch = path.match(/^documents\/([^/]+)\/revisions/);
  if (revisionsMatch) {
    const regNum = decodeURIComponent(revisionsMatch[1]);
    const revs = documents.filter((d) => d.registrationNumber === regNum);
    return wrap<PagedDocumentResponse>({
      documents: revs,
      _meta: buildPageMeta(revs.length, 0, 50),
    }) as { data: T };
  }

  // GET documents/:regNum
  const docMatch = path.match(/^documents\/([^/?]+)$/);
  if (docMatch) {
    const regNum = decodeURIComponent(docMatch[1]);
    const doc = documents.find((d) => d.registrationNumber === regNum);
    if (doc) {
      return wrap<Document>(doc) as { data: T };
    }
    throw new Error(`Document ${regNum} not found`);
  }

  // GET admin/documenttypes
  if (path === 'admin/documenttypes') {
    return wrap<DocumentType[]>(documentTypes) as { data: T };
  }

  throw new Error(`Mock: unhandled GET ${path}`);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const post = async <T>(url: string, data: any): Promise<{ data: T }> => {
  await delay();
  const path = parseUrl(url);

  // POST admin/documenttypes
  if (path === 'admin/documenttypes') {
    const newType: DocumentType = { type: data.type, displayName: data.displayName };
    documentTypes = [...documentTypes, newType];
    return wrap(newType) as { data: T };
  }

  throw new Error(`Mock: unhandled POST ${path}`);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const patch = async <T>(url: string, data: any): Promise<{ data: T }> => {
  await delay();
  const path = parseUrl(url);

  // PATCH documents/:regNum
  const docMatch = path.match(/^documents\/([^/]+)$/);
  if (docMatch) {
    const regNum = decodeURIComponent(docMatch[1]);
    const idx = documents.findIndex((d) => d.registrationNumber === regNum);
    if (idx !== -1) {
      documents[idx] = { ...documents[idx], ...data, revision: documents[idx].revision + 1 };
      return wrap<Document>(documents[idx]) as { data: T };
    }
    throw new Error(`Document ${regNum} not found`);
  }

  // PATCH admin/documenttypes/:type
  const typeMatch = path.match(/^admin\/documenttypes\/(.+)$/);
  if (typeMatch) {
    const type = decodeURIComponent(typeMatch[1]);
    const idx = documentTypes.findIndex((t) => t.type === type);
    if (idx !== -1) {
      documentTypes[idx] = { ...documentTypes[idx], ...data };
      return wrap(documentTypes[idx]) as { data: T };
    }
    throw new Error(`Type ${type} not found`);
  }

  throw new Error(`Mock: unhandled PATCH ${path}`);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const put = async <T>(url: string, data: any): Promise<{ data: T }> => {
  await delay();
  return wrap(data) as { data: T };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const del = async <T>(url: string): Promise<{ data: T }> => {
  await delay();
  const path = parseUrl(url);

  // DELETE admin/documenttypes/:type
  const typeMatch = path.match(/^admin\/documenttypes\/(.+)$/);
  if (typeMatch) {
    const type = decodeURIComponent(typeMatch[1]);
    documentTypes = documentTypes.filter((t) => t.type !== type);
    return wrap(null) as { data: T };
  }

  // DELETE documents/:regNum/files/:fileId
  const fileMatch = path.match(/^documents\/([^/]+)\/files\/(.+)$/);
  if (fileMatch) {
    const regNum = decodeURIComponent(fileMatch[1]);
    const fileId = fileMatch[2];
    const docIdx = documents.findIndex((d) => d.registrationNumber === regNum);
    if (docIdx !== -1) {
      documents[docIdx] = {
        ...documents[docIdx],
        documentData: documents[docIdx].documentData.filter((f) => f.id !== fileId),
      };
    }
    return wrap(null) as { data: T };
  }

  throw new Error(`Mock: unhandled DELETE ${path}`);
};

const postFormData = async <T>(url: string, _data: FormData): Promise<{ data: T }> => {
  await delay(500);
  const path = parseUrl(url);

  // POST documents (create new)
  if (path === 'documents') {
    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      municipalityId: '2281',
      registrationNumber: `2025-REG-${String(documents.length + 1).padStart(4, '0')}`,
      revision: 1,
      confidentiality: { confidential: false, legalCitation: '' },
      description: 'Nytt dokument (mock)',
      created: new Date().toISOString(),
      createdBy: 'Mock User',
      archive: false,
      metadataList: [],
      documentData: [
        {
          id: `file-${Date.now()}`,
          fileName: 'uploaded-file.pdf',
          mimeType: 'application/pdf',
          fileSizeInBytes: 100000,
        },
      ],
      type: 'PROTOCOL',
    };
    documents = [newDoc, ...documents];
    return wrap(newDoc) as { data: T };
  }

  throw new Error(`Mock: unhandled POST formdata ${path}`);
};

const putFormData = async <T>(url: string, _data: FormData): Promise<{ data: T }> => {
  await delay(500);
  const path = parseUrl(url);

  // PUT documents/:regNum/files
  const fileMatch = path.match(/^documents\/([^/]+)\/files$/);
  if (fileMatch) {
    const regNum = decodeURIComponent(fileMatch[1]);
    const docIdx = documents.findIndex((d) => d.registrationNumber === regNum);
    if (docIdx !== -1) {
      const newFile = {
        id: `file-${Date.now()}`,
        fileName: 'uploaded-file.pdf',
        mimeType: 'application/pdf',
        fileSizeInBytes: 75000,
      };
      documents[docIdx] = {
        ...documents[docIdx],
        documentData: [...documents[docIdx].documentData, newFile],
      };
      return wrap(documents[docIdx]) as { data: T };
    }
  }

  throw new Error(`Mock: unhandled PUT formdata ${path}`);
};

const getBlob = async (url: string) => {
  await delay();
  // Return a minimal PDF-like blob
  const content = '%PDF-1.4 mock file content';
  const blob = new Blob([content], { type: 'application/pdf' });
  return { data: blob };
};

export const mockApiService = { get, post, put, patch, del, postFormData, putFormData, getBlob };
