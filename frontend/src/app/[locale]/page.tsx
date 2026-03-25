'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import { Button, Spinner } from '@sk-web-gui/react';
import { FileText, FilePlus, Settings, FileSearch, ArrowRight } from 'lucide-react';
import { useDocumentStore } from '@stores/document-store';
import { useDocumentTypeStore } from '@stores/document-type-store';

const useTypeDisplayName = () => useDocumentTypeStore((s) => s.getDisplayName);
import EmptyState from '@components/empty-state/empty-state';
import dayjs from 'dayjs';

const DashboardPage = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale as string;

  const { documents, meta, loading, fetchDocuments } = useDocumentStore();
  const { types, loading: typesLoading, fetchTypes } = useDocumentTypeStore();
  const getDisplayName = useTypeDisplayName();

  useEffect(() => {
    fetchDocuments();
    fetchTypes();
  }, [fetchDocuments, fetchTypes]);

  return (
    <div className="max-w-[96rem]">
      <h1 className="mb-[2.4rem] text-[2.4rem] font-bold leading-[3.2rem]">{t('common:dashboard_title')}</h1>

      <div className="mb-[3.2rem] grid grid-cols-1 gap-[1.6rem] md:grid-cols-3">
        <div role="status" className="flex items-center gap-[1.6rem] rounded-[1.2rem] bg-background-100 p-[2rem] shadow-100">
          <div className="flex h-[4.8rem] w-[4.8rem] items-center justify-center rounded-[1rem] bg-vattjom-background-200">
            <FileText size={24} className="text-vattjom-text-primary" aria-hidden="true" />
          </div>
          <div>
            <div className="text-[2.4rem] font-bold leading-[3.2rem]">
              {loading ? <Spinner size={2.4} /> : meta?.totalRecords ?? 0}
            </div>
            <p className="text-[1.3rem] text-dark-secondary">{t('common:dashboard_total_documents')}</p>
          </div>
        </div>

        <div role="status" className="flex items-center gap-[1.6rem] rounded-[1.2rem] bg-background-100 p-[2rem] shadow-100">
          <div className="flex h-[4.8rem] w-[4.8rem] items-center justify-center rounded-[1rem] bg-gronsta-background-200">
            <Settings size={24} className="text-gronsta-text-primary" aria-hidden="true" />
          </div>
          <div>
            <div className="text-[2.4rem] font-bold leading-[3.2rem]">
              {typesLoading ? <Spinner size={2.4} /> : types.length}
            </div>
            <p className="text-[1.3rem] text-dark-secondary">{t('common:dashboard_total_types')}</p>
          </div>
        </div>
      </div>

      <div className="mb-[3.2rem]">
        <h2 className="mb-[1.2rem] text-[1.8rem] font-semibold">{t('common:dashboard_quick_actions')}</h2>
        <div className="flex flex-wrap gap-[1.2rem]">
          <Button
            variant="primary"
            leftIcon={<FilePlus size={18} />}
            onClick={() => router.push(`/${locale}/documents/create`)}
          >
            {t('common:documents_create_new')}
          </Button>
          <Button
            variant="secondary"
            leftIcon={<FileText size={18} />}
            onClick={() => router.push(`/${locale}/documents`)}
          >
            {t('common:nav_documents')}
          </Button>
          <Button
            variant="secondary"
            leftIcon={<Settings size={18} />}
            onClick={() => router.push(`/${locale}/admin/document-types`)}
          >
            {t('common:nav_document_types')}
          </Button>
        </div>
      </div>

      <div>
        <div className="mb-[1.2rem] flex items-center justify-between">
          <h2 className="text-[1.8rem] font-semibold">{t('common:dashboard_recent')}</h2>
          {documents.length > 0 && (
            <Button
              variant="tertiary"
              size="sm"
              rightIcon={<ArrowRight size={16} />}
              onClick={() => router.push(`/${locale}/documents`)}
            >
              {t('common:nav_documents')}
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-[4.8rem]">
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
          <div className="overflow-hidden rounded-[1.2rem] bg-background-100 shadow-100">
            <table className="w-full" aria-label={t('common:dashboard_recent')}>
              <thead>
                <tr className="border-b border-divider bg-primitives-overlay-darken-1">
                  <th scope="col" className="px-[1.6rem] py-[1.2rem] text-left text-[1.3rem] font-semibold uppercase tracking-wide text-dark-secondary">{t('common:documents_reg_number')}</th>
                  <th scope="col" className="px-[1.6rem] py-[1.2rem] text-left text-[1.3rem] font-semibold uppercase tracking-wide text-dark-secondary">{t('common:documents_description')}</th>
                  <th scope="col" className="px-[1.6rem] py-[1.2rem] text-left text-[1.3rem] font-semibold uppercase tracking-wide text-dark-secondary">{t('common:documents_type')}</th>
                  <th scope="col" className="px-[1.6rem] py-[1.2rem] text-left text-[1.3rem] font-semibold uppercase tracking-wide text-dark-secondary">{t('common:documents_created')}</th>
                </tr>
              </thead>
              <tbody>
                {documents.slice(0, 5).map((doc) => (
                  <tr
                    key={doc.registrationNumber}
                    tabIndex={0}
                    role="link"
                    className="cursor-pointer border-b border-divider last:border-0 transition-colors hover:bg-vattjom-background-100 focus-visible:bg-vattjom-background-100 focus-visible:outline-none"
                    onClick={() => router.push(`/${locale}/documents/${doc.registrationNumber}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/${locale}/documents/${doc.registrationNumber}`); }}
                  >
                    <td className="px-[1.6rem] py-[1.4rem] text-[1.4rem] font-mono">{doc.registrationNumber}</td>
                    <td className="px-[1.6rem] py-[1.4rem] text-[1.4rem]">{doc.description?.slice(0, 60)}{doc.description?.length > 60 ? '...' : ''}</td>
                    <td className="px-[1.6rem] py-[1.4rem] text-[1.4rem]">{getDisplayName(doc.type)}</td>
                    <td className="px-[1.6rem] py-[1.4rem] text-[1.4rem]">{dayjs(doc.created).format('YYYY-MM-DD')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
