'use client';

import { apiService, ApiResponse } from '@services/api-service';
import type { DocumentDto } from '@data-contracts/backend/data-contracts';
import type {
  DocumentMatch,
  FileMatchesQuery,
  PagedDocumentMatchResponse,
} from '@interfaces/document.interface';

export type HydratedDocumentMatch = DocumentMatch & {
  // Metadata is best-effort: a recently revoked or permissions-restricted
  // revision may fail to hydrate, in which case the row falls back to
  // registrationNumber + filename only.
  metadata: DocumentDto | null;
};

export interface PagedHydratedMatchResponse {
  documents: HydratedDocumentMatch[];
  _meta: PagedDocumentMatchResponse['_meta'];
}

const searchFileMatches = async (params: FileMatchesQuery): Promise<PagedDocumentMatchResponse> => {
  const res = await apiService.get<ApiResponse<PagedDocumentMatchResponse>>(
    'documents/file-matches',
    {
      params,
      // Upstream expects repeated `?query=a&query=b`; axios 1.x defaults to
      // `?query[0]=a&query[1]=b` unless we disable indexed serialization.
      paramsSerializer: { indexes: null },
    }
  );
  return res.data.data;
};

const hydrateMatch = async (match: DocumentMatch): Promise<HydratedDocumentMatch> => {
  try {
    const res = await apiService.get<ApiResponse<DocumentDto>>(
      `documents/${encodeURIComponent(match.registrationNumber)}/revisions/${match.revision}`
    );
    return { ...match, metadata: res.data.data };
  } catch {
    return { ...match, metadata: null };
  }
};

export const searchFileMatchesHydrated = async (
  params: FileMatchesQuery
): Promise<PagedHydratedMatchResponse> => {
  const page = await searchFileMatches(params);
  const hydrated = await Promise.all((page.documents || []).map(hydrateMatch));
  return { documents: hydrated, _meta: page._meta };
};
