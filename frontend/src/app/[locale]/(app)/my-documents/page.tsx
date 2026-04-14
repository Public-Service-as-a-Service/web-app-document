'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@components/ui/button';
import { Switch } from '@components/ui/switch';
import { Label } from '@components/ui/label';
import { SearchInput } from '@components/ui/search-input';
import { PaginationNav } from '@components/ui/pagination-nav';
import { FilePlus, FileSearch, Loader2 } from 'lucide-react';
import { apiService, ApiResponse } from '@services/api-service';
import { useDocumentTypeStore } from '@stores/document-type-store';
import { useUserStore } from '@stores/user-store';
import EmptyState from '@components/empty-state/empty-state';
import type {
  PagedDocumentResponse,
  PageMeta,
  DocumentFilterBody,
} from '@interfaces/document.interface';
import type { Document } from '@interfaces/document.interface';
import dayjs from 'dayjs';

const PAGE_SIZE = 20;

const MyDocumentsPage = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale as string;

  const { user } = useUserStore();
  const { getDisplayName, fetchTypes } = useDocumentTypeStore();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyLatestRevision, setOnlyLatestRevision] = useState(true);

  const fetchDocuments = useCallback(async () => {
    if (!user.username) return;
    setLoading(true);

    try {
      const body: DocumentFilterBody = {
        createdBy: user.username,
        page,
        limit: PAGE_SIZE,
        includeConfidential: false,
        onlyLatestRevision,
        sortBy: ['created'],
        sortDirection: 'DESC',
      };

      const res = await apiService.post<ApiResponse<PagedDocumentResponse>>(
        'documents/filter',
        body
      );
      const data = res.data.data;

      setDocuments(data.documents || []);
      setMeta(data._meta || null);
    } catch {
      setDocuments([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [user.username, page, onlyLatestRevision]);

  useEffect(() => {
    fetchDocuments();
    fetchTypes();
  }, [fetchDocuments, fetchTypes]);

  const handleLatestRevisionChange = useCallback((value: boolean) => {
    setOnlyLatestRevision(value);
    setPage(0);
  }, []);

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  // Client-side search within the current page of results
  const filteredDocuments = useMemo(() => {
    if (!searchTerm) return documents;
    const q = searchTerm.toLowerCase();
    return documents.filter(
      (doc) =>
        doc.registrationNumber.toLowerCase().includes(q) ||
        doc.description?.toLowerCase().includes(q) ||
        doc.type.toLowerCase().includes(q) ||
        doc.metadataList?.some((m) => m.value?.toLowerCase().includes(q))
    );
  }, [documents, searchTerm]);

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('common:my_documents_title')}</h1>
        <Button onClick={() => router.push(`/${locale}/documents/create`)}>
          <FilePlus className="mr-2 h-4 w-4" />
          {t('common:documents_create_new')}
        </Button>
      </div>

      <div className="mb-4 flex flex-col gap-3">
        <SearchInput
          className="w-full"
          placeholder={t('common:my_documents_search_placeholder')}
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          onSearch={handleSearch}
        />
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch
              id="my-only-latest"
              checked={onlyLatestRevision}
              onCheckedChange={handleLatestRevisionChange}
            />
            <Label
              htmlFor="my-only-latest"
              className="cursor-pointer text-sm text-muted-foreground"
            >
              {t('common:documents_only_latest')}
            </Label>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredDocuments.length === 0 ? (
        <EmptyState
          icon={<FileSearch size={48} />}
          title={t('common:my_documents_no_results')}
          actionLabel={t('common:documents_create_new')}
          onAction={() => router.push(`/${locale}/documents/create`)}
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl bg-card shadow-sm">
            <table className="w-full" aria-label={t('common:my_documents_title')}>
              <thead>
                <tr className="border-b border-border bg-muted">
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
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {t('common:document_department')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((doc) => (
                  <tr
                    key={doc.registrationNumber + '-' + doc.revision}
                    tabIndex={0}
                    role="link"
                    className="cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                    onClick={() => router.push(`/${locale}/documents/${doc.registrationNumber}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter')
                        router.push(`/${locale}/documents/${doc.registrationNumber}`);
                    }}
                  >
                    <td className="px-4 py-3.5 text-sm font-mono">{doc.registrationNumber}</td>
                    <td className="px-4 py-3.5 text-sm">
                      {doc.description?.slice(0, 50)}
                      {doc.description?.length > 50 ? '...' : ''}
                    </td>
                    <td className="px-4 py-3.5 text-sm">{getDisplayName(doc.type)}</td>
                    <td className="px-4 py-3.5 text-sm">
                      {dayjs(doc.created).format('YYYY-MM-DD')}
                    </td>
                    <td className="px-4 py-3.5 text-sm">
                      {doc.metadataList?.find((m) => m.key === 'departmentOrgName')?.value || '---'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta && meta.totalPages > 1 && !searchTerm && (
            <div className="mt-5 flex justify-center">
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
};

export default MyDocumentsPage;
