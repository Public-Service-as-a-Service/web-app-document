'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@components/ui/button';
import { SearchInput } from '@components/ui/search-input';
import { PaginationNav } from '@components/ui/pagination-nav';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@components/ui/collapsible';
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
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { isSearchQuery, useDocumentStore } from '@stores/document-store';
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
import { Eyebrow } from '@components/ui/eyebrow';
import { TableSkeleton } from '@components/data-table/table-skeleton';
import { DocumentCardList } from '@components/document-card/document-card-list';
import { DocumentTable } from '@components/document-list/document-table';
import { DocumentMatchList } from '@components/document-search/document-match-list';
import { MatchSearchToolbar } from '@components/document-search/match-search-toolbar';
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
    matches,
    matchMeta,
    matchLoading,
    matchError,
    includeHistoricalRevisions,
    query,
    page,
    filters,
    fetchDocuments,
    fetchMatches,
    setQuery,
    setPage,
    setFilters,
    setIncludeHistoricalRevisions,
  } = useDocumentStore();
  const { getDisplayName, fetchTypes } = useDocumentTypeStore();

  // Sync store <-> URL (hydrates on mount, debounced writes).
  useDocumentUrlState();

  const filtersActive = hasActiveFilters(filters);
  const textSearchActive = isSearchQuery(query);
  const combinedMode = filtersActive && textSearchActive;

  // Local input value for debounced search. Kept in sync with the store so
  // external changes (URL hydration, clear-all actions) flow back into the
  // controlled input without bouncing.
  const [searchValue, setSearchValue] = useState(query === '*' ? '' : query);
  const [filtersOpen, setFiltersOpen] = useState(filtersActive);
  const lastStoreQueryRef = useRef(query);
  useEffect(() => {
    if (query !== lastStoreQueryRef.current) {
      lastStoreQueryRef.current = query;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchValue(query === '*' ? '' : query);
    }
  }, [query]);

  // If active filters land via URL hydration, reveal the filter panel so the user sees why.
  useEffect(() => {
    if (filtersActive) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFiltersOpen(true);
    }
  }, [filtersActive]);

  useEffect(() => {
    if (textSearchActive) {
      fetchMatches();
    } else {
      fetchDocuments();
    }
  }, [
    textSearchActive,
    query,
    page,
    filters,
    includeHistoricalRevisions,
    fetchDocuments,
    fetchMatches,
  ]);

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

  const activeMeta = textSearchActive ? matchMeta : meta;
  const totalCount = activeMeta?.totalRecords ?? 0;
  const headerReady = activeMeta !== null;

  return (
    <div className="mx-auto w-full max-w-6xl 2xl:max-w-[1600px]">
      <div className="mb-6 flex flex-col gap-5 md:mb-8 md:flex-row md:items-start md:justify-between md:gap-8">
        <header className="min-w-0 flex-1">
          <Eyebrow aria-live="polite">
            {headerReady ? t('common:documents_eyebrow_total', { count: totalCount }) : '\u00A0'}
          </Eyebrow>
          <h1 className="mt-1.5 font-serif text-[28px] font-normal leading-[1.12] tracking-[-0.015em] text-foreground md:text-[36px] xl:text-[40px]">
            {t('common:documents_title')}
          </h1>
          <p className="mt-3 max-w-[56ch] font-serif text-[15.5px] leading-[1.55] text-muted-foreground md:text-[17px]">
            {t('common:documents_lede')}
          </p>
        </header>
        <div className="flex shrink-0 items-center gap-2 md:pt-2">
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
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleTrigger
            className="group inline-flex items-center gap-2 self-start rounded-sm py-1.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
            aria-label={t('common:documents_more_filters')}
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
              {t('common:documents_more_filters')}
            </span>
            <span className="hidden text-[13px] text-muted-foreground/70 sm:inline">
              {t('common:documents_more_filters_hint')}
            </span>
            <ChevronDown
              className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
              aria-hidden="true"
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0">
            <div className="pt-3">
              <DocumentFilters value={filters} onChange={setFilters} />
            </div>
          </CollapsibleContent>
        </Collapsible>
        <ActiveFilterChips
          value={filters}
          onChange={setFilters}
          getTypeLabel={getDisplayName}
          onClearAll={clearAllFilters}
        />
        {combinedMode && (
          <p id="documents-search-combined-hint" className="text-xs text-muted-foreground">
            {t('common:documents_match_filters_disabled_hint')}
          </p>
        )}
        {textSearchActive && (
          <MatchSearchToolbar
            totalRecords={matchMeta?.totalRecords}
            includeHistoricalRevisions={includeHistoricalRevisions}
            onIncludeHistoricalChange={setIncludeHistoricalRevisions}
          />
        )}
      </div>

      {textSearchActive ? (
        matchLoading ? (
          <DocumentMatchList
            matches={[]}
            locale={locale}
            getTypeDisplayName={getDisplayName}
            loading
          />
        ) : matchError ? (
          <DocumentMatchList
            matches={[]}
            locale={locale}
            getTypeDisplayName={getDisplayName}
            error={matchError}
          />
        ) : matches.length === 0 ? (
          <EmptyState
            icon={<FileSearch size={48} />}
            title={t('common:documents_match_no_results')}
          />
        ) : (
          <>
            <DocumentMatchList
              matches={matches}
              locale={locale}
              getTypeDisplayName={getDisplayName}
            />
            {matchMeta && matchMeta.totalPages > 1 && (
              <div className="mt-5 flex justify-center">
                <PaginationNav
                  totalPages={matchMeta.totalPages}
                  currentPage={page + 1}
                  onPageChange={(p) => setPage(p - 1)}
                />
              </div>
            )}
          </>
        )
      ) : loading ? (
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
