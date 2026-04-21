'use client';

import { DocumentRow } from '@components/document-list/document-row';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@components/ui/table';
import {
  DocumentColumnsHeader,
  type DocumentColumnKey,
} from '@components/document-list/document-columns';
import type { DocumentDto } from '@data-contracts/backend/data-contracts';
import { useTranslation } from 'react-i18next';

interface DocumentTableProps {
  documents: DocumentDto[];
  locale: string;
  getTypeName: (type: string) => string;
  ariaLabel: string;
}

const COLUMNS: readonly DocumentColumnKey[] = [
  'title',
  'type',
  'validity',
  'responsibilities',
  'department',
];

export const DocumentTable = ({
  documents,
  locale,
  getTypeName,
  ariaLabel,
}: DocumentTableProps) => {
  const { t } = useTranslation();

  return (
    <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-sm md:block">
      <Table aria-label={ariaLabel}>
        <TableHeader>
          <TableRow className="bg-muted">
            <TableHead className="w-10 px-2" aria-hidden="true" />
            <TableHead
              scope="col"
              className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {t('common:documents_reg_number')}
            </TableHead>
            <DocumentColumnsHeader columns={COLUMNS} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <DocumentRow
              key={doc.registrationNumber}
              document={doc}
              locale={locale}
              getTypeName={getTypeName}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export { COLUMNS as DOCUMENT_TABLE_COLUMNS };
