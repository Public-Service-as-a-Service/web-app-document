'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'next/navigation';
import { FileText } from 'lucide-react';
import { apiService, ApiResponse } from '@services/api-service';
import { useDocumentTypeStore } from '@stores/document-type-store';
import { PaginationNav } from '@components/ui/pagination-nav';
import EmptyState from '@components/empty-state/empty-state';
import { ClickableRow, RowLink } from '@components/data-table/clickable-row';
import { TableSkeleton } from '@components/data-table/table-skeleton';
import { DocumentCardList } from '@components/document-card/document-card-list';
import { getDocumentDisplayTitle } from '@utils/document-title';
import type {
  DocumentDto,
  PageMetaDto,
  PagedDocumentResponseDto,
} from '@data-contracts/backend/data-contracts';

interface DepartmentDocumentsProps {
  orgId: number;
  orgName: string;
}

export function DepartmentDocuments({ orgId, orgName }: DepartmentDocumentsProps) {
  const { t } = useTranslation();
  const params = useParams();
  const locale = (params?.locale as string) || 'sv';
  const { getDisplayName } = useDocumentTypeStore();

  const [documents, setDocuments] = useState<DocumentDto[]>([]);
  const [meta, setMeta] = useState<PageMetaDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const orgIdStr = String(orgId);
      const params = new URLSearchParams({
        query: orgIdStr,
        page: String(page),
        size: '100',
        onlyLatestRevision: 'true',
      });

      const res = await apiService.get<ApiResponse<PagedDocumentResponseDto>>(
        `documents?${params.toString()}`
      );
      const data = res.data.data;

      // Search is broad (matches any field) — filter precisely by metadata
      const filtered = (data.documents || []).filter((doc) =>
        doc.metadataList?.some((m) => m.key === 'departmentOrgId' && m.value === orgIdStr)
      );

      setDocuments(filtered);
      setMeta(data._meta ? { ...data._meta, totalRecords: filtered.length, totalPages: 1 } : null);
    } catch {
      setDocuments([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [orgId, page]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    setPage(0);
  }, [orgId]);

  const docHref = (regNum: string) => `/${locale}/documents/${regNum}`;

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">
        {t('common:org_documents_title', { department: orgName })}
      </h2>

      {loading ? (
        <>
          <div className="hidden md:block">
            <TableSkeleton columns={4} rows={6} ariaLabel={t('common:loading')} />
          </div>
          <div className="md:hidden">
            <DocumentCardList
              documents={[]}
              loading
              getHref={() => '#'}
              getTypeDisplayName={() => ''}
            />
          </div>
        </>
      ) : documents.length === 0 ? (
        <EmptyState icon={<FileText size={40} />} title={t('common:org_documents_empty')} />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-lg border border-border md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
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
                    {t('common:document_title_label')}
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
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <ClickableRow key={doc.registrationNumber}>
                    <td className="px-4 py-3.5 text-sm font-mono font-medium">
                      <RowLink
                        href={docHref(doc.registrationNumber)}
                        ariaLabel={`${doc.registrationNumber} – ${getDocumentDisplayTitle(doc)}`}
                      >
                        {doc.registrationNumber}
                      </RowLink>
                    </td>
                    <td className="max-w-xs truncate px-4 py-3.5 text-sm">
                      {getDocumentDisplayTitle(doc)}
                    </td>
                    <td className="px-4 py-3.5 text-sm">{getDisplayName(doc.type)}</td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">
                      {new Date(doc.created).toLocaleDateString(locale)}
                    </td>
                  </ClickableRow>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden">
            <DocumentCardList
              documents={documents}
              getHref={(d) => docHref(d.registrationNumber)}
              getTypeDisplayName={getDisplayName}
            />
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="mt-4">
              <PaginationNav
                totalPages={meta.totalPages}
                currentPage={page + 1}
                onPageChange={(p) => setPage(p - 1)}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
