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
  Document,
  PageMeta,
  PagedDocumentResponse,
  DocumentUpdateRequest,
  DocumentFilterBody,
} from '@interfaces/document.interface';

interface DocumentState {
  documents: Document[];
  meta: PageMeta | null;
  loading: boolean;
  error: string | null;

  query: string;
  page: number;
  pageSize: number;
  onlyLatestRevision: boolean;
  filters: DocumentFiltersValue;

  currentDocument: Document | null;
  currentDocumentLoading: boolean;

  fetchDocuments: () => Promise<void>;
  fetchDocument: (registrationNumber: string) => Promise<void>;
  fetchRevision: (registrationNumber: string, revision: number) => Promise<void>;
  updateDocument: (registrationNumber: string, data: DocumentUpdateRequest) => Promise<void>;

  setQuery: (query: string) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setOnlyLatestRevision: (value: boolean) => void;
  setFilters: (filters: DocumentFiltersValue) => void;
  reset: () => void;
}

const initialState = {
  documents: [] as Document[],
  meta: null as PageMeta | null,
  loading: false,
  error: null as string | null,
  query: '*',
  page: 0,
  pageSize: 20,
  onlyLatestRevision: true,
  filters: emptyDocumentFilters,
  currentDocument: null as Document | null,
  currentDocumentLoading: false,
};

export const useDocumentStore = create<DocumentState>((set, get) => ({
  ...initialState,

  fetchDocuments: async () => {
    const { query, page, pageSize, onlyLatestRevision, filters } = get();
    set({ loading: true, error: null });

    try {
      let pagedResponse: PagedDocumentResponse;

      if (hasActiveFilters(filters)) {
        const body = applyDocumentFilters(
          {
            page,
            limit: pageSize,
            onlyLatestRevision,
            sortBy: ['created'],
            sortDirection: 'DESC',
          } satisfies DocumentFilterBody,
          filters
        );

        const res = await apiService.post<ApiResponse<PagedDocumentResponse>>(
          'documents/filter',
          body
        );
        pagedResponse = res.data.data;
      } else {
        const params = new URLSearchParams({
          query: query || '*',
          page: String(page),
          size: String(pageSize),
          includeConfidential: 'false',
          onlyLatestRevision: String(onlyLatestRevision),
        });

        const res = await apiService.get<ApiResponse<PagedDocumentResponse>>(
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
      const res = await apiService.get<ApiResponse<Document>>(`documents/${registrationNumber}`);
      set({ currentDocument: res.data.data, currentDocumentLoading: false });
    } catch {
      set({ currentDocumentLoading: false, error: 'Failed to fetch document' });
    }
  },

  fetchRevision: async (registrationNumber: string, revision: number) => {
    set({ currentDocumentLoading: true, error: null });

    try {
      const res = await apiService.get<ApiResponse<Document>>(
        `documents/${registrationNumber}/revisions/${revision}`
      );
      set({ currentDocument: res.data.data, currentDocumentLoading: false });
    } catch {
      set({ currentDocumentLoading: false, error: 'Failed to fetch document revision' });
    }
  },

  updateDocument: async (registrationNumber: string, data: DocumentUpdateRequest) => {
    try {
      const res = await apiService.patch<ApiResponse<Document>>(
        `documents/${registrationNumber}`,
        data
      );
      set({ currentDocument: res.data.data });
    } catch (error) {
      set({ error: 'Failed to update document' });
      throw error;
    }
  },

  setQuery: (query: string) =>
    set((state) => ({
      query,
      page: 0,
      ...(query && query !== '*' && hasActiveFilters(state.filters)
        ? { filters: emptyDocumentFilters }
        : {}),
    })),
  setPage: (page: number) => set({ page }),
  setPageSize: (size: number) => set({ pageSize: size, page: 0 }),
  setOnlyLatestRevision: (value: boolean) => set({ onlyLatestRevision: value, page: 0 }),
  setFilters: (filters: DocumentFiltersValue) =>
    set((state) => ({
      filters,
      page: 0,
      ...(hasActiveFilters(filters) && state.query !== '*' ? { query: '*' } : {}),
    })),
  reset: () => set(initialState),
}));
