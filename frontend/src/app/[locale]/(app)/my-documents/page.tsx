'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@components/ui/button';
import { Switch } from '@components/ui/switch';
import { Label } from '@components/ui/label';
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
import { ClickableRow, RowLink } from '@components/data-table/clickable-row';
import { TableSkeleton } from '@components/data-table/table-skeleton';
import { DocumentCardList } from '@components/document-card/document-card-list';
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
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyLatestRevision, setOnlyLatestRevision] = useState(true);
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
          onlyLatestRevision,
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
  }, [user.username, page, onlyLatestRevision, filters]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const handleLatestRevisionChange = useCallback((value: boolean) => {
    setOnlyLatestRevision(value);
    setPage(0);
  }, []);

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
    (doc: Document) => `/${locale}/documents/${doc.registrationNumber}`,
    [locale]
  );

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('common:my_documents_title')}</h1>
        <Button
          onClick={() => router.push(`/${locale}/documents/create`)}
          className="w-full sm:w-auto"
        >
          <FilePlus className="mr-2 h-4 w-4" />
          {t('common:documents_create_new')}
        </Button>
      </div>

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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <DocumentFilters value={filters} onChange={handleFiltersChange} />
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
            <TableSkeleton columns={5} rows={6} ariaLabel={t('common:loading')} />
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
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-sm md:block">
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
                    className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:table-cell"
                  >
                    {t('common:document_department')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((doc) => (
                  <ClickableRow key={doc.registrationNumber + '-' + doc.revision}>
                    <td className="px-4 py-3.5 text-sm font-mono">
                      <RowLink
                        href={getDocumentHref(doc)}
                        ariaLabel={`${doc.registrationNumber} – ${doc.description ?? ''}`}
                      >
                        {doc.registrationNumber}
                      </RowLink>
                    </td>
                    <td className="px-4 py-3.5 text-sm">
                      {doc.description?.slice(0, 50)}
                      {doc.description?.length && doc.description.length > 50 ? '...' : ''}
                    </td>
                    <td className="px-4 py-3.5 text-sm">{getDisplayName(doc.type)}</td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">
                      {dayjs(doc.created).format('YYYY-MM-DD')}
                    </td>
                    <td className="hidden px-4 py-3.5 text-sm text-muted-foreground lg:table-cell">
                      {doc.metadataList?.find((m) => m.key === 'departmentOrgName')?.value || '---'}
                    </td>
                  </ClickableRow>
                ))}
              </tbody>
            </table>
          </div>
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
