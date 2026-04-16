'use client';

// Opt into React canary type augmentations (ViewTransition, addTransitionType).
// Next.js 16 bundles a canary build of React internally — these symbols are
// available at runtime even though the public `react` types declare them only
// in `react/canary`.
import type {} from 'react/canary';

import * as React from 'react';
import { ViewTransition, addTransitionType, startTransition } from 'react';
import { useRouter } from 'next/navigation';

export type DirectionalNavType = 'nav-forward' | 'nav-back';

// Wrap this around the (app) layout root. Uses React's <ViewTransition>
// component with an explicit `name="page-root"` so the existing
// ::view-transition-old/new(page-root) CSS selectors still match.
//
// Type-keyed enter/exit map to the `nav-forward` / `nav-back` CSS classes
// that drive the directional slide animations in globals.css.
export function PageTransitionRoot({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <ViewTransition
      name="page-root"
      default="none"
      enter={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
      exit={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
    >
      <div className={className}>{children}</div>
    </ViewTransition>
  );
}

// Programmatic navigation that tags the transition with a directional type
// (`nav-forward` / `nav-back`) so type-keyed <ViewTransition>s pick the right
// animation. Wraps router.push() inside startTransition so React activates a
// view transition.
export function useViewTransitionNav() {
  const router = useRouter();
  return React.useCallback(
    (url: string, type: DirectionalNavType = 'nav-forward') => {
      startTransition(() => {
        addTransitionType(type);
        router.push(url);
      });
    },
    [router]
  );
}

// Backwards-compatible alias for the legacy hook name.
export const useDirectionalNav = useViewTransitionNav;
