'use client';

import { useTranslation } from 'react-i18next';
import { DocumentRow } from '@components/document-list/document-row';
import type { DocumentDto } from '@data-contracts/backend/data-contracts';

interface DocumentTableProps {
  documents: DocumentDto[];
  locale: string;
  getTypeName: (type: string) => string;
  ariaLabel: string;
}

export const DocumentTable = ({
  documents,
  locale,
  getTypeName,
  ariaLabel,
}: DocumentTableProps) => {
  const { t } = useTranslation();

  return (
    <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-sm md:block">
      <table className="w-full" aria-label={ariaLabel}>
        <thead>
          <tr className="border-b border-border bg-muted">
            <th scope="col" className="w-10 px-2 py-3" aria-hidden="true" />
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {t('common:documents_reg_number')}
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {t('common:documents_description')}
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {t('common:documents_type')}
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {t('common:documents_created')}
            </th>
            <th
              scope="col"
              className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:table-cell"
            >
              {t('common:documents_responsibilities')}
            </th>
            <th
              scope="col"
              className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:table-cell"
            >
              {t('common:document_department')}
            </th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <DocumentRow
              key={doc.registrationNumber}
              document={doc}
              locale={locale}
              getTypeName={getTypeName}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};
