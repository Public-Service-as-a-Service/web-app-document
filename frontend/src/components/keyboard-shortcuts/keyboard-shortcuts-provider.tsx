'use client';

import { ReactNode, useEffect } from 'react';

const FOCUS_SEARCH_EVENT = 'app:focus-search';

const isEditableElement = (element: Element | null): boolean => {
  if (!element || !(element instanceof HTMLElement)) return false;

  const tag = element.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (element.isContentEditable) return true;
  return false;
};

const findSearchInput = (): HTMLElement | null => {
  if (typeof document === 'undefined') return null;
  return document.querySelector<HTMLElement>('[data-search-input="true"]');
};

/**
 * Mounts global keyboard shortcuts for the authenticated app shell.
 *
 * Cmd+K (macOS) / Ctrl+K (Windows, Linux) focuses the first element on the
 * page that exposes `data-search-input="true"`. If no such element exists,
 * a CustomEvent `app:focus-search` is dispatched on `window` so optional
 * listeners (e.g. a future command palette) can react. The default browser
 * binding is only intercepted when an in-page search target is found.
 *
 * The hotkey is ignored when the user is typing inside a non-search editable
 * element (input, textarea, contenteditable) so we never hijack a keystroke
 * from a form they are actively filling in.
 *
 * Escape handling (clear + blur) lives on SearchInput itself so the clear
 * flow stays bound to the consumer's onClear/onSearch callbacks.
 */
export function KeyboardShortcutsProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isMod = event.metaKey || event.ctrlKey;

      if (isMod && (event.key === 'k' || event.key === 'K')) {
        const active = document.activeElement;
        const activeIsSearch =
          active instanceof HTMLElement && active.dataset.searchInput === 'true';
        const activeIsEditable = isEditableElement(active);

        // Allow the shortcut from anywhere except a non-search editable
        // field (e.g. the user is writing in a description textarea).
        if (activeIsEditable && !activeIsSearch) return;

        const target = findSearchInput();
        if (target) {
          event.preventDefault();
          target.focus();
          if (target instanceof HTMLInputElement) {
            target.select();
          }
          return;
        }

        // No inline search target: dispatch the event so optional listeners
        // (e.g. a future command palette) can intercept. We do NOT call
        // preventDefault here — preserve the browser default (search bar).
        window.dispatchEvent(new CustomEvent(FOCUS_SEARCH_EVENT));
        return;
      }

      // Escape handling (clear + blur) is delegated to SearchInput itself
      // so the clear flow stays wired to local state via its onClear callback.
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return <>{children}</>;
}

export { FOCUS_SEARCH_EVENT };
