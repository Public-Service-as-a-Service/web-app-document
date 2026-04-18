'use client';

import type {} from 'react/canary';
import { useCallback, useId, useState, ViewTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Loader2 } from 'lucide-react';
import { cn, sanitizeVTName } from '@lib/utils';
import { apiService, ApiResponse } from '@services/api-service';
import { Badge } from '@components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@components/ui/table';
import { ClickableRow, RowLink } from '@components/data-table/clickable-row';
import { DocumentStatusBadge } from '@components/document-status/document-status-badge';
import {
  DocumentColumnsCells,
  DocumentColumnsHeader,
  type DocumentColumnKey,
} from '@components/document-list/document-columns';
import type {
  DocumentDto,
  PagedDocumentResponseDto,
} from '@data-contracts/backend/data-contracts';
import { toDisplayRevision } from '@utils/document-revision';

const MAIN_COLUMNS: readonly DocumentColumnKey[] = [
  'description',
  'type',
  'validity',
  'responsibilities',
  'department',
];

const REVISION_COLUMNS: readonly DocumentColumnKey[] = [
  'status',
  'description',
  'type',
  'validity',
  'responsibilities',
  'department',
];

// +2 leading cells (expand toggle and registration number).
const COLUMN_COUNT = MAIN_COLUMNS.length + 2;

interface DocumentRowProps {
  document: DocumentDto;
  locale: string;
  getTypeName: (type: string) => string;
}

export const DocumentRow = ({ document: doc, locale, getTypeName }: DocumentRowProps) => {
  const { t } = useTranslation();
  const panelId = useId();

  const [expanded, setExpanded] = useState(false);
  const [revisions, setRevisions] = useState<DocumentDto[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const latestHref = `/${locale}/documents/${doc.registrationNumber}`;
  const revisionHref = (revision: number) =>
    `/${locale}/documents/${doc.registrationNumber}?revision=${revision}`;

  // We can't tell from a single row whether this document has more
  // revisions above the one that matched the current filter — the
  // filter might be surfacing an older ACTIVE revision while a newer
  // DRAFT exists on top. Always offer the expand control so the user can
  // discover the full revision history. The actual count comes from the
  // revisions list loaded on expand.
  const revisionsKnownCount = revisions?.length;

  const loadRevisions = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await apiService.get<ApiResponse<PagedDocumentResponseDto>>(
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

  const vtName = `doc-${sanitizeVTName(doc.registrationNumber)}-r${doc.revision}`;

  return (
    <>
      <ViewTransition default="none" update="auto">
        <ClickableRow className={cn(expanded && 'bg-muted/30')}>
          <TableCell className="w-10 px-2 py-3.5 align-middle">
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
                'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
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
          </TableCell>
          <TableCell className="px-4 py-3.5 text-sm whitespace-normal">
            <RowLink
              href={latestHref}
              ariaLabel={`${doc.registrationNumber} – ${doc.description ?? ''}`}
            >
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex min-w-0 items-center gap-2">
                  <ViewTransition
                    name={vtName}
                    default="none"
                    share={{
                      'nav-forward': 'morph-forward',
                      'nav-back': 'morph-back',
                      default: 'morph',
                    }}
                  >
                    <span className="truncate font-mono">{doc.registrationNumber}</span>
                  </ViewTransition>
                  <DocumentStatusBadge status={doc.status} />
                </div>
                <span className="text-xs text-muted-foreground">
                  {`${t('common:document_revision')} ${toDisplayRevision(doc.revision)}`}
                  {revisionsKnownCount && revisionsKnownCount > 1
                    ? ` / ${revisionsKnownCount}`
                    : ''}
                </span>
              </div>
            </RowLink>
          </TableCell>
          <DocumentColumnsCells
            document={doc}
            columns={MAIN_COLUMNS}
            getTypeName={getTypeName}
          />
        </ClickableRow>
      </ViewTransition>

      {expanded && (
        <tr className="border-b border-border bg-muted/30">
          <td colSpan={COLUMN_COUNT} className="px-0 py-0">
            <div
              id={panelId}
              role="region"
              aria-label={t('common:document_revisions')}
              className="px-4 py-4 sm:px-6"
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
              ) : revisions.length === 1 ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {t('common:documents_revisions_only_one')}
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {t('common:documents_revisions_only_one_hint')}
                  </p>
                </div>
              ) : (
                <RevisionsSubTable
                  revisions={revisions}
                  activeRevision={doc.revision}
                  registrationNumber={doc.registrationNumber}
                  latestHref={latestHref}
                  revisionHref={revisionHref}
                  getTypeName={getTypeName}
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
  revisions: DocumentDto[];
  activeRevision: number;
  registrationNumber: string;
  latestHref: string;
  revisionHref: (revision: number) => string;
  getTypeName: (type: string) => string;
}

const RevisionsSubTable = ({
  revisions,
  activeRevision,
  registrationNumber,
  latestHref,
  revisionHref,
  getTypeName,
}: RevisionsSubTableProps) => {
  const { t } = useTranslation();
  const count = revisions.length;
  const countLabel =
    count === 1
      ? t('common:documents_revisions_count_one', { count })
      : t('common:documents_revisions_count', { count });
  const tableLabel = `${t('common:document_revisions')} – ${registrationNumber} (${countLabel})`;

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card shadow-sm">
      <Table aria-label={tableLabel}>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead
              scope="col"
              className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {t('common:document_revision')}
            </TableHead>
            <DocumentColumnsHeader columns={REVISION_COLUMNS} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {revisions.map((rev, idx) => {
            const isLatest = idx === 0;
            const isCurrent = rev.revision === activeRevision;
            const href = isCurrent ? latestHref : revisionHref(rev.revision);
            return (
              <ClickableRow
                key={rev.revision}
                aria-current={isCurrent ? 'page' : undefined}
                className={cn(isCurrent && 'bg-primary/5')}
              >
                <TableCell
                  className={cn('px-4 py-3.5 font-semibold', isCurrent && 'text-primary')}
                >
                  <RowLink
                    href={href}
                    ariaLabel={t('common:document_viewing_revision', {
                      revision: toDisplayRevision(rev.revision),
                    })}
                    className="gap-2"
                  >
                    <span className="tabular-nums">{toDisplayRevision(rev.revision)}</span>
                    {isLatest && (
                      <Badge
                        variant="outline"
                        className="h-4 border-primary/30 px-1.5 text-[0.65rem] text-primary"
                      >
                        {t('common:revision_latest')}
                      </Badge>
                    )}
                    {isCurrent && !isLatest && (
                      <Badge variant="outline" className="h-4 px-1.5 text-[0.65rem]">
                        {t('common:documents_revisions_current')}
                      </Badge>
                    )}
                  </RowLink>
                </TableCell>
                <DocumentColumnsCells
                  document={rev}
                  columns={REVISION_COLUMNS}
                  getTypeName={getTypeName}
                />
              </ClickableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
