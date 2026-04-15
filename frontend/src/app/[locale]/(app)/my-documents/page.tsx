'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@components/ui/button';
import { SearchInput } from '@components/ui/search-input';
import { PaginationNav } from '@components/ui/pagination-nav';
import { FilePlus, FileSearch, Loader2 } from 'lucide-react';
import { apiService, ApiResponse } from '@services/api-service';
import { useDocumentTypeStore } from '@stores/document-type-store';
import { useUserStore } from '@stores/user-store';
import {
  DocumentFilters,
  emptyDocumentFilters,
  applyDocumentFilters,
  type DocumentFiltersValue,
} from '@components/document-filters/document-filters';
import EmptyState from '@components/empty-state/empty-state';
import { DocumentTable } from '@components/document-list/document-table';
import type {
  PagedDocumentResponse,
  PageMeta,
  DocumentFilterBody,
} from '@interfaces/document.interface';
import type { Document } from '@interfaces/document.interface';

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
  const [filters, setFilters] = useState<DocumentFiltersValue>(emptyDocumentFilters);

  const fetchDocuments = useCallback(async () => {
    if (!user.username) return;
    setLoading(true);

    try {
      const body: DocumentFilterBody = applyDocumentFilters(
        {
          createdBy: user.username,
          // upstream /documents/filter uses 1-based page numbering
          page: page + 1,
          limit: PAGE_SIZE,
          onlyLatestRevision: true,
          sortBy: ['created'],
          sortDirection: 'DESC',
        },
        filters
      );

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
  }, [user.username, page, filters]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const handleFiltersChange = useCallback((value: DocumentFiltersValue) => {
    setFilters(value);
    setPage(0);
  }, []);

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
        <DocumentFilters value={filters} onChange={handleFiltersChange} />
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
          <DocumentTable
            documents={filteredDocuments}
            locale={locale}
            getTypeName={getDisplayName}
            ariaLabel={t('common:my_documents_title')}
          />

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
