'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@lib/utils';

interface HighlightOverlayProps {
  terms: readonly string[];
  activeIndex: number;
  onMatchCount?: (count: number) => void;
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

export function HighlightOverlay({
  terms,
  activeIndex,
  onMatchCount,
  className,
  children,
}: HighlightOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const marksRef = useRef<HTMLElement[]>([]);
  const onMatchCountRef = useRef(onMatchCount);

  useEffect(() => {
    onMatchCountRef.current = onMatchCount;
  }, [onMatchCount]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const regex = buildTermRegex(terms);
    if (!regex) {
      removeExistingMarks(container);
      marksRef.current = [];
      onMatchCountRef.current?.(0);
      return;
    }

    let frame = 0;
    const rescan = () => {
      if (!containerRef.current) return;
      removeExistingMarks(containerRef.current);
      marksRef.current = wrapMatches(containerRef.current, regex);
      onMatchCountRef.current?.(marksRef.current.length);
    };

    const schedule = () => {
      window.clearTimeout(frame);
      frame = window.setTimeout(rescan, RESCAN_DEBOUNCE_MS);
    };

    rescan();

    const observer = new MutationObserver(schedule);
    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
      window.clearTimeout(frame);
    };
  }, [terms]);

  useEffect(() => {
    const marks = marksRef.current;
    if (marks.length === 0) return;
    marks.forEach((mark) => mark.removeAttribute('data-active'));

    const target = marks[activeIndex];
    if (!target) return;
    target.setAttribute('data-active', 'true');

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'center',
      inline: 'nearest',
    });
  }, [activeIndex]);

  return (
    <div ref={containerRef} className={cn('relative h-full w-full', className)}>
      {children}
    </div>
  );
}
