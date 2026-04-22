'use client';

import { create } from 'zustand';
import { apiService, ApiResponse } from '@services/api-service';
import {
  applyDocumentFilters,
  emptyDocumentFilters,
  type DocumentFiltersValue,
} from '@components/document-filters/apply-filters';
import {
  DocumentStatusEnum,
  type DocumentDto,
  type DocumentResponsibilityDto,
  type DocumentUpdateDto,
  type PageMetaDto,
  type PagedDocumentResponseDto,
} from '@data-contracts/backend/data-contracts';
import type { DocumentFilterBody } from '@interfaces/document.interface';

interface DocumentState {
  documents: DocumentDto[];
  meta: PageMetaDto | null;
  loading: boolean;
  error: string | null;

  query: string;
  page: number;
  pageSize: number;
  onlyLatestRevision: boolean;
  filters: DocumentFiltersValue;

  currentDocument: DocumentDto | null;
  currentDocumentLoading: boolean;

  fetchDocuments: () => Promise<void>;
  fetchDocument: (registrationNumber: string) => Promise<void>;
  fetchRevision: (registrationNumber: string, revision: number) => Promise<void>;
  updateDocument: (registrationNumber: string, data: DocumentUpdateDto) => Promise<void>;
  publishDocument: (registrationNumber: string, updatedBy: string) => Promise<void>;
  revokeDocument: (registrationNumber: string, updatedBy: string) => Promise<void>;
  unrevokeDocument: (registrationNumber: string, updatedBy: string) => Promise<void>;
  updateResponsibilities: (
    registrationNumber: string,
    updatedBy: string,
    responsibilities: DocumentResponsibilityDto[]
  ) => Promise<void>;

  setQuery: (query: string) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setOnlyLatestRevision: (value: boolean) => void;
  setFilters: (filters: DocumentFiltersValue) => void;
  reset: () => void;
}

const initialState = {
  documents: [] as DocumentDto[],
  meta: null as PageMetaDto | null,
  loading: false,
  error: null as string | null,
  query: '*',
  page: 0,
  pageSize: 20,
  onlyLatestRevision: true,
  filters: emptyDocumentFilters,
  currentDocument: null as DocumentDto | null,
  currentDocumentLoading: false,
};

// Pick the revision the detail page should render when no `?revision=N` is
// pinned: the newest published revision (ACTIVE/SCHEDULED/EXPIRED). Falls
// back to the absolute latest so brand-new drafts and fully revoked documents
// still load something instead of erroring out.
const PUBLISHED_STATUSES: ReadonlySet<DocumentStatusEnum> = new Set([
  DocumentStatusEnum.ACTIVE,
  DocumentStatusEnum.SCHEDULED,
  DocumentStatusEnum.EXPIRED,
]);

const pickDisplayRevision = (revisions: DocumentDto[]): DocumentDto | null => {
  if (revisions.length === 0) return null;
  const published = revisions.find((r) => r.status && PUBLISHED_STATUSES.has(r.status));
  return published ?? revisions[0];
};

