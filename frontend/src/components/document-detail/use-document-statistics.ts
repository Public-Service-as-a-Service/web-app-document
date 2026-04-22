'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiService, ApiResponse } from '@services/api-service';
import type { DocumentStatistics } from '@interfaces/document.interface';

export interface StatisticsRange {
  from?: string;
  to?: string;
}

export interface UseDocumentStatistics {
  statistics: DocumentStatistics | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

const buildQuery = (range: StatisticsRange): string => {
  const params = new URLSearchParams();
  if (range.from) params.set('from', range.from);
  if (range.to) params.set('to', range.to);
  const q = params.toString();
  return q ? `?${q}` : '';
};

export const useDocumentStatistics = (
  registrationNumber: string,
  range: StatisticsRange
): UseDocumentStatistics => {
  const [statistics, setStatistics] = useState<DocumentStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // A stable key keeps the fetching effect from firing on every parent
  // render — range inputs are cheap strings, hashing them this way sidesteps
  // a useMemo-on-object dance.
  const queryKey = useMemo(
    () => `${registrationNumber}|${range.from ?? ''}|${range.to ?? ''}|${reloadToken}`,
    [registrationNumber, range.from, range.to, reloadToken]
  );

  useEffect(() => {
    if (!registrationNumber) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiService
      .get<ApiResponse<DocumentStatistics>>(
        `documents/${registrationNumber}/statistics${buildQuery(range)}`
      )
      .then((res) => {
        if (cancelled) return;
        setStatistics(res.data.data);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setStatistics(null);
        setError('statistics_fetch_failed');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // `queryKey` is a deterministic fingerprint of the deps — effect re-runs
    // once per unique input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  return {
    statistics,
    loading,
    error,
    reload: () => setReloadToken((n) => n + 1),
  };
};
