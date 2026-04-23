'use client';

import { create } from 'zustand';
import { apiService, ApiResponse } from '@services/api-service';
import {
  applyDocumentFilters,
  defaultDocumentsPageFilters,
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
import { type DocumentFilterBody, type FileMatchesQuery } from '@interfaces/document.interface';
import {
  searchFileMatchesHydrated,
  type HydratedDocumentMatch,
  type PagedHydratedMatchResponse,
} from '@services/document-search-service';

interface DocumentState {
  documents: DocumentDto[];
  meta: PageMetaDto | null;
  loading: boolean;
  error: string | null;

  // Full-text (Elasticsearch) search — active when query is non-empty.
  matches: HydratedDocumentMatch[];
  matchMeta: PagedHydratedMatchResponse['_meta'] | null;
  matchLoading: boolean;
  matchError: string | null;
  /** When true, ES search includes older revisions (onlyLatestRevision=false). */
  includeHistoricalRevisions: boolean;

  query: string;
  page: number;
  pageSize: number;
  onlyLatestRevision: boolean;
  filters: DocumentFiltersValue;

  currentDocument: DocumentDto | null;
  currentDocumentLoading: boolean;

  fetchDocuments: () => Promise<void>;
  fetchMatches: () => Promise<void>;
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
  setIncludeHistoricalRevisions: (value: boolean) => void;
  setFilters: (filters: DocumentFiltersValue) => void;
  reset: () => void;
}

/** True when the current query should route to the ES match endpoint. */
export const isSearchQuery = (query: string): boolean => query !== '*' && query.trim().length > 0;

const initialState = {
  documents: [] as DocumentDto[],
  meta: null as PageMetaDto | null,
  loading: false,
  error: null as string | null,
  matches: [] as HydratedDocumentMatch[],
  matchMeta: null as PagedHydratedMatchResponse['_meta'] | null,
  matchLoading: false,
  matchError: null as string | null,
  includeHistoricalRevisions: false,
  query: '*',
  page: 0,
  pageSize: 20,
  onlyLatestRevision: true,
  filters: defaultDocumentsPageFilters,
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

// Generation counters prevent out-of-order network responses from clobbering
// newer state. Rapid filter toggles (e.g. ticking multiple document types)
// fire overlapping requests, and the last-initiated is not guaranteed to be
// the last-resolved — earlier queries can legitimately finish faster.
let fetchDocumentsGeneration = 0;
let fetchMatchesGeneration = 0;

export const useDocumentStore = create<DocumentState>((set, get) => ({
  ...initialState,

  fetchDocuments: async () => {
    const { page, pageSize, onlyLatestRevision, filters } = get();
    const generation = ++fetchDocumentsGeneration;
    set({ loading: true, error: null });

    try {
      // Free-text queries now route through `fetchMatches` (Elasticsearch).
      // This path handles the empty-query listing only.
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
      if (generation !== fetchDocumentsGeneration) return;
      const pagedResponse = res.data.data;

      set({
        documents: pagedResponse.documents || [],
        meta: pagedResponse._meta || null,
        loading: false,
      });
    } catch {
      if (generation !== fetchDocumentsGeneration) return;
      set({ loading: false, error: 'Failed to fetch documents' });
    }
  },

  fetchMatches: async () => {
    const { query, page, pageSize, includeHistoricalRevisions, filters } = get();

    if (!isSearchQuery(query)) {
      fetchMatchesGeneration += 1;
      set({ matches: [], matchMeta: null, matchLoading: false, matchError: null });
      return;
    }

    const generation = ++fetchMatchesGeneration;
    set({ matchLoading: true, matchError: null });

    try {
      // Always forward the selected statuses so ES mirrors the list view. The
      // filter UI drives this set explicitly — an empty array means the user
      // deselected everything and should see no matches.
      const params: FileMatchesQuery = {
        query: [query],
        page,
        size: pageSize,
        onlyLatestRevision: !includeHistoricalRevisions,
        statuses: filters.statuses,
        ...(filters.documentTypes.length > 0 && { documentTypes: filters.documentTypes }),
      };

      const res = await searchFileMatchesHydrated(params);

      if (generation !== fetchMatchesGeneration) return;
      set({
        matches: res.documents,
        matchMeta: res._meta ?? null,
        matchLoading: false,
      });
    } catch {
      if (generation !== fetchMatchesGeneration) return;
      set({
        matchLoading: false,
        matchError: 'Failed to search file contents',
        matches: [],
        matchMeta: null,
      });
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
  setIncludeHistoricalRevisions: (value: boolean) =>
    set({ includeHistoricalRevisions: value, page: 0 }),
  setFilters: (filters: DocumentFiltersValue) => set({ filters, page: 0 }),
  reset: () => set(initialState),
}));