export const useDocumentStore = create<DocumentState>((set, get) => ({
  ...initialState,

  fetchDocuments: async () => {
    const { query, page, pageSize, onlyLatestRevision, filters } = get();
    set({ loading: true, error: null });

    try {
      // Single endpoint for every listing now — upstream retired the
      // free-text search endpoint that previously backed the no-filter path.
      // Free-text `query` is applied client-side against the returned page
      // because /documents/filter does not accept it.
      const body = applyDocumentFilters(
        {
          // upstream /documents/filter uses 1-based page numbering
          page: page + 1,
          limit: pageSize,
          onlyLatestRevision,
          sortBy: ['created'],
          sortDirection: 'DESC',
          // Ask the backend to swap each row for the latest public revision
          // and drop docs with no published history. Authors still see their
          // unpublished work via "My documents", which doesn't set this flag.
          publishedOnly: true,
        } satisfies DocumentFilterBody,
        filters
      );

      const res = await apiService.post<ApiResponse<PagedDocumentResponseDto>>(
        'documents/filter',
        body
      );
      let pagedResponse = res.data.data;

      const hasQuery = query !== '*' && query.length > 0;
      if (hasQuery) {
        const q = query.toLowerCase();
        const filtered = (pagedResponse.documents || []).filter(
          (d) =>
            d.description?.toLowerCase().includes(q) ||
            d.registrationNumber.toLowerCase().includes(q) ||
            d.type?.toLowerCase().includes(q) ||
            d.metadataList?.some((m) => m.value?.toLowerCase().includes(q))
        );
        pagedResponse = { ...pagedResponse, documents: filtered };
      }

      set({
        documents: pagedResponse.documents || [],
        meta: pagedResponse._meta || null,
        loading: false,
      });
    } catch {
      set({ loading: false, error: 'Failed to fetch documents' });
    }
  },

  fetchDocument: async (registrationNumber: string) => {
    set({ currentDocumentLoading: true, error: null });

    try {
      // The bare upstream endpoint returns the original (revision 0) document,
      // not the latest. Pull the revision list and show the newest public
      // revision — a REVOKED or DRAFT head is skipped in favour of the most
      // recent published one so the default view reflects current effect.
      const res = await apiService.get<ApiResponse<PagedDocumentResponseDto>>(
        `documents/${registrationNumber}/revisions?size=50&sort=revision,desc`
      );
      const display = pickDisplayRevision(res.data.data.documents ?? []);
      if (!display) {
        set({ currentDocumentLoading: false, error: 'Failed to fetch document' });
        return;
      }
      set({ currentDocument: display, currentDocumentLoading: false });
    } catch {
      set({ currentDocumentLoading: false, error: 'Failed to fetch document' });
    }
  },

  fetchRevision: async (registrationNumber: string, revision: number) => {
    set({ currentDocumentLoading: true, error: null });

    try {
      const res = await apiService.get<ApiResponse<DocumentDto>>(
        `documents/${registrationNumber}/revisions/${revision}`
      );
      set({ currentDocument: res.data.data, currentDocumentLoading: false });
    } catch {
      set({ currentDocumentLoading: false, error: 'Failed to fetch document revision' });
    }
  },

  updateDocument: async (registrationNumber: string, data: DocumentUpdateDto) => {
    try {
      const res = await apiService.patch<ApiResponse<DocumentDto>>(
        `documents/${registrationNumber}`,
        data
      );
      set({ currentDocument: res.data.data });
    } catch (error) {
      set({ error: 'Failed to update document' });
      throw error;
    }
  },

  publishDocument: async (registrationNumber: string, updatedBy: string) => {
    try {
      await apiService.post(
        `documents/${registrationNumber}/publish?updatedBy=${encodeURIComponent(updatedBy)}`,
        {}
      );
      // Upstream's publish action is a state transition, not a document
      // response. Refresh via the revisions list so the UI picks the newest
      // public revision (skipping any still-DRAFT or REVOKED head).
      const res = await apiService.get<ApiResponse<PagedDocumentResponseDto>>(
        `documents/${registrationNumber}/revisions?size=50&sort=revision,desc`
      );
      const display = pickDisplayRevision(res.data.data.documents ?? []);
      if (display) {
        set({ currentDocument: display });
      }
    } catch (error) {
      set({ error: 'Failed to publish document' });
      throw error;
    }
  },

  revokeDocument: async (registrationNumber: string, updatedBy: string) => {
    try {
      await apiService.post(
        `documents/${registrationNumber}/revoke?updatedBy=${encodeURIComponent(updatedBy)}`,
        {}
      );
      // Revoke flips the head to REVOKED without creating a new revision, so
      // reload the list and fall back to the prior non-revoked revision.
      const res = await apiService.get<ApiResponse<PagedDocumentResponseDto>>(
        `documents/${registrationNumber}/revisions?size=50&sort=revision,desc`
      );
      const display = pickDisplayRevision(res.data.data.documents ?? []);
      if (display) {
        set({ currentDocument: display });
      }
    } catch (error) {
      set({ error: 'Failed to revoke document' });
      throw error;
    }
  },

  unrevokeDocument: async (registrationNumber: string, updatedBy: string) => {
    try {
      await apiService.post(
        `documents/${registrationNumber}/unrevoke?updatedBy=${encodeURIComponent(updatedBy)}`,
        {}
      );
      const res = await apiService.get<ApiResponse<PagedDocumentResponseDto>>(
        `documents/${registrationNumber}/revisions?size=50&sort=revision,desc`
      );
      const display = pickDisplayRevision(res.data.data.documents ?? []);
      if (display) {
        set({ currentDocument: display });
      }
    } catch (error) {
      set({ error: 'Failed to unrevoke document' });
      throw error;
    }
  },

  updateResponsibilities: async (
    registrationNumber: string,
    updatedBy: string,
    responsibilities: DocumentResponsibilityDto[]
  ) => {
    try {
      await apiService.put(`documents/${registrationNumber}/responsibilities`, {
        updatedBy,
        responsibilities,
      });
      const current = get().currentDocument;
      if (current && current.registrationNumber === registrationNumber) {
        set({ currentDocument: { ...current, responsibilities } });
      }
    } catch (error) {
      set({ error: 'Failed to update responsibilities' });
      throw error;
    }
  },

  setQuery: (query: string) => set({ query, page: 0 }),
  setPage: (page: number) => set({ page }),
  setPageSize: (size: number) => set({ pageSize: size, page: 0 }),
  setOnlyLatestRevision: (value: boolean) => set({ onlyLatestRevision: value, page: 0 }),
  setFilters: (filters: DocumentFiltersValue) => set({ filters, page: 0 }),
  reset: () => set(initialState),
}));
