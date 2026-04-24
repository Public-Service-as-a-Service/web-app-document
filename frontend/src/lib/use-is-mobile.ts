'use client';

import { useSyncExternalStore } from 'react';

// Matches Tailwind's `sm` breakpoint (640px). Anything below is treated as
// mobile for layout decisions that need to switch primitive (Dialog ↔ Sheet,
// sidebar ↔ drawer, etc.) rather than just tweak sizing.
const MOBILE_BREAKPOINT_PX = 640;

const subscribe = (query: string) => (onChange: () => void) => {
  if (typeof window === 'undefined') return () => undefined;
  const mql = window.matchMedia(query);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
};

const getSnapshot = (query: string) => () =>
  typeof window === 'undefined' ? false : window.matchMedia(query).matches;

// Default false during SSR so the server renders the desktop layout; the
// first client render swaps to mobile if the viewport is narrow.
const getServerSnapshot = () => false;

export function useIsMobile(breakpoint = MOBILE_BREAKPOINT_PX): boolean {
  const query = `(max-width: ${breakpoint - 1}px)`;
  return useSyncExternalStore(subscribe(query), getSnapshot(query), getServerSnapshot);
}
