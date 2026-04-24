'use client';

import { useCallback, useState } from 'react';

export interface PreviewNavigation {
  currentIndex: number;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
}

/**
 * Index-only navigation primitive shared between the two preview modes.
 * PDF mode feeds in the backend match count; DOM-overlay mode feeds in the
 * mark count reported by HighlightOverlay. Whenever `total` changes — a new
 * file, a re-render that produces a different mark count — we snap back to 0
 * so prev/next can't stay pointed at a stale index. We use React's
 * "adjust state during render" pattern rather than a useEffect so the reset
 * is committed in the same render and never flashes a phantom position.
 */
export function usePreviewNavigation(total: number): PreviewNavigation {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastTotal, setLastTotal] = useState(total);
  if (total !== lastTotal) {
    setLastTotal(total);
    setCurrentIndex(0);
  }

  const clamped = total > 0 ? Math.min(Math.max(currentIndex, 0), total - 1) : 0;

  const goTo = useCallback(
    (index: number) => {
      if (total === 0) return;
      setCurrentIndex(Math.min(Math.max(index, 0), total - 1));
    },
    [total]
  );

  const next = useCallback(() => {
    setCurrentIndex((i) => (total === 0 ? 0 : (i + 1) % total));
  }, [total]);

  const prev = useCallback(() => {
    setCurrentIndex((i) => (total === 0 ? 0 : (i - 1 + total) % total));
  }, [total]);

  return { currentIndex: clamped, next, prev, goTo };
}
