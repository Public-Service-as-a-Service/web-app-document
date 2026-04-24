'use client';

import { useSyncExternalStore } from 'react';

/**
 * Mobile / desktop split for the app. Matches Tailwind's `md` breakpoint
 * (768px) and the same threshold `app-layout.tsx` already uses to swap the
 * sidebar for a hamburger + bottom-nav — importing this constant keeps the
 * JS-driven switches aligned with CSS-driven ones so a viewport resize
 * doesn't leave half the UI in desktop mode and half in mobile mode.
 *
 * **Policy**: prefer Tailwind responsive utilities (`md:hidden`, `md:flex`,
 * etc.) over this hook. Reach for `useIsMobile` only when you actually need
 * to swap component trees (e.g. Dialog ↔ bottom Sheet) rather than just
 * tweak styles — CSS media queries are cheaper and don't cause a double
 * render on first hydration.
 */
export const MOBILE_BREAKPOINT_PX = 768;

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
