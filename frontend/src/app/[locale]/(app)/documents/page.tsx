'use client';

import { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@components/ui/button';
import { Switch } from '@components/ui/switch';
import { Label } from '@components/ui/label';
import { SearchInput } from '@components/ui/search-input';
import { PaginationNav } from '@components/ui/pagination-nav';
import { FilePlus, FileSearch, ShieldAlert, ShieldOff, Loader2 } from 'lucide-react';
import { useDocumentStore } from '@stores/document-store';
import { useDocumentTypeStore } from '@stores/document-type-store';
import EmptyState from '@components/empty-state/empty-state';
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
    includeConfidential,
    onlyLatestRevision,
    fetchDocuments,
    setQuery,
    setPage,
    setIncludeConfidential,
    setOnlyLatestRevision,
  } = useDocumentStore();
  const { getDisplayName, fetchTypes } = useDocumentTypeStore();

  useEffect(() => {
    fetchDocuments();
    fetchTypes();
  }, [fetchDocuments, fetchTypes, query, page, includeConfidential, onlyLatestRevision]);

  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value || '*');
    },
    [setQuery],
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
          placeholder={t('common:documents_search_placeholder')}
          value={query === '*' ? '' : query}
          onChange={(e) => handleSearch(e.target.value)}
          onSearch={handleSearch}
        />
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch
              id="include-confidential"
              checked={includeConfidential}
              onCheckedChange={setIncludeConfidential}
            />
            <Label htmlFor="include-confidential" className="cursor-pointer text-sm text-muted-foreground">
              {t('common:documents_include_confidential')}
            </Label>
          </div>
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
          <div className="overflow-hidden rounded-xl bg-card shadow-sm">
            <table className="w-full" aria-label={t('common:documents_title')}>
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('common:documents_reg_number')}</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('common:documents_description')}</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('common:documents_type')}</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('common:documents_created')}</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('common:documents_created_by')}</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('common:documents_confidential')}</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr
                    key={doc.registrationNumber + '-' + doc.revision}
                    tabIndex={0}
                    role="link"
                    className="cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                    onClick={() => router.push(`/${locale}/documents/${doc.registrationNumber}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/${locale}/documents/${doc.registrationNumber}`); }}
                  >
                    <td className="px-4 py-3.5 text-sm font-mono">{doc.registrationNumber}</td>
                    <td className="px-4 py-3.5 text-sm">
                      {doc.description?.slice(0, 50)}
                      {doc.description?.length > 50 ? '...' : ''}
                    </td>
                    <td className="px-4 py-3.5 text-sm">{getDisplayName(doc.type)}</td>
                    <td className="px-4 py-3.5 text-sm">{dayjs(doc.created).format('YYYY-MM-DD')}</td>
                    <td className="px-4 py-3.5 text-sm">{doc.createdBy}</td>
                    <td className="px-4 py-3.5">
                      {doc.confidentiality?.confidential ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                          <ShieldAlert size={16} />
                          {t('common:yes')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <ShieldOff size={14} />
                          {t('common:no')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="mt-5 flex justify-center">
              <PaginationNav totalPages={meta.totalPages} currentPage={page + 1} onPageChange={(p) => setPage(p - 1)} />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DocumentsPage;
