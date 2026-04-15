'use client';

import { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@components/ui/button';
import { SearchInput } from '@components/ui/search-input';
import { PaginationNav } from '@components/ui/pagination-nav';
import { FilePlus, FileSearch, Loader2 } from 'lucide-react';
import { useDocumentStore } from '@stores/document-store';
import { useDocumentTypeStore } from '@stores/document-type-store';
import {
  DocumentFilters,
  hasActiveFilters,
} from '@components/document-filters/document-filters';
import EmptyState from '@components/empty-state/empty-state';
import { DocumentTable } from '@components/document-list/document-table';

const DocumentsPage = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale as string;

  const {
    documents,
    meta,
    loading,
    query,
    page,
    filters,
    fetchDocuments,
    setQuery,
    setPage,
    setFilters,
  } = useDocumentStore();
  const { getDisplayName, fetchTypes } = useDocumentTypeStore();
  const filtersActive = hasActiveFilters(filters);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments, query, page, filters]);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value || '*');
    },
    [setQuery]
  );

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('common:documents_title')}</h1>
        <Button onClick={() => router.push(`/${locale}/documents/create`)}>
          <FilePlus className="mr-2 h-4 w-4" />
          {t('common:documents_create_new')}
        </Button>
      </div>

      <div className="mb-4 flex flex-col gap-3">
        <SearchInput
          className="w-full"
          placeholder={
            filtersActive
              ? t('common:documents_search_disabled_by_filters')
              : t('common:documents_search_placeholder')
          }
          value={query === '*' ? '' : query}
          onChange={(e) => handleSearch(e.target.value)}
          onSearch={handleSearch}
          disabled={filtersActive}
          aria-describedby={filtersActive ? 'documents-search-filter-note' : undefined}
        />
        {filtersActive && (
          <p id="documents-search-filter-note" className="text-sm text-muted-foreground">
            {t('common:documents_search_filter_note')}
          </p>
        )}
        <DocumentFilters value={filters} onChange={setFilters} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : documents.length === 0 ? (
        <EmptyState
          icon={<FileSearch size={48} />}
          title={t('common:documents_no_results')}
          actionLabel={t('common:documents_create_new')}
          onAction={() => router.push(`/${locale}/documents/create`)}
        />
      ) : (
        <>
          <DocumentTable
            documents={documents}
            locale={locale}
            getTypeName={getDisplayName}
            ariaLabel={t('common:documents_title')}
          />

          {meta && meta.totalPages > 1 && (
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

export default DocumentsPage;
