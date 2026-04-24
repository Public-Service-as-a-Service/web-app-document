'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select';

export interface MatchToolbarLabels {
  positionLabel: (current: number, total: number) => string;
  pageOptionLabel: (page: number, count: number) => string;
  prev: string;
  next: string;
  empty: string;
  pageSelectLabel: string;
}

interface MatchToolbarProps {
  total: number;
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
  paged: boolean;
  pagesWithMatches: number[];
  countsByPage: Map<number, number>;
  currentPage: number | null;
  onSelectPage: (page: number) => void;
  labels: MatchToolbarLabels;
}

/**
 * Compact find-in-page toolbar for the preview dialog. Mirrors the browser
 * Cmd+F bar: prev/next + position counter, plus (for paged formats) a page
 * jump dropdown so users can skip the hit-heavy pages in a long PDF without
 * walking the whole list.
 */
export function MatchToolbar({
  total,
  currentIndex,
  onPrev,
  onNext,
  paged,
  pagesWithMatches,
  countsByPage,
  currentPage,
  onSelectPage,
  labels,
}: MatchToolbarProps) {
  const hasMatches = total > 0;
  const hasPages = paged && pagesWithMatches.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/70 bg-muted/30 px-2 py-1.5">
      <div className="flex items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={onPrev}
          aria-label={labels.prev}
          disabled={!hasMatches}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={onNext}
          aria-label={labels.next}
          disabled={!hasMatches}
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
      <span
        className="font-mono text-xs tabular-nums text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        {hasMatches ? labels.positionLabel(currentIndex + 1, total) : labels.empty}
      </span>
      {hasPages && (
        <>
          <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
          <Select
            value={currentPage !== null ? String(currentPage) : undefined}
            onValueChange={(v) => onSelectPage(Number(v))}
          >
            <SelectTrigger size="sm" className="h-8 min-w-40" aria-label={labels.pageSelectLabel}>
              <SelectValue placeholder={labels.pageSelectLabel} />
            </SelectTrigger>
            <SelectContent>
              {pagesWithMatches.map((page) => (
                <SelectItem key={page} value={String(page)}>
                  {labels.pageOptionLabel(page, countsByPage.get(page) ?? 0)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}
    </div>
  );
}
