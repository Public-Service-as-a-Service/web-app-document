'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@components/ui/button';
import { cn } from '@lib/utils';
import type { FileMatchPosition } from '@interfaces/document.interface';

export interface MatchNavigatorLabels {
  heading: string;
  pagedSummary: (matchCount: number, pageCount: number) => string;
  flatSummary: (matchCount: number) => string;
  pageLabel: (page: number) => string;
  positionLabel: (current: number, total: number) => string;
  empty: string;
  prev: string;
  next: string;
  gotoMatch: (index: number, page: number | null) => string;
}

interface MatchNavigatorProps {
  matches: FileMatchPosition[];
  pagesWithMatches: number[];
  matchesByPage: Map<number | null, FileMatchPosition[]>;
  currentIndex: number;
  onSelect: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
  paged: boolean;
  labels: MatchNavigatorLabels;
}

export function MatchNavigator({
  matches,
  pagesWithMatches,
  matchesByPage,
  currentIndex,
  onSelect,
  onPrev,
  onNext,
  paged,
  labels,
}: MatchNavigatorProps) {
  if (matches.length === 0) {
    return (
      <div
        role="status"
        className="flex items-center gap-2 text-xs text-muted-foreground"
        aria-live="polite"
      >
        {labels.empty}
      </div>
    );
  }

  const position = labels.positionLabel(currentIndex + 1, matches.length);

  return (
    <div className="flex h-full flex-col gap-3">
      <div>
        <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          {labels.heading}
        </h2>
        <p className="mt-1 text-sm text-foreground">
          {paged && pagesWithMatches.length > 0
            ? labels.pagedSummary(matches.length, pagesWithMatches.length)
            : labels.flatSummary(matches.length)}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={onPrev}
          aria-label={labels.prev}
        >
          <ChevronUp className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={onNext}
          aria-label={labels.next}
        >
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </Button>
        <span
          className="ml-2 font-mono text-xs text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          {position}
        </span>
      </div>

      {paged && pagesWithMatches.length > 0 && (
        <ul className="-mx-1 flex-1 overflow-y-auto pr-1" role="list">
          {pagesWithMatches.map((pageNo) => {
            const bucket = matchesByPage.get(pageNo) ?? [];
            return (
              <li key={pageNo} className="mb-2 last:mb-0">
                <div className="mb-1 px-1 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  {labels.pageLabel(pageNo)}
                </div>
                <div className="flex flex-col gap-1">
                  {bucket.map((match) => {
                    const globalIndex = matches.indexOf(match);
                    const isActive = globalIndex === currentIndex;
                    return (
                      <button
                        key={`${match.field}-${match.start}`}
                        type="button"
                        onClick={() => onSelect(globalIndex)}
                        aria-current={isActive ? 'true' : undefined}
                        aria-label={labels.gotoMatch(globalIndex + 1, match.page)}
                        className={cn(
                          'group flex min-h-11 w-full items-center justify-between gap-3 rounded-md border border-transparent px-3 py-2 text-left text-sm transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                          isActive
                            ? 'border-highlight/50 bg-highlight/20 text-foreground'
                            : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <span className="font-mono text-[11px]">#{globalIndex + 1}</span>
                        <span className="font-mono text-[11px] uppercase tracking-[0.08em]">
                          {match.field}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
