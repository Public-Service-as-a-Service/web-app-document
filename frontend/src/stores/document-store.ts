'use client';

import { create } from 'zustand';
import { apiService, ApiResponse } from '@services/api-service';
import type {
  Document,
  PageMeta,
  PagedDocumentResponse,
  DocumentUpdateRequest,
} from '@interfaces/document.interface';

interface DocumentState {
  documents: Document[];
  meta: PageMeta | null;
  loading: boolean;
  error: string | null;

  query: string;
  page: number;
  pageSize: number;
  includeConfidential: boolean;
  onlyLatestRevision: boolean;

  currentDocument: Document | null;
  currentDocumentLoading: boolean;

  fetchDocuments: () => Promise<void>;
  fetchDocument: (registrationNumber: string) => Promise<void>;
  updateDocument: (registrationNumber: string, data: DocumentUpdateRequest) => Promise<void>;

  setQuery: (query: string) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setIncludeConfidential: (value: boolean) => void;
  setOnlyLatestRevision: (value: boolean) => void;
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
  includeConfidential: false,
  onlyLatestRevision: true,
  currentDocument: null as Document | null,
  currentDocumentLoading: false,
};

export const useDocumentStore = create<DocumentState>((set, get) => ({
  ...initialState,

  fetchDocuments: async () => {
    const { query, page, pageSize, includeConfidential, onlyLatestRevision } = get();
    set({ loading: true, error: null });

    try {
      const params = new URLSearchParams({
        query: query || '*',
        page: String(page),
        size: String(pageSize),
        includeConfidential: String(includeConfidential),
        onlyLatestRevision: String(onlyLatestRevision),
      });

      const res = await apiService.get<ApiResponse<PagedDocumentResponse>>(
        `documents?${params.toString()}`
      );
      const data = res.data.data;

      set({
        documents: data.documents || [],
        meta: data._meta || null,
        loading: false,
      });
    } catch (error) {
      set({ loading: false, error: 'Failed to fetch documents' });
    }
  },

  fetchDocument: async (registrationNumber: string) => {
    set({ currentDocumentLoading: true, error: null });

    try {
      const res = await apiService.get<ApiResponse<Document>>(`documents/${registrationNumber}`);
      set({ currentDocument: res.data.data, currentDocumentLoading: false });
    } catch (error) {
      set({ currentDocumentLoading: false, error: 'Failed to fetch document' });
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

  setQuery: (query: string) => set({ query, page: 0 }),
  setPage: (page: number) => set({ page }),
  setPageSize: (size: number) => set({ pageSize: size, page: 0 }),
  setIncludeConfidential: (value: boolean) => set({ includeConfidential: value, page: 0 }),
  setOnlyLatestRevision: (value: boolean) => set({ onlyLatestRevision: value, page: 0 }),
  reset: () => set(initialState),
}));
