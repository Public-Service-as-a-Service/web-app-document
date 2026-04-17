'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@components/ui/button';
import { SearchInput } from '@components/ui/search-input';
import { PaginationNav } from '@components/ui/pagination-nav';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@components/ui/dropdown-menu';
import {
  FilePlus,
  FileSearch,
  Link as LinkIcon,
  Check,
  MoreVertical,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDocumentStore } from '@stores/document-store';
import { useDocumentTypeStore } from '@stores/document-type-store';
import { useDocumentUrlState } from '@stores/use-document-url-state';
import { useDebouncedCallback } from '@lib/use-debounced-callback';
import {
  DocumentFilters,
  emptyDocumentFilters,
  hasActiveFilters,
} from '@components/document-filters/document-filters';
import { ActiveFilterChips } from '@components/document-filters/active-filter-chips';
import EmptyState from '@components/empty-state/empty-state';
import { TableSkeleton } from '@components/data-table/table-skeleton';
import { DocumentCardList } from '@components/document-card/document-card-list';
import { DocumentTable } from '@components/document-list/document-table';
import type { DocumentDto } from '@data-contracts/backend/data-contracts';

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

  // Sync store <-> URL (hydrates on mount, debounced writes).
  useDocumentUrlState();

  const filtersActive = hasActiveFilters(filters);
  const textSearchActive = query !== '*' && query.length > 0;
  const combinedMode = filtersActive && textSearchActive;

  // Local input value for debounced search. Kept in sync with the store so
  // external changes (URL hydration, clear-all actions) flow back into the
  // controlled input without bouncing.
  const [searchValue, setSearchValue] = useState(query === '*' ? '' : query);
  const lastStoreQueryRef = useRef(query);
  useEffect(() => {
    if (query !== lastStoreQueryRef.current) {
      lastStoreQueryRef.current = query;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchValue(query === '*' ? '' : query);
    }
  }, [query]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments, query, page, filters]);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const commitSearch = useCallback(
    (value: string) => {
      const next = value || '*';
      lastStoreQueryRef.current = next;
      setQuery(next);
    },
    [setQuery]
  );

  const debouncedCommitSearch = useDebouncedCallback(commitSearch, 300);

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setSearchValue(value);
      debouncedCommitSearch(value);
    },
    [debouncedCommitSearch]
  );

  const handleSearchSubmit = useCallback(
    (value: string) => {
      debouncedCommitSearch.cancel();
      setSearchValue(value);
      commitSearch(value);
    },
    [commitSearch, debouncedCommitSearch]
  );

  const handleSearchClear = useCallback(() => {
    debouncedCommitSearch.cancel();
    setSearchValue('');
    commitSearch('');
  }, [commitSearch, debouncedCommitSearch]);

  const getDocumentHref = useCallback(
    (doc: DocumentDto) => `/${locale}/documents/${doc.registrationNumber}`,
    [locale]
  );

  const clearAllFilters = () => setFilters(emptyDocumentFilters);

  const [linkCopied, setLinkCopied] = useState(false);
  const handleCopyViewLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      toast.success(t('common:documents_copy_view_link_success'));
      setTimeout(() => setLinkCopied(false), 1500);
    } catch {
      toast.error(t('common:documents_copy_view_link_error'));
    }
  }, [t]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between gap-3 sm:flex-row">
        <h1 className="text-2xl font-semibold tracking-tight">{t('common:documents_title')}</h1>
        <div className="flex items-center gap-2 sm:w-auto">
          <Button
            variant="outline"
            onClick={handleCopyViewLink}
            aria-label={t('common:documents_copy_view_link')}
            className="hidden lg:inline-flex"
          >
            {linkCopied ? (
              <Check className="mr-2 h-4 w-4" aria-hidden="true" />
            ) : (
              <LinkIcon className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            {t('common:documents_copy_view_link')}
          </Button>
          <Button
            onClick={() => router.push(`/${locale}/documents/create`)}
            className="h-11 sm:h-9"
            aria-label={t('common:documents_create_new')}
          >
            <FilePlus className="mr-2 h-4 w-4" />
            <span className="sm:hidden">{t('common:create')}</span>
            <span className="hidden sm:inline">{t('common:documents_create_new')}</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label={t('common:actions')}
                className="h-11 w-11 shrink-0 lg:hidden"
              >
                <MoreVertical className="h-5 w-5" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={handleCopyViewLink}>
                {linkCopied ? (
                  <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                ) : (
                  <LinkIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                {t('common:documents_copy_view_link')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3">
        <SearchInput
          className="w-full"
          placeholder={t('common:documents_search_placeholder')}
          value={searchValue}
          onChange={handleSearchChange}
          onSearch={handleSearchSubmit}
          onClear={handleSearchClear}
          shortcut="⌘K"
          aria-describedby={combinedMode ? 'documents-search-combined-hint' : undefined}
          aria-keyshortcuts="Meta+K Control+K"
        />
        <DocumentFilters value={filters} onChange={setFilters} />
        <ActiveFilterChips
          value={filters}
          onChange={setFilters}
          getTypeLabel={getDisplayName}
          onClearAll={clearAllFilters}
        />
        {combinedMode && (
          <p id="documents-search-combined-hint" className="text-xs text-muted-foreground">
            {t('common:documents_filter_combined_hint')}
          </p>
        )}
      </div>

      {loading ? (
        <>
          <div className="hidden md:block">
            <TableSkeleton columns={7} rows={8} ariaLabel={t('common:loading')} />
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
          <div className="md:hidden">
            <DocumentCardList
              documents={documents}
              getHref={getDocumentHref}
              getTypeDisplayName={getDisplayName}
            />
          </div>

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
