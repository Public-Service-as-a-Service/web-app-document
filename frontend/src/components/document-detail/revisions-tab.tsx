'use client';

import { useTranslation } from 'react-i18next';
import { History } from 'lucide-react';
import { Badge } from '@components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@components/ui/table';
import { ClickableRow, RowLink } from '@components/data-table/clickable-row';
import {
  DocumentColumnsCells,
  DocumentColumnsHeader,
} from '@components/document-list/document-columns';
import type { DocumentDto } from '@data-contracts/backend/data-contracts';
import { cn } from '@lib/utils';
import { toDisplayRevision } from '@utils/document-revision';
import { EmployeeName } from '@components/user-display/employee-name';
import dayjs from 'dayjs';
import { DETAIL_REVISION_COLUMNS } from './document-detail-helpers';
import { useDocumentDetail } from './document-detail-context';

interface RevisionsTabProps {
  revisions: DocumentDto[];
  activeRevision: number;
  latestRevisionNumber: number | null;
  firstRevisionNumber: number | null;
  getTypeName: (type: string) => string;
}

export const RevisionsTab = ({
  revisions,
  activeRevision,
  latestRevisionNumber,
  firstRevisionNumber,
  getTypeName,
}: RevisionsTabProps) => {
  const { t } = useTranslation();
  const { doc, registrationNumber, locale } = useDocumentDetail();

  if (revisions.length === 0) {
    return (
      <div className="mt-5">
        <p className="py-5 text-sm text-muted-foreground">
          {t('common:document_revisions_empty')}
        </p>
      </div>
    );
  }

  if (revisions.length === 1) {
    return (
      <div className="mt-5">
        <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            aria-hidden="true"
          >
            <History size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {t('common:documents_revisions_only_one')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('common:documents_revisions_only_one_hint')}
            </p>
            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-xs sm:grid-cols-3">
              <div>
                <dt className="font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('common:documents_created')}
                </dt>
                <dd className="mt-0.5 tabular-nums text-foreground">
                  {dayjs(revisions[0].created).format('YYYY-MM-DD HH:mm')}
                </dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('common:documents_created_by')}
                </dt>
                <dd className="mt-0.5 text-foreground">
                  <EmployeeName personId={revisions[0].createdBy} />
                </dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('common:document_revision')}
                </dt>
                <dd className="mt-0.5 font-mono text-foreground">
                  {toDisplayRevision(revisions[0].revision)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <div className="mb-3 flex items-center gap-2">
        <History className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        <Badge variant="secondary" className="h-5 px-1.5 font-mono text-[0.7rem]">
          {t('common:documents_revisions_count', { count: revisions.length })}
        </Badge>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <Table aria-label={`${t('common:document_revisions')} – ${doc.registrationNumber}`}>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead
                scope="col"
                className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {t('common:document_revision')}
              </TableHead>
              <DocumentColumnsHeader columns={DETAIL_REVISION_COLUMNS} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {revisions.map((rev) => {
              const isActive = activeRevision === rev.revision;
              const isLatest = rev.revision === latestRevisionNumber;
              const isFirst =
                revisions.length > 1 &&
                rev.revision === firstRevisionNumber &&
                rev.revision !== latestRevisionNumber;
              const href = isLatest
                ? `/${locale}/documents/${registrationNumber}`
                : `/${locale}/documents/${registrationNumber}?revision=${rev.revision}`;
              return (
                <ClickableRow
                  key={rev.revision}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(isActive && 'bg-primary/5')}
                >
                  <TableCell
                    className={cn(
                      'px-4 py-3.5 text-sm font-semibold',
                      isActive && 'text-primary'
                    )}
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
                      {isFirst && (
                        <Badge
                          variant="outline"
                          className="h-4 px-1.5 text-[0.65rem] text-muted-foreground"
                        >
                          {t('common:revision_first')}
                        </Badge>
                      )}
                      {isActive && !isLatest && (
                        <Badge variant="outline" className="h-4 px-1.5 text-[0.65rem]">
                          {t('common:documents_revisions_current')}
                        </Badge>
                      )}
                    </RowLink>
                  </TableCell>
                  <DocumentColumnsCells
                    document={rev}
                    columns={DETAIL_REVISION_COLUMNS}
                    getTypeName={getTypeName}
                  />
                </ClickableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
