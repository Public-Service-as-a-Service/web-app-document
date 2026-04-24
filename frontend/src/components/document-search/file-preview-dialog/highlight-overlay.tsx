'use client';

import { useCallback, useEffect, useRef } from 'react';
import { cn } from '@lib/utils';

export interface MarkMetadata {
  /** 1-based page number, resolved from the nearest `[data-pdf-page]` ancestor. */
  page: number | null;
}

interface HighlightOverlayProps {
  terms: readonly string[];
  activeIndex: number;
  /** Called after every successful scan with one entry per wrapped mark, in DOM order. */
  onMarks?: (marks: MarkMetadata[]) => void;
  className?: string;
  children: React.ReactNode;
}

const MARK_TAG = 'MARK';
const MARK_DATA_ATTR = 'data-search-match';

// Debounce the re-scan: renderers like docx-preview emit many mutations in
// rapid succession as they stream HTML in. 120ms is long enough to let a full
// render settle but short enough that the first mark lands before the user
// notices.
const RESCAN_DEBOUNCE_MS = 120;

const escapeRegex = (term: string) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildTermRegex = (terms: readonly string[]): RegExp | null => {
  const parts = terms
    .map((t) => t.trim())
    .filter(Boolean)
    .map(escapeRegex);
  if (parts.length === 0) return null;
  return new RegExp(`(${parts.join('|')})`, 'gi');
};

const shouldSkip = (node: Node): boolean => {
  const parent = node.parentElement;
  if (!parent) return true;
  if (parent.tagName === MARK_TAG && parent.hasAttribute(MARK_DATA_ATTR)) return true;
  if (parent.closest('script, style, noscript')) return true;
  return false;
};

const removeExistingMarks = (root: HTMLElement) => {
  const marks = root.querySelectorAll(`mark[${MARK_DATA_ATTR}]`);
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
    parent.normalize();
  });
};

const wrapMatches = (root: HTMLElement, regex: RegExp): HTMLElement[] => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => (shouldSkip(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });

  const textNodes: Text[] = [];
  let cursor: Node | null = walker.nextNode();
  while (cursor) {
    textNodes.push(cursor as Text);
    cursor = walker.nextNode();
  }

  const created: HTMLElement[] = [];
  for (const textNode of textNodes) {
    const text = textNode.nodeValue ?? '';
    regex.lastIndex = 0;
    if (!regex.test(text)) continue;
    regex.lastIndex = 0;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text))) {
      const before = text.slice(lastIndex, match.index);
      if (before) fragment.appendChild(document.createTextNode(before));
      const mark = document.createElement('mark');
      mark.setAttribute(MARK_DATA_ATTR, 'true');
      mark.textContent = match[0];
      fragment.appendChild(mark);
      created.push(mark);
      lastIndex = match.index + match[0].length;
    }
    const after = text.slice(lastIndex);
    if (after) fragment.appendChild(document.createTextNode(after));
    textNode.parentNode?.replaceChild(fragment, textNode);
  }

  return created;
};

const resolveMarkPage = (mark: HTMLElement): number | null => {
  const pageEl = mark.closest<HTMLElement>('[data-pdf-page]');
  if (!pageEl) return null;
  const raw = pageEl.dataset.pdfPage;
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) ? n : null;
};

const describeMarks = (marks: HTMLElement[]): MarkMetadata[] =>
  marks.map((mark) => ({ page: resolveMarkPage(mark) }));

const applyActive = (marks: HTMLElement[], index: number) => {
  marks.forEach((mark) => mark.removeAttribute('data-active'));
  const target = marks[index];
  if (!target) return;
  target.setAttribute('data-active', 'true');
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({
    behavior: prefersReducedMotion ? 'auto' : 'smooth',
    block: 'center',
    inline: 'nearest',
  });
};

export function HighlightOverlay({
  terms,
  activeIndex,
  onMarks,
  className,
  children,
}: HighlightOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const marksRef = useRef<HTMLElement[]>([]);
  // Keep latest props available to the mutation-observer callback without
  // re-registering the observer every time activeIndex changes.
  const activeIndexRef = useRef(activeIndex);
  const onMarksRef = useRef(onMarks);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    onMarksRef.current = onMarks;
  }, [onMarks]);

  const syncActive = useCallback(() => {
    applyActive(marksRef.current, activeIndexRef.current);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const regex = buildTermRegex(terms);
    if (!regex) {
      removeExistingMarks(container);
      marksRef.current = [];
      onMarksRef.current?.([]);
      return;
    }

    let frame = 0;
    // The observer has to be declared before rescan so rescan can pause it —
    // our own mark insertions are mutations and would otherwise feed the
    // observer in an infinite loop.
    let observer: MutationObserver | null = null;

    const rescan = () => {
      if (!containerRef.current) return;
      observer?.disconnect();
      removeExistingMarks(containerRef.current);
      marksRef.current = wrapMatches(containerRef.current, regex);
      onMarksRef.current?.(describeMarks(marksRef.current));
      applyActive(marksRef.current, activeIndexRef.current);
      observer?.observe(containerRef.current, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    };

    const schedule = () => {
      window.clearTimeout(frame);
      frame = window.setTimeout(rescan, RESCAN_DEBOUNCE_MS);
    };

    observer = new MutationObserver(schedule);
    rescan();

    return () => {
      observer?.disconnect();
      window.clearTimeout(frame);
    };
  }, [terms]);

  useEffect(() => {
    syncActive();
  }, [activeIndex, syncActive]);

  return (
    <div ref={containerRef} className={cn('relative h-full w-full', className)}>
      {children}
    </div>
  );
}
