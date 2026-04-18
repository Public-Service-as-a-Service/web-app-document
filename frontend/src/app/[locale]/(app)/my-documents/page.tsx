'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@components/ui/button';
import { SearchInput } from '@components/ui/search-input';
import { PaginationNav } from '@components/ui/pagination-nav';
import { FilePlus, FileSearch } from 'lucide-react';
import { apiService, ApiResponse } from '@services/api-service';
import { useDocumentTypeStore } from '@stores/document-type-store';
import { useUserStore } from '@stores/user-store';
import { useDebouncedCallback } from '@lib/use-debounced-callback';
import {
  DocumentFilters,
  emptyDocumentFilters,
  applyDocumentFilters,
  type DocumentFiltersValue,
} from '@components/document-filters/document-filters';
import { ActiveFilterChips } from '@components/document-filters/active-filter-chips';
import EmptyState from '@components/empty-state/empty-state';
import { TableSkeleton } from '@components/data-table/table-skeleton';
import { DocumentCardList } from '@components/document-card/document-card-list';
import { DocumentTable } from '@components/document-list/document-table';
import type {
  DocumentDto,
  PageMetaDto,
  PagedDocumentResponseDto,
} from '@data-contracts/backend/data-contracts';
import type { DocumentFilterBody } from '@interfaces/document.interface';

const PAGE_SIZE = 20;

const MyDocumentsPage = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale as string;

  const { user } = useUserStore();
  const { getDisplayName, fetchTypes } = useDocumentTypeStore();

  const [documents, setDocuments] = useState<DocumentDto[]>([]);
  const [meta, setMeta] = useState<PageMetaDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState('');
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

      const res = await apiService.post<ApiResponse<PagedDocumentResponseDto>>(
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

  const commitSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const debouncedCommitSearch = useDebouncedCallback(commitSearch, 300);

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setSearchInput(value);
      debouncedCommitSearch(value);
    },
    [debouncedCommitSearch]
  );

  const handleSearchSubmit = useCallback(
    (value: string) => {
      debouncedCommitSearch.cancel();
      setSearchInput(value);
      commitSearch(value);
    },
    [commitSearch, debouncedCommitSearch]
  );

  const handleSearchClear = useCallback(() => {
    debouncedCommitSearch.cancel();
    setSearchInput('');
    commitSearch('');
  }, [commitSearch, debouncedCommitSearch]);

  const handleFiltersChange = useCallback((value: DocumentFiltersValue) => {
    setFilters(value);
    setPage(0);
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters(emptyDocumentFilters);
    setPage(0);
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

  const getDocumentHref = useCallback(
    (doc: DocumentDto) => `/${locale}/documents/${doc.registrationNumber}`,
    [locale]
  );

  return (
    <div className="mx-auto w-full max-w-6xl 2xl:max-w-[1600px]">
      <header className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-[62ch]">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            {t('common:my_documents_eyebrow')}
          </p>
          <h1 className="mt-1.5 font-serif text-[28px] font-normal leading-[1.12] tracking-[-0.015em] text-foreground md:text-[36px]">
            {t('common:my_documents_title')}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground md:text-[16.5px]">
            {t('common:my_documents_intro')}
          </p>
        </div>
        <Button
          onClick={() => router.push(`/${locale}/documents/create`)}
          className="w-full shrink-0 sm:w-auto"
        >
          <FilePlus className="mr-2 h-4 w-4" />
          {t('common:documents_create_new')}
        </Button>
      </header>

      <div className="mb-4 flex flex-col gap-3">
        <SearchInput
          className="w-full"
          placeholder={t('common:my_documents_search_placeholder')}
          value={searchInput}
          onChange={handleSearchChange}
          onSearch={handleSearchSubmit}
          onClear={handleSearchClear}
          shortcut="⌘K"
          aria-keyshortcuts="Meta+K Control+K"
        />
        <DocumentFilters value={filters} onChange={handleFiltersChange} />
        <ActiveFilterChips
          value={filters}
          onChange={handleFiltersChange}
          getTypeLabel={getDisplayName}
          onClearAll={clearAllFilters}
        />
      </div>

      {loading ? (
        <>
          <div className="hidden md:block">
            <TableSkeleton columns={7} rows={6} ariaLabel={t('common:loading')} />
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
          <div className="md:hidden">
            <DocumentCardList
              documents={filteredDocuments}
              getHref={getDocumentHref}
              getTypeDisplayName={getDisplayName}
            />
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
