'use client';

import { useCallback, useEffect, useState } from 'react';
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

  const fetchStatistics = useCallback(async () => {
    if (!registrationNumber) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.get<ApiResponse<DocumentStatistics>>(
        `documents/${registrationNumber}/statistics${buildQuery(range)}`
      );
      setStatistics(res.data.data);
    } catch {
      setStatistics(null);
      setError('statistics_fetch_failed');
    } finally {
      setLoading(false);
    }
  }, [registrationNumber, range.from, range.to]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics, reloadToken]);

  return {
    statistics,
    loading,
    error,
    reload: () => setReloadToken((n) => n + 1),
  };
};
