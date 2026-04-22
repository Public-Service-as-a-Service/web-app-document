'use client';

import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { TableCell, TableHead } from '@components/ui/table';
import { DocumentStatusBadge } from '@components/document-status/document-status-badge';
import { EmployeeName } from '@components/user-display/employee-name';
import { truncateDocumentTitleForRow } from '@utils/document-title';
import type { DocumentDto } from '@data-contracts/backend/data-contracts';

// Column catalogue used by all document / revision tables. Each table picks the
// subset it needs; leading cells (registration number, revision number, expand
// toggle) are bespoke and remain at the call site.
export type DocumentColumnKey =
  | 'title'
  | 'regnr'
  | 'type'
  | 'validity'
  | 'responsibilities'
  | 'department'
  | 'status';

// Padding chosen to match the pre-existing hand-rolled tables. shadcn's
// default `p-2` felt too tight in the app's layout.
const HEAD_BASE = 'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground';
const CELL_BASE = 'px-4 py-3.5';

const headClassByColumn: Record<DocumentColumnKey, string> = {
  title: HEAD_BASE,
  regnr: `hidden sm:table-cell ${HEAD_BASE}`,
  type: `hidden sm:table-cell ${HEAD_BASE}`,
  validity: `hidden md:table-cell ${HEAD_BASE}`,
  responsibilities: `hidden lg:table-cell ${HEAD_BASE}`,
  department: `hidden lg:table-cell ${HEAD_BASE}`,
  status: HEAD_BASE,
};

const cellClassByColumn: Record<DocumentColumnKey, string> = {
  title: `${CELL_BASE} max-w-xs truncate text-sm font-medium md:max-w-sm lg:max-w-md`,
  regnr: `${CELL_BASE} hidden sm:table-cell text-sm font-mono text-muted-foreground`,
  type: `${CELL_BASE} hidden sm:table-cell text-sm text-muted-foreground`,
  validity: `${CELL_BASE} hidden md:table-cell text-xs text-muted-foreground tabular-nums`,
  responsibilities: `${CELL_BASE} hidden lg:table-cell text-sm text-muted-foreground whitespace-normal`,
  department: `${CELL_BASE} hidden lg:table-cell text-sm text-muted-foreground whitespace-normal`,
  status: CELL_BASE,
};

interface DocumentColumnsHeaderProps {
  columns: readonly DocumentColumnKey[];
}

export function DocumentColumnsHeader({ columns }: DocumentColumnsHeaderProps) {
  const { t } = useTranslation();
  const labels: Record<DocumentColumnKey, string> = {
    title: t('common:document_title_label'),
    regnr: t('common:documents_reg_number'),
    type: t('common:documents_type'),
    validity: t('common:document_validity'),
    responsibilities: t('common:documents_responsibilities'),
    department: t('common:document_department'),
    status: t('common:document_status_heading'),
  };
  return (
    <>
      {columns.map((key) => (
        <TableHead key={key} scope="col" className={headClassByColumn[key]}>
          {labels[key]}
        </TableHead>
      ))}
    </>
  );
}

interface DocumentColumnsCellsProps {
  document: DocumentDto;
  columns: readonly DocumentColumnKey[];
  getTypeName: (type: string) => string;
}

const formatDate = (value: string | undefined) =>
  value ? dayjs(value).format('YYYY-MM-DD') : null;

export function DocumentColumnsCells({
  document: doc,
  columns,
  getTypeName,
}: DocumentColumnsCellsProps) {
  const { t } = useTranslation();
  const validFrom = formatDate(doc.validFrom);
  const validTo = formatDate(doc.validTo);
  const department = doc.metadataList?.find((m) => m.key === 'departmentOrgName')?.value || '—';
  return (
    <>
      {columns.map((key) => {
        const className = cellClassByColumn[key];
        switch (key) {
          case 'title': {
            const { display, tooltip } = truncateDocumentTitleForRow(doc);
            return (
              <TableCell key={key} className={className} title={tooltip}>
                {display}
              </TableCell>
            );
          }
          case 'regnr':
            return (
              <TableCell key={key} className={className}>
                {doc.registrationNumber}
              </TableCell>
            );
          case 'type':
            return (
              <TableCell key={key} className={className}>
                {getTypeName(doc.type)}
              </TableCell>
            );
          case 'validity':
            return (
              <TableCell key={key} className={className}>
                {validFrom ? (
                  <span>
                    {validFrom}
                    <span aria-hidden="true" className="mx-1 text-muted-foreground/60">
                      →
                    </span>
                    {validTo ?? (
                      <span className="italic">{t('common:document_valid_open_ended')}</span>
                    )}
                  </span>
                ) : (
                  <span>—</span>
                )}
              </TableCell>
            );
          case 'responsibilities':
            return (
              <TableCell key={key} className={className}>
                {doc.responsibilities && doc.responsibilities.length > 0 ? (
                  <span className="inline-flex flex-wrap gap-x-1 gap-y-0.5">
                    {doc.responsibilities.map((r, index) => (
                      <Fragment key={`${r.personId}-${index}`}>
                        {index > 0 && <span aria-hidden="true">,</span>}
                        <EmployeeName personId={r.personId} />
                      </Fragment>
                    ))}
                  </span>
                ) : (
                  '—'
                )}
              </TableCell>
            );
          case 'department':
            return (
              <TableCell key={key} className={className}>
                {department}
              </TableCell>
            );
          case 'status':
            return (
              <TableCell key={key} className={className}>
                <DocumentStatusBadge status={doc.status} />
              </TableCell>
            );
        }
      })}
    </>
  );
}
