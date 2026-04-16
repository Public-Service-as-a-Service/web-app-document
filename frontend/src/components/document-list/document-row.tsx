'use client';

import type {} from 'react/canary';
import { useCallback, useId, useState, ViewTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { ChevronDown, History, Loader2 } from 'lucide-react';
import { cn, sanitizeVTName } from '@lib/utils';
import { apiService, ApiResponse } from '@services/api-service';
import { Badge } from '@components/ui/badge';
import { ClickableRow, RowLink } from '@components/data-table/clickable-row';
import type { Document, PagedDocumentResponse } from '@interfaces/document.interface';
import { toDisplayRevision } from '@utils/document-revision';
import dayjs from 'dayjs';

const COLUMN_COUNT = 7;

interface DocumentRowProps {
  document: Document;
  locale: string;
  getTypeName: (type: string) => string;
}

export const DocumentRow = ({ document: doc, locale, getTypeName }: DocumentRowProps) => {
  const { t } = useTranslation();
  const router = useRouter();
  const panelId = useId();

  const [expanded, setExpanded] = useState(false);
  const [revisions, setRevisions] = useState<Document[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const latestHref = `/${locale}/documents/${doc.registrationNumber}`;
  const revisionHref = (revision: number) =>
    `/${locale}/documents/${doc.registrationNumber}?revision=${revision}`;

  // A document whose highest revision is 0 has only ever been created once, so
  // exposing an expand control is noise. The detail page still covers the
  // single revision through its normal path.
  const hasMultipleRevisions = doc.revision > 0;

  const loadRevisions = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await apiService.get<ApiResponse<PagedDocumentResponse>>(
        `documents/${doc.registrationNumber}/revisions?size=50&sort=revision,desc`
      );
      const list = (res.data.data.documents || []).slice().sort((a, b) => b.revision - a.revision);
      setRevisions(list);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [doc.registrationNumber]);

  const handleToggle = useCallback(
    (event: React.MouseEvent | React.KeyboardEvent) => {
      event.stopPropagation();
      event.preventDefault();
      const next = !expanded;
      setExpanded(next);
      if (next && revisions === null && !loading) {
        loadRevisions();
      }
    },
    [expanded, revisions, loading, loadRevisions]
  );

  const departmentName =
    doc.metadataList?.find((m) => m.key === 'departmentOrgName')?.value || '—';

  const vtName = `doc-${sanitizeVTName(doc.registrationNumber)}-r${doc.revision}`;

  return (
    <>
      <ClickableRow className={cn(expanded && 'bg-muted/30')}>
        <td className="w-10 px-2 py-3.5 align-middle">
          {hasMultipleRevisions ? (
            <button
              type="button"
              aria-label={
                expanded
                  ? t('common:documents_revisions_hide')
                  : t('common:documents_revisions_show')
              }
              aria-expanded={expanded}
              aria-controls={panelId}
              onClick={handleToggle}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleToggle(e);
                }
              }}
              className={cn(
                'relative z-10 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground outline-none',
                'transition-colors hover:bg-muted hover:text-foreground',
                'focus-visible:ring-[2px] focus-visible:ring-ring/50',
                expanded && 'bg-muted text-foreground'
              )}
            >
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform duration-200',
                  expanded ? 'rotate-0' : '-rotate-90'
                )}
                aria-hidden="true"
              />
            </button>
          ) : (
            <span className="block size-8" aria-hidden="true" />
          )}
        </td>
        <td className="px-4 py-3.5 text-sm font-mono">
          <RowLink
            href={latestHref}
            ariaLabel={`${doc.registrationNumber} – ${doc.description ?? ''}`}
          >
            <div className="flex min-w-0 flex-col">
              <ViewTransition
                name={vtName}
                default="none"
                share={{
                  'nav-forward': 'morph-forward',
                  'nav-back': 'morph-back',
                  default: 'morph',
                }}
              >
                <span className="truncate">{doc.registrationNumber}</span>
              </ViewTransition>
              <span className="font-sans text-xs text-muted-foreground">
                {hasMultipleRevisions
                  ? `${t('common:document_revision')} ${toDisplayRevision(doc.revision)}`
                  : t('common:documents_revisions_only_one')}
              </span>
            </div>
          </RowLink>
        </td>
        <td className="px-4 py-3.5 text-sm">
          {doc.description?.slice(0, 50)}
          {doc.description && doc.description.length > 50 ? '…' : ''}
        </td>
        <td className="px-4 py-3.5 text-sm text-muted-foreground">{getTypeName(doc.type)}</td>
        <td className="px-4 py-3.5 text-sm text-muted-foreground tabular-nums">
          {dayjs(doc.created).format('YYYY-MM-DD')}
        </td>
        <td className="hidden px-4 py-3.5 text-sm text-muted-foreground lg:table-cell">
          {doc.createdBy}
        </td>
        <td className="hidden px-4 py-3.5 text-sm text-muted-foreground lg:table-cell">
          {departmentName}
        </td>
      </ClickableRow>

      {expanded && hasMultipleRevisions && (
        <tr className="border-b border-border bg-muted/30">
          <td colSpan={COLUMN_COUNT} className="px-0 py-0">
            <div
              id={panelId}
              role="region"
              aria-label={t('common:document_revisions')}
              className="relative border-l-2 border-primary/50 px-4 py-4 sm:px-6"
            >
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  {t('common:documents_revisions_loading')}
                </div>
              ) : error ? (
                <p className="text-sm text-destructive" role="alert">
                  {t('common:documents_revisions_error')}
                </p>
              ) : !revisions || revisions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('common:documents_revisions_empty')}
                </p>
              ) : (
                <RevisionsSubTable
                  revisions={revisions}
                  activeRevision={doc.revision}
                  registrationNumber={doc.registrationNumber}
                  onSelect={(revision) =>
                    router.push(revision === doc.revision ? latestHref : revisionHref(revision))
                  }
                />
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

interface RevisionsSubTableProps {
  revisions: Document[];
  activeRevision: number;
  registrationNumber: string;
  onSelect: (revision: number) => void;
}

const RevisionsSubTable = ({
  revisions,
  activeRevision,
  registrationNumber,
  onSelect,
}: RevisionsSubTableProps) => {
  const { t } = useTranslation();
  const count = revisions.length;
  const countLabel =
    count === 1
      ? t('common:documents_revisions_count_one', { count })
      : t('common:documents_revisions_count', { count });
  const tableLabel = `${t('common:document_revisions')} – ${registrationNumber} (${countLabel})`;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <History className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        <Badge variant="secondary" className="h-5 px-1.5 font-mono text-[0.7rem]">
          {countLabel}
        </Badge>
      </div>
      <div className="overflow-hidden rounded-md border border-border bg-card shadow-sm">
        <table className="w-full text-sm" aria-label={tableLabel}>
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th
                scope="col"
                className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {t('common:document_revision')}
              </th>
              <th
                scope="col"
                className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {t('common:documents_created')}
              </th>
              <th
                scope="col"
                className="hidden px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:table-cell"
              >
                {t('common:documents_created_by')}
              </th>
              <th
                scope="col"
                className="hidden px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground md:table-cell"
              >
                {t('common:documents_description')}
              </th>
            </tr>
          </thead>
          <tbody>
            {revisions.map((rev, idx) => {
              const isLatest = idx === 0;
              const isCurrent = rev.revision === activeRevision;
              return (
                <tr
                  key={rev.revision}
                  aria-current={isCurrent ? 'page' : undefined}
                  onClick={() => onSelect(rev.revision)}
                  className={cn(
                    'group relative cursor-pointer border-b border-border transition-colors last:border-0',
                    'hover:bg-accent focus-within:bg-accent',
                    'focus-within:ring-2 focus-within:ring-inset focus-within:ring-ring',
                    isCurrent && 'bg-primary/5'
                  )}
                >
                  <td
                    className={cn(
                      'relative px-3 py-2 font-semibold',
                      isCurrent &&
                        'before:absolute before:left-0 before:top-1/2 before:h-6 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-primary'
                    )}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(rev.revision);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          onSelect(rev.revision);
                        }
                      }}
                      className="relative inline-flex items-center gap-2 rounded-sm text-left outline-none after:absolute after:inset-0 after:cursor-pointer after:content-[''] focus-visible:outline-none"
                      aria-label={t('common:document_viewing_revision', {
                        revision: toDisplayRevision(rev.revision),
                      })}
                    >
                      <span className="tabular-nums">{toDisplayRevision(rev.revision)}</span>
                      {isLatest && (
                        <Badge variant="outline" className="h-4 border-primary/30 px-1.5 text-[0.65rem] text-primary">
                          {t('common:revision_latest')}
                        </Badge>
                      )}
                      {isCurrent && !isLatest && (
                        <Badge variant="outline" className="h-4 px-1.5 text-[0.65rem]">
                          {t('common:documents_revisions_current')}
                        </Badge>
                      )}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground tabular-nums">
                    {dayjs(rev.created).format('YYYY-MM-DD HH:mm')}
                  </td>
                  <td className="hidden px-3 py-2 text-muted-foreground sm:table-cell">
                    {rev.createdBy}
                  </td>
                  <td className="hidden px-3 py-2 md:table-cell">
                    {rev.description?.slice(0, 60)}
                    {rev.description && rev.description.length > 60 ? '…' : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
