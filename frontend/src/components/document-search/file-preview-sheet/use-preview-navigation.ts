'use client';

import { useCallback, useMemo, useState } from 'react';
import type { FileMatchPosition } from '@interfaces/document.interface';

export interface PreviewNavigation {
  totalMatches: number;
  currentIndex: number;
  currentMatch: FileMatchPosition | null;
  currentPage: number | null;
  pagesWithMatches: number[];
  matchesByPage: Map<number | null, FileMatchPosition[]>;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
}

const sortedPages = (matches: FileMatchPosition[]): number[] => {
  const pages = new Set<number>();
  for (const m of matches) {
    if (typeof m.page === 'number') pages.add(m.page);
  }
  return [...pages].sort((a, b) => a - b);
};

const groupByPage = (matches: FileMatchPosition[]): Map<number | null, FileMatchPosition[]> => {
  const map = new Map<number | null, FileMatchPosition[]>();
  for (const m of matches) {
    const key = typeof m.page === 'number' ? m.page : null;
    const bucket = map.get(key);
    if (bucket) bucket.push(m);
    else map.set(key, [m]);
  }
  return map;
};

export function usePreviewNavigation(matches: FileMatchPosition[]): PreviewNavigation {
  const [currentIndex, setCurrentIndex] = useState(0);

  const clamped = Math.min(Math.max(currentIndex, 0), Math.max(matches.length - 1, 0));
  const currentMatch = matches[clamped] ?? null;

  const pagesWithMatches = useMemo(() => sortedPages(matches), [matches]);
  const matchesByPage = useMemo(() => groupByPage(matches), [matches]);

  const goTo = useCallback(
    (index: number) => {
      if (matches.length === 0) return;
      const bounded = Math.min(Math.max(index, 0), matches.length - 1);
      setCurrentIndex(bounded);
    },
    [matches.length]
  );

  const next = useCallback(() => {
    setCurrentIndex((i) => {
      if (matches.length === 0) return 0;
      return (i + 1) % matches.length;
    });
  }, [matches.length]);

  const prev = useCallback(() => {
    setCurrentIndex((i) => {
      if (matches.length === 0) return 0;
      return (i - 1 + matches.length) % matches.length;
    });
  }, [matches.length]);

  return {
    totalMatches: matches.length,
    currentIndex: clamped,
    currentMatch,
    currentPage: currentMatch?.page ?? null,
    pagesWithMatches,
    matchesByPage,
    next,
    prev,
    goTo,
  };
}
