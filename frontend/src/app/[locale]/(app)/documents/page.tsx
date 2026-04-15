'use client';

import type {} from 'react/canary';

import { useEffect, useCallback, useState, useRef, ViewTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@components/ui/button';
import { Switch } from '@components/ui/switch';
import { Label } from '@components/ui/label';
import { SearchInput } from '@components/ui/search-input';
import { PaginationNav } from '@components/ui/pagination-nav';
import { FilePlus, FileSearch } from 'lucide-react';
import { useDocumentStore } from '@stores/document-store';
import { useDocumentTypeStore } from '@stores/document-type-store';
import { useDocumentUrlState } from '@stores/use-document-url-state';
import { useDebouncedCallback } from '@lib/use-debounced-callback';
import { DocumentFilters, hasActiveFilters } from '@components/document-filters/document-filters';
import { ActiveFilterChips } from '@components/document-filters/active-filter-chips';
import EmptyState from '@components/empty-state/empty-state';
import { ClickableRow, RowLink } from '@components/data-table/clickable-row';
import { TableSkeleton } from '@components/data-table/table-skeleton';
import { DocumentCardList } from '@components/document-card/document-card-list';
import { sanitizeVTName } from '@lib/utils';
import type { Document } from '@interfaces/document.interface';
import dayjs from 'dayjs';

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
    onlyLatestRevision,
    filters,
    fetchDocuments,
    setQuery,
    setPage,
    setOnlyLatestRevision,
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
  }, [fetchDocuments, query, page, onlyLatestRevision, filters]);

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
    (doc: Document) =>
      onlyLatestRevision
        ? `/${locale}/documents/${doc.registrationNumber}`
        : `/${locale}/documents/${doc.registrationNumber}?revision=${doc.revision}`,
    [locale, onlyLatestRevision]
  );

  const clearAllFilters = () =>
    setFilters({ documentTypes: [], departments: [] });

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t('common:documents_title')}</h1>
        <Button onClick={() => router.push(`/${locale}/documents/create`)} className="w-full sm:w-auto">
          <FilePlus className="mr-2 h-4 w-4" />
          {t('common:documents_create_new')}
        </Button>
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <DocumentFilters value={filters} onChange={setFilters} />
          <div className="flex items-center gap-2">
            <Switch
              id="only-latest"
              checked={onlyLatestRevision}
              onCheckedChange={setOnlyLatestRevision}
            />
            <Label htmlFor="only-latest" className="cursor-pointer text-sm text-muted-foreground">
              {t('common:documents_only_latest')}
            </Label>
          </div>
        </div>
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
            <TableSkeleton columns={onlyLatestRevision ? 6 : 7} rows={8} ariaLabel={t('common:loading')} />
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
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-sm md:block">
            <table className="w-full" aria-label={t('common:documents_title')}>
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {t('common:documents_reg_number')}
                  </th>
                  {!onlyLatestRevision && (
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {t('common:document_revision')}
                    </th>
                  )}
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
                    {t('common:documents_created_by')}
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
                {documents.map((doc) => {
                  const documentHref = getDocumentHref(doc);
                  const department =
                    doc.metadataList?.find((m) => m.key === 'departmentOrgName')?.value || '---';
                  const rowKey = doc.registrationNumber + '-' + doc.revision;
                  const vtName = `doc-${sanitizeVTName(doc.registrationNumber)}-r${doc.revision}`;
                  return (
                    <ViewTransition key={rowKey}>
                      <ClickableRow>
                        <td className="px-4 py-3.5 text-sm font-mono">
                          <RowLink
                            href={documentHref}
                            ariaLabel={`${doc.registrationNumber} – ${doc.description ?? ''}`}
                          >
                            <ViewTransition
                              name={vtName}
                              default="none"
                              share={{
                                'nav-forward': 'morph-forward',
                                'nav-back': 'morph-back',
                                default: 'morph',
                              }}
                            >
                              <span>{doc.registrationNumber}</span>
                            </ViewTransition>
                          </RowLink>
                        </td>
                        {!onlyLatestRevision && (
                          <td className="px-4 py-3.5 text-sm font-semibold">{doc.revision}</td>
                        )}
                        <td className="px-4 py-3.5 text-sm">
                          {doc.description?.slice(0, 50)}
                          {doc.description?.length && doc.description.length > 50 ? '...' : ''}
                        </td>
                        <td className="px-4 py-3.5 text-sm">{getDisplayName(doc.type)}</td>
                        <td className="px-4 py-3.5 text-sm text-muted-foreground">
                          {dayjs(doc.created).format('YYYY-MM-DD')}
                        </td>
                        <td className="hidden px-4 py-3.5 text-sm text-muted-foreground lg:table-cell">
                          {doc.createdBy}
                        </td>
                        <td className="hidden px-4 py-3.5 text-sm text-muted-foreground lg:table-cell">
                          {department}
                        </td>
                      </ClickableRow>
                    </ViewTransition>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="md:hidden">
            <DocumentCardList
              documents={documents}
              getHref={getDocumentHref}
              getTypeDisplayName={getDisplayName}
              showRevision={!onlyLatestRevision}
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
