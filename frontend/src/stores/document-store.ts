'use client';

import { create } from 'zustand';
import { apiService, ApiResponse } from '@services/api-service';
import {
  applyDocumentFilters,
  emptyDocumentFilters,
  hasActiveFilters,
  type DocumentFiltersValue,
} from '@components/document-filters/apply-filters';
import type {
  DocumentDto,
  DocumentResponsibilityDto,
  DocumentUpdateDto,
  PageMetaDto,
  PagedDocumentResponseDto,
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
  publishDocument: (registrationNumber: string, changedBy: string) => Promise<void>;
  revokeDocument: (registrationNumber: string, changedBy: string) => Promise<void>;
  unrevokeDocument: (registrationNumber: string, changedBy: string) => Promise<void>;
  updateResponsibilities: (
    registrationNumber: string,
    changedBy: string,
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

export const useDocumentStore = create<DocumentState>((set, get) => ({
  ...initialState,

  fetchDocuments: async () => {
    const { query, page, pageSize, onlyLatestRevision, filters } = get();
    set({ loading: true, error: null });

    try {
      let pagedResponse: PagedDocumentResponseDto;
      const hasQuery = query !== '*' && query.length > 0;

      if (hasActiveFilters(filters)) {
        // Structured-filter endpoint. Text search is applied client-side
        // to the returned page because upstream can't combine them.
        const body = applyDocumentFilters(
          {
            // upstream /documents/filter uses 1-based page numbering
            page: page + 1,
            limit: pageSize,
            onlyLatestRevision,
            sortBy: ['created'],
            sortDirection: 'DESC',
          } satisfies DocumentFilterBody,
          filters
        );

        const res = await apiService.post<ApiResponse<PagedDocumentResponseDto>>(
          'documents/filter',
          body
        );
        pagedResponse = res.data.data;

        if (hasQuery) {
          const q = query.toLowerCase();
          const filtered = (pagedResponse.documents || []).filter(
            (d) =>
              d.description?.toLowerCase().includes(q) ||
              d.registrationNumber.toLowerCase().includes(q) ||
              d.type?.toLowerCase().includes(q) ||
              d.createdBy?.toLowerCase().includes(q) ||
              d.metadataList?.some((m) => m.value?.toLowerCase().includes(q))
          );
          pagedResponse = {
            ...pagedResponse,
            documents: filtered,
          };
        }
      } else {
        const params = new URLSearchParams({
          query: query || '*',
          page: String(page),
          size: String(pageSize),
          includeConfidential: 'false',
          onlyLatestRevision: String(onlyLatestRevision),
        });
        // Always send the status selection so upstream's default
        // (SCHEDULED/ACTIVE/EXPIRED — excludes DRAFT + REVOKED) never takes
        // effect implicitly.
        filters.statuses.forEach((status) => params.append('statuses', status));

        const res = await apiService.get<ApiResponse<PagedDocumentResponseDto>>(
          `documents?${params.toString()}`
        );
        pagedResponse = res.data.data;
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
      // not the latest. Pull the highest revision via the revisions list so
      // "the document" reflects its current state everywhere we render it.
      const res = await apiService.get<ApiResponse<PagedDocumentResponseDto>>(
        `documents/${registrationNumber}/revisions?size=1&sort=revision,desc`
      );
      const latest = res.data.data.documents?.[0] ?? null;
      if (!latest) {
        set({ currentDocumentLoading: false, error: 'Failed to fetch document' });
        return;
      }
      set({ currentDocument: latest, currentDocumentLoading: false });
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

  publishDocument: async (registrationNumber: string, changedBy: string) => {
    try {
      await apiService.post(
        `documents/${registrationNumber}/publish?changedBy=${encodeURIComponent(changedBy)}`,
        {}
      );
      // Upstream's publish action is a state transition, not a document
      // response. Refresh the latest revision so the UI sees the new status.
      const res = await apiService.get<ApiResponse<PagedDocumentResponseDto>>(
        `documents/${registrationNumber}/revisions?size=1&sort=revision,desc`
      );
      const latest = res.data.data.documents?.[0] ?? null;
      if (latest) {
        set({ currentDocument: latest });
      }
    } catch (error) {
      set({ error: 'Failed to publish document' });
      throw error;
    }
  },

  revokeDocument: async (registrationNumber: string, changedBy: string) => {
    try {
      await apiService.post(
        `documents/${registrationNumber}/revoke?changedBy=${encodeURIComponent(changedBy)}`,
        {}
      );
      const res = await apiService.get<ApiResponse<PagedDocumentResponseDto>>(
        `documents/${registrationNumber}/revisions?size=1&sort=revision,desc`
      );
      const latest = res.data.data.documents?.[0] ?? null;
      if (latest) {
        set({ currentDocument: latest });
      }
    } catch (error) {
      set({ error: 'Failed to revoke document' });
      throw error;
    }
  },

  unrevokeDocument: async (registrationNumber: string, changedBy: string) => {
    try {
      await apiService.post(
        `documents/${registrationNumber}/unrevoke?changedBy=${encodeURIComponent(changedBy)}`,
        {}
      );
      const res = await apiService.get<ApiResponse<PagedDocumentResponseDto>>(
        `documents/${registrationNumber}/revisions?size=1&sort=revision,desc`
      );
      const latest = res.data.data.documents?.[0] ?? null;
      if (latest) {
        set({ currentDocument: latest });
      }
    } catch (error) {
      set({ error: 'Failed to unrevoke document' });
      throw error;
    }
  },

  updateResponsibilities: async (
    registrationNumber: string,
    changedBy: string,
    responsibilities: DocumentResponsibilityDto[]
  ) => {
    try {
      await apiService.put(`documents/${registrationNumber}/responsibilities`, {
        changedBy,
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
