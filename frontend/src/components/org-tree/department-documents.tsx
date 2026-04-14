'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import { FileText } from 'lucide-react';
import { apiService, ApiResponse } from '@services/api-service';
import { useDocumentTypeStore } from '@stores/document-type-store';
import { PaginationNav } from '@components/ui/pagination-nav';
import EmptyState from '@components/empty-state/empty-state';
import { Skeleton } from '@components/ui/skeleton';
import type { PagedDocumentResponse, PageMeta } from '@interfaces/document.interface';
import type { Document } from '@interfaces/document.interface';

interface DepartmentDocumentsProps {
  orgId: number;
  orgName: string;
}

export function DepartmentDocuments({ orgId, orgName }: DepartmentDocumentsProps) {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'sv';
  const { getDisplayName } = useDocumentTypeStore();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
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
        includeConfidential: 'false',
        onlyLatestRevision: 'true',
      });

      const res = await apiService.get<ApiResponse<PagedDocumentResponse>>(
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

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">
        {t('common:org_documents_title', { department: orgName })}
      </h2>

      {documents.length === 0 ? (
        <EmptyState icon={<FileText size={40} />} title={t('common:org_documents_empty')} />
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-border">
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
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {documents.map((doc) => (
                  <tr
                    key={doc.registrationNumber}
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => router.push(`/${locale}/documents/${doc.registrationNumber}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter')
                        router.push(`/${locale}/documents/${doc.registrationNumber}`);
                    }}
                    tabIndex={0}
                    role="link"
                  >
                    <td className="px-4 py-3.5 text-sm font-medium">{doc.registrationNumber}</td>
                    <td className="max-w-xs truncate px-4 py-3.5 text-sm">{doc.description}</td>
                    <td className="px-4 py-3.5 text-sm">{getDisplayName(doc.type)}</td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">
                      {new Date(doc.created).toLocaleDateString(locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
