'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiService, ApiResponse } from '@services/api-service';
import type {
  DocumentDto,
  PagedDocumentResponseDto,
} from '@data-contracts/backend/data-contracts';

export interface UseDocumentRevisions {
  revisions: DocumentDto[];
  latestRevisionNumber: number | null;
  firstRevisionNumber: number | null;
  reload: () => Promise<DocumentDto[]>;
}

const fetchRevisionsList = async (registrationNumber: string): Promise<DocumentDto[]> => {
  try {
    const res = await apiService.get<ApiResponse<PagedDocumentResponseDto>>(
      `documents/${registrationNumber}/revisions?size=50&sort=revision,desc`
    );
    return res.data.data.documents || [];
  } catch {
    return [];
  }
};

export const useDocumentRevisions = (registrationNumber: string): UseDocumentRevisions => {
  const [revisions, setRevisions] = useState<DocumentDto[]>([]);

  // Initial load on mount / whenever the registration number changes. This is
  // a genuine external-data subscription, which is exactly what effects are
  // for; the setRevisions happens asynchronously in a Promise callback.
  useEffect(() => {
    let cancelled = false;
    fetchRevisionsList(registrationNumber).then((list) => {
      if (!cancelled) setRevisions(list);
    });
    return () => {
      cancelled = true;
    };
  }, [registrationNumber]);

  const reload = useCallback(async (): Promise<DocumentDto[]> => {
    const list = await fetchRevisionsList(registrationNumber);
    setRevisions(list);
    return list;
  }, [registrationNumber]);

  const latestRevisionNumber = revisions.length
    ? Math.max(...revisions.map((r) => r.revision))
    : null;
  const firstRevisionNumber = revisions.length
    ? Math.min(...revisions.map((r) => r.revision))
    : null;

  return { revisions, latestRevisionNumber, firstRevisionNumber, reload };
};
