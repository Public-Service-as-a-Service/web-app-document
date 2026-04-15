'use client';

import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@lib/utils';
import { apiService, ApiResponse } from '@services/api-service';
import type { Document, PagedDocumentResponse } from '@interfaces/document.interface';
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

  const [expanded, setExpanded] = useState(false);
  const [revisions, setRevisions] = useState<Document[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const latestHref = `/${locale}/documents/${doc.registrationNumber}`;
  const revisionHref = (revision: number) =>
    `/${locale}/documents/${doc.registrationNumber}?revision=${revision}`;

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
      const next = !expanded;
      setExpanded(next);
      if (next && revisions === null && !loading) {
        loadRevisions();
      }
    },
    [expanded, revisions, loading, loadRevisions]
  );

  const goToRow = () => router.push(latestHref);
  const departmentName =
    doc.metadataList?.find((m) => m.key === 'departmentOrgName')?.value || '---';

  return (
    <>
      <tr
        tabIndex={0}
        role="link"
        aria-expanded={expanded}
        className="cursor-pointer border-b border-border transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
        onClick={goToRow}
        onKeyDown={(e) => {
          if (e.key === 'Enter') goToRow();
        }}
      >
        <td className="w-10 px-2 py-3.5">
          <button
            type="button"
            aria-label={expanded ? t('common:documents_revisions_hide') : t('common:documents_revisions_show')}
            aria-expanded={expanded}
            onClick={handleToggle}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleToggle(e);
              }
            }}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRight
              className={cn('h-4 w-4 transition-transform duration-200', expanded && 'rotate-90')}
            />
          </button>
        </td>
        <td className="px-4 py-3.5 text-sm font-mono">
          <div className="flex flex-col">
            <span>{doc.registrationNumber}</span>
            <span className="text-xs font-sans text-muted-foreground">
              {t('common:document_revision')} {doc.revision}
            </span>
          </div>
        </td>
        <td className="px-4 py-3.5 text-sm">
          {doc.description?.slice(0, 50)}
          {doc.description && doc.description.length > 50 ? '...' : ''}
        </td>
        <td className="px-4 py-3.5 text-sm">{getTypeName(doc.type)}</td>
        <td className="px-4 py-3.5 text-sm">{dayjs(doc.created).format('YYYY-MM-DD')}</td>
        <td className="px-4 py-3.5 text-sm">{doc.createdBy}</td>
        <td className="px-4 py-3.5 text-sm">{departmentName}</td>
      </tr>

      {expanded && (
        <tr className="border-b border-border bg-muted/30">
          <td colSpan={COLUMN_COUNT} className="px-0 py-0">
            <div className="border-l-2 border-primary/40 px-6 py-4">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('common:documents_revisions_loading')}
                </div>
              ) : error ? (
                <p className="text-sm text-destructive">{t('common:documents_revisions_error')}</p>
              ) : !revisions || revisions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('common:documents_revisions_empty')}
                </p>
              ) : (
                <RevisionsSubTable
                  revisions={revisions}
                  activeRevision={doc.revision}
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
  onSelect: (revision: number) => void;
}

const RevisionsSubTable = ({ revisions, activeRevision, onSelect }: RevisionsSubTableProps) => {
  const { t } = useTranslation();
  const count = revisions.length;
  const countLabel =
    count === 1
      ? t('common:documents_revisions_count_one', { count })
      : t('common:documents_revisions_count', { count });

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {countLabel}
      </p>
      <div className="overflow-hidden rounded-md border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/60">
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
                className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {t('common:documents_created_by')}
              </th>
              <th
                scope="col"
                className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
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
                  tabIndex={0}
                  role="link"
                  aria-current={isCurrent ? 'page' : undefined}
                  className={cn(
                    'cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none',
                    isCurrent && 'bg-accent'
                  )}
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
                >
                  <td className="px-3 py-2 font-semibold">
                    <span className="inline-flex items-center gap-2">
                      {rev.revision}
                      {isLatest && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {t('common:revision_latest')}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-2">{dayjs(rev.created).format('YYYY-MM-DD HH:mm')}</td>
                  <td className="px-3 py-2">{rev.createdBy}</td>
                  <td className="px-3 py-2">
                    {rev.description?.slice(0, 60)}
                    {rev.description && rev.description.length > 60 ? '...' : ''}
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
