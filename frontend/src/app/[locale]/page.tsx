'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@components/ui/button';
import { FileText, FilePlus, Settings, FileSearch, ArrowRight, Loader2 } from 'lucide-react';
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
    <div className="max-w-6xl">
      <h1 className="mb-6 text-2xl font-bold">{t('common:dashboard_title')}</h1>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div role="status" className="flex items-center gap-4 rounded-xl bg-card p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <FileText size={24} className="text-primary" aria-hidden="true" />
          </div>
          <div>
            <div className="text-2xl font-bold">
              {loading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : meta?.totalRecords ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">{t('common:dashboard_total_documents')}</p>
          </div>
        </div>

        <div role="status" className="flex items-center gap-4 rounded-xl bg-card p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950">
            <Settings size={24} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          </div>
          <div>
            <div className="text-2xl font-bold">
              {typesLoading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : types.length}
            </div>
            <p className="text-xs text-muted-foreground">{t('common:dashboard_total_types')}</p>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">{t('common:dashboard_quick_actions')}</h2>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => router.push(`/${locale}/documents/create`)}>
            <FilePlus className="mr-2 h-4 w-4" />
            {t('common:documents_create_new')}
          </Button>
          <Button variant="secondary" onClick={() => router.push(`/${locale}/documents`)}>
            <FileText className="mr-2 h-4 w-4" />
            {t('common:nav_documents')}
          </Button>
          <Button variant="secondary" onClick={() => router.push(`/${locale}/admin/document-types`)}>
            <Settings className="mr-2 h-4 w-4" />
            {t('common:nav_document_types')}
          </Button>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('common:dashboard_recent')}</h2>
          {documents.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/documents`)}>
              {t('common:nav_documents')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
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
          <div className="overflow-hidden rounded-xl bg-card shadow-sm">
            <table className="w-full" aria-label={t('common:dashboard_recent')}>
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('common:documents_reg_number')}</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('common:documents_description')}</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('common:documents_type')}</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('common:documents_created')}</th>
                </tr>
              </thead>
              <tbody>
                {documents.slice(0, 5).map((doc) => (
                  <tr
                    key={doc.registrationNumber}
                    tabIndex={0}
                    role="link"
                    className="cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                    onClick={() => router.push(`/${locale}/documents/${doc.registrationNumber}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/${locale}/documents/${doc.registrationNumber}`); }}
                  >
                    <td className="px-4 py-3.5 text-sm font-mono">{doc.registrationNumber}</td>
                    <td className="px-4 py-3.5 text-sm">{doc.description?.slice(0, 60)}{doc.description?.length > 60 ? '...' : ''}</td>
                    <td className="px-4 py-3.5 text-sm">{getDisplayName(doc.type)}</td>
                    <td className="px-4 py-3.5 text-sm">{dayjs(doc.created).format('YYYY-MM-DD')}</td>
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
