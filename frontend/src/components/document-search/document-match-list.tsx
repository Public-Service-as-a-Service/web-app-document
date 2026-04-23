'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@components/ui/accordion';
import { Skeleton } from '@components/ui/skeleton';
import { Alert, AlertDescription } from '@components/ui/alert';
import { DocumentStatusBadge } from '@components/document-status/document-status-badge';
import { FileMatchBlock } from './file-match-block';
import { toDisplayRevision } from '@utils/document-revision';
import { truncateDocumentTitleForRow } from '@utils/document-title';
import { cn } from '@lib/utils';
import type { HydratedDocumentMatch } from '@services/document-search-service';

interface DocumentMatchListProps {
  matches: HydratedDocumentMatch[];
  locale: string;
  getTypeDisplayName: (type: string) => string;
  loading?: boolean;
  error?: string | null;
}

const countHighlights = (match: HydratedDocumentMatch): number =>
  (match.files ?? []).reduce(
    (sum, file) =>
      sum + Object.values(file.highlights ?? {}).reduce((inner, arr) => inner + arr.length, 0),
    0
  );

// Auto-expand heuristic: every match for small result sets, top three otherwise.
// Keeps single-query glance-ability for the common case without flooding the
// viewport when a broad query returns many documents.
const defaultExpandedIds = (matches: HydratedDocumentMatch[]): string[] => {
  if (matches.length === 0) return [];
  if (matches.length <= 10) return matches.map((m) => m.id);
  return matches.slice(0, 3).map((m) => m.id);
};

export function DocumentMatchList({
  matches,
  locale,
  getTypeDisplayName,
  loading,
  error,
}: DocumentMatchListProps) {
  const { t } = useTranslation();

  // A stable identity for this result set. Passing it as `key` remounts the
  // Accordion when pagination or a new query arrives, so `defaultValue` is
  // reapplied against the new document IDs instead of stale ones.
  const resultKey = useMemo(() => matches.map((m) => m.id).join('|'), [matches]);

  if (loading) {
    return (
      <div
        className="flex flex-col gap-2.5"
        role="status"
        aria-label={t('common:documents_file_search_loading')}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-md border border-border bg-card px-4 py-4">
            <Skeleton className="h-5 w-2/3" />
            <div className="mt-2 flex gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (matches.length === 0) {
    return null;
  }

  return (
    <Accordion
      key={resultKey}
      type="multiple"
      defaultValue={defaultExpandedIds(matches)}
      className="flex flex-col gap-2.5"
    >
      {matches.map((match) => (
        <DocumentMatchItem
          key={match.id}
          match={match}
          locale={locale}
          getTypeDisplayName={getTypeDisplayName}
        />
      ))}
    </Accordion>
  );
}

interface DocumentMatchItemProps {
  match: HydratedDocumentMatch;
  locale: string;
  getTypeDisplayName: (type: string) => string;
}

function DocumentMatchItem({ match, locale, getTypeDisplayName }: DocumentMatchItemProps) {
  const { t } = useTranslation();
  const totalMatches = countHighlights(match);
  const href = `/${locale}/documents/${match.registrationNumber}?revision=${toDisplayRevision(match.revision)}`;

  const meta = match.metadata;
  const titleInfo = meta ? truncateDocumentTitleForRow(meta) : null;

  return (
    <AccordionItem
      value={match.id}
      className={cn(
        'relative overflow-hidden rounded-md border border-border bg-card pl-[3px] transition-shadow',
        'data-[state=open]:shadow-sm',
        // Amber accent rule — signals "this card surfaced through full-text
        // search" and ties the highlight tint into the card frame.
        'before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:bg-highlight/70 before:content-[""]'
      )}
    >
      <AccordionTrigger className="items-center gap-3 px-4 py-3 hover:no-underline">
        <div className="flex min-w-0 flex-1 flex-col gap-1 text-left">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {titleInfo ? (
              <span className="truncate text-[15px] font-medium" title={titleInfo.tooltip}>
                {titleInfo.display}
              </span>
            ) : (
              <span className="truncate font-mono text-[13px] font-medium tracking-wide">
                {match.registrationNumber}
              </span>
            )}
            {meta?.status && <DocumentStatusBadge status={meta.status} />}
            <span className="ml-auto shrink-0 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
              {t('common:documents_match_count', { count: totalMatches })}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="font-mono tracking-wide">{match.registrationNumber}</span>
            {meta?.type && (
              <>
                <span aria-hidden="true">·</span>
                <span>{getTypeDisplayName(meta.type)}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span>
              {t('common:documents_match_revision', {
                revision: toDisplayRevision(match.revision),
              })}
            </span>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4">
        <div className="flex flex-col divide-y divide-border/60 border-t border-border/60">
          {match.files.map((file) => {
            const mimeType =
              match.metadata?.documentData?.find((d) => d.id === file.id)?.mimeType ?? '';
            return (
              <FileMatchBlock
                key={file.id}
                file={file}
                registrationNumber={match.registrationNumber}
                revision={match.revision}
                mimeType={mimeType}
              />
            );
          })}
        </div>
        <Link
          href={href}
          className="mt-3 inline-flex items-center gap-1 self-start rounded-sm text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {t('common:documents_match_open_document')}
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </AccordionContent>
    </AccordionItem>
  );
}
