'use client';

import { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import { Button, Pagination, SearchField, Spinner, Badge, Switch } from '@sk-web-gui/react';
import { FilePlus, FileSearch } from 'lucide-react';
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
    <div className="max-w-[96rem]">
      <div className="mb-[2.4rem] flex items-center justify-between">
        <h1 className="text-[2.4rem] font-bold leading-[3.2rem]">{t('common:documents_title')}</h1>
        <Button
          variant="primary"
          leftIcon={<FilePlus size={18} />}
          onClick={() => router.push(`/${locale}/documents/create`)}
        >
          {t('common:documents_create_new')}
        </Button>
      </div>

      <div className="mb-[1.6rem] flex flex-col gap-[1.2rem]">
        <SearchField
          className="w-full"
          placeholder={t('common:documents_search_placeholder')}
          value={query === '*' ? '' : query}
          onChange={(e) => handleSearch(e.target.value)}
          onSearch={handleSearch}
        />
        <div className="flex items-center gap-[2.4rem]">
          <label className="flex items-center gap-[0.8rem] text-[1.4rem] text-dark-secondary cursor-pointer">
            <Switch
              checked={includeConfidential}
              onChange={(e) => setIncludeConfidential(e.target.checked)}
              aria-label={t('common:documents_include_confidential')}
            />
            {t('common:documents_include_confidential')}
          </label>
          <label className="flex items-center gap-[0.8rem] text-[1.4rem] text-dark-secondary cursor-pointer">
            <Switch
              checked={onlyLatestRevision}
              onChange={(e) => setOnlyLatestRevision(e.target.checked)}
              aria-label={t('common:documents_only_latest')}
            />
            {t('common:documents_only_latest')}
          </label>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-[6.4rem]">
          <Spinner size={3.2} />
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
          <div className="overflow-hidden rounded-[1.2rem] bg-background-100 shadow-100">
            <table className="w-full" aria-label={t('common:documents_title')}>
              <thead>
                <tr className="border-b border-divider bg-primitives-overlay-darken-1">
                  <th scope="col" className="px-[1.6rem] py-[1.2rem] text-left text-[1.3rem] font-semibold uppercase tracking-wide text-dark-secondary">{t('common:documents_reg_number')}</th>
                  <th scope="col" className="px-[1.6rem] py-[1.2rem] text-left text-[1.3rem] font-semibold uppercase tracking-wide text-dark-secondary">{t('common:documents_description')}</th>
                  <th scope="col" className="px-[1.6rem] py-[1.2rem] text-left text-[1.3rem] font-semibold uppercase tracking-wide text-dark-secondary">{t('common:documents_type')}</th>
                  <th scope="col" className="px-[1.6rem] py-[1.2rem] text-left text-[1.3rem] font-semibold uppercase tracking-wide text-dark-secondary">{t('common:documents_created')}</th>
                  <th scope="col" className="px-[1.6rem] py-[1.2rem] text-left text-[1.3rem] font-semibold uppercase tracking-wide text-dark-secondary">{t('common:documents_created_by')}</th>
                  <th scope="col" className="px-[1.6rem] py-[1.2rem] text-left text-[1.3rem] font-semibold uppercase tracking-wide text-dark-secondary">{t('common:documents_confidential')}</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr
                    key={doc.registrationNumber + '-' + doc.revision}
                    tabIndex={0}
                    role="link"
                    className="cursor-pointer border-b border-divider last:border-0 transition-colors hover:bg-vattjom-background-100 focus-visible:bg-vattjom-background-100 focus-visible:outline-none"
                    onClick={() => router.push(`/${locale}/documents/${doc.registrationNumber}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/${locale}/documents/${doc.registrationNumber}`); }}
                  >
                    <td className="px-[1.6rem] py-[1.4rem] text-[1.4rem] font-mono">{doc.registrationNumber}</td>
                    <td className="px-[1.6rem] py-[1.4rem] text-[1.4rem]">
                      {doc.description?.slice(0, 50)}
                      {doc.description?.length > 50 ? '...' : ''}
                    </td>
                    <td className="px-[1.6rem] py-[1.4rem] text-[1.4rem]">{getDisplayName(doc.type)}</td>
                    <td className="px-[1.6rem] py-[1.4rem] text-[1.4rem]">{dayjs(doc.created).format('YYYY-MM-DD')}</td>
                    <td className="px-[1.6rem] py-[1.4rem] text-[1.4rem]">{doc.createdBy}</td>
                    <td className="px-[1.6rem] py-[1.4rem]">
                      {doc.confidentiality?.confidential ? (
                        <Badge color="error" className="text-[1.2rem]">{t('common:yes')}</Badge>
                      ) : (
                        <Badge color="vattjom" className="text-[1.2rem]">{t('common:no')}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="mt-[2rem] flex justify-center">
              <Pagination pages={meta.totalPages} activePage={page + 1} changePage={(p) => setPage(p - 1)} />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DocumentsPage;
