'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@lib/utils';
import { useViewTransitionNav } from '@components/motion/directional-transition';

const INTERACTIVE_ELEMENT_SELECTOR = [
  'a',
  'button',
  'input',
  'select',
  'textarea',
  'summary',
  '[role="button"]',
  '[role="link"]',
  '[contenteditable="true"]',
].join(', ');

const PRIMARY_ROW_LINK_SELECTOR = 'a[data-row-link="true"][href], a[href]';

// <ClickableRow>: a <tr> that exposes focus-visible ring and hover;
// the FIRST cell's content must be wrapped in <RowLink href> (uses overlay trick).
export function ClickableRow({
  className,
  children,
  onClick,
  ...props
}: React.ComponentProps<'tr'>) {
  const rowRef = React.useRef<HTMLTableRowElement>(null);

  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLTableRowElement>) => {
      onClick?.(event);
      if (event.defaultPrevented) return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target?.closest(INTERACTIVE_ELEMENT_SELECTOR)) return;
      if (window.getSelection()?.toString()) return;

      const rowLink = rowRef.current?.querySelector<HTMLAnchorElement>(PRIMARY_ROW_LINK_SELECTOR);
      if (!rowLink) return;

      event.preventDefault();
      rowLink.click();
    },
    [onClick]
  );

  return (
    <tr
      ref={rowRef}
      className={cn(
        'group relative cursor-pointer border-b border-border transition-colors last:border-0',
        'hover:bg-accent focus-within:bg-accent',
        'focus-within:ring-2 focus-within:ring-inset focus-within:ring-ring',
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {children}
    </tr>
  );
}

// Place this inside the FIRST <td> of a ClickableRow.
// The <a> becomes full-row clickable via ::after overlay.
// `ariaLabel` is announced by screen readers (build from doc fields).
//
// On a plain left-click (no modifier keys, no middle-click) we intercept and
// route through a view-transition-aware push so the directional / shared-element
// animations fire. Modifier-clicks fall through to <Link>'s native behaviour
// (open-in-new-tab, etc.) and right/middle clicks aren't touched.
export function RowLink({
  href,
  ariaLabel,
  className,
  children,
  onNavigate,
}: {
  href: string;
  ariaLabel: string;
  className?: string;
  children: React.ReactNode;
  onNavigate?: () => void;
}) {
  const navigate = useViewTransitionNav();

  const triggerNav = React.useCallback(() => {
    if (onNavigate) {
      onNavigate();
      return;
    }
    navigate(href, 'nav-forward');
  }, [onNavigate, navigate, href]);

  const handleClick = React.useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      // Let the browser handle modifier clicks and non-primary buttons.
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }
      e.preventDefault();
      triggerNav();
    },
    [triggerNav]
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLAnchorElement>) => {
      // Enter on a focused link normally triggers navigation; route it through
      // the VT path so directional/shared animations fire for keyboard users.
      // Space is intentionally not intercepted — it doesn't activate <a> by
      // default and we don't want to change that behaviour.
      if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        triggerNav();
      }
    },
    [triggerNav]
  );

  return (
    <Link
      href={href}
      data-row-link="true"
      aria-label={ariaLabel}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative inline-flex min-h-[1.5rem] items-center text-foreground no-underline outline-none',
        'after:absolute after:inset-0 after:content-[""] after:cursor-pointer',
        'focus-visible:outline-none',
        className
      )}
    >
      {children}
    </Link>
  );
}
