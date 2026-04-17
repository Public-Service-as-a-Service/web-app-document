'use client';

import type {} from 'react/canary';

import { useEffect, useMemo, useState, ViewTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@components/ui/button';
import {
  FileText,
  FilePlus,
  Settings,
  FileSearch,
  ArrowRight,
  FileUser,
} from 'lucide-react';
import { useDocumentStore } from '@stores/document-store';
import { useDocumentTypeStore } from '@stores/document-type-store';
import { useUserStore } from '@stores/user-store';
import { apiService, ApiResponse } from '@services/api-service';
import EmptyState from '@components/empty-state/empty-state';
import { ClickableRow, RowLink } from '@components/data-table/clickable-row';
import { TableSkeleton } from '@components/data-table/table-skeleton';
import { DocumentCardList } from '@components/document-card/document-card-list';
import { Skeleton } from '@components/ui/skeleton';
import { sanitizeVTName } from '@lib/utils';
import type { PagedDocumentResponseDto } from '@data-contracts/backend/data-contracts';
import dayjs from 'dayjs';

const useTypeDisplayName = () => useDocumentTypeStore((s) => s.getDisplayName);

const DashboardPage = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale as string;

  const { documents, meta, loading, fetchDocuments } = useDocumentStore();
  const { types, loading: typesLoading, fetchTypes } = useDocumentTypeStore();
  const { user } = useUserStore();
  const getDisplayName = useTypeDisplayName();

  const [myDocumentCount, setMyDocumentCount] = useState<number | null>(null);

  useEffect(() => {
    fetchDocuments();
    fetchTypes();
  }, [fetchDocuments, fetchTypes]);

  useEffect(() => {
    if (!user.username) return;
    let cancelled = false;
    apiService
      .post<ApiResponse<PagedDocumentResponseDto>>('documents/filter', {
        createdBy: user.username,
        page: 1,
        limit: 1,
        onlyLatestRevision: true,
        sortBy: ['created'],
        sortDirection: 'DESC',
      })
      .then((res) => {
        if (!cancelled) {
          setMyDocumentCount(res.data.data._meta?.totalRecords ?? 0);
        }
      })
      .catch(() => {
        if (!cancelled) setMyDocumentCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [user.username]);

  const recentDocs = useMemo(() => documents.slice(0, 5), [documents]);
  const docHref = (regNum: string) => `/${locale}/documents/${regNum}`;

  const greeting = user.firstName ? t('common:dashboard_greeting', { name: user.firstName }) : '';

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t('common:dashboard_title')}
        </h1>
        {greeting && (
          <p className="text-sm text-muted-foreground">{greeting}</p>
        )}
      </div>

      <div className="mb-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
        <StatCard
          icon={<FileText size={22} className="text-primary" aria-hidden="true" />}
          iconBg="bg-primary/10"
          label={t('common:dashboard_total_documents')}
          value={loading ? <Skeleton className="h-7 w-16" /> : (meta?.totalRecords ?? 0)}
          index={0}
        />
        <StatCard
          icon={
            <Settings
              size={22}
              className="text-chart-2"
              aria-hidden="true"
            />
          }
          iconBg="bg-chart-2/10"
          label={t('common:dashboard_total_types')}
          value={typesLoading ? <Skeleton className="h-7 w-16" /> : types.length}
          index={1}
        />
        <StatCard
          icon={
            <FileUser
              size={22}
              className="text-chart-3"
              aria-hidden="true"
            />
          }
          iconBg="bg-chart-3/15"
          label={t('common:dashboard_my_documents')}
          value={
            myDocumentCount === null ? <Skeleton className="h-7 w-16" /> : myDocumentCount
          }
          index={2}
        />
      </div>

      <section aria-labelledby="quick-actions-heading" className="mb-10">
        <h2 id="quick-actions-heading" className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {t('common:dashboard_quick_actions')}
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          <Button
            className="h-11 w-full sm:h-9 sm:w-auto"
            onClick={() => router.push(`/${locale}/documents/create`)}
          >
            <FilePlus className="mr-2 h-4 w-4" />
            {t('common:documents_create_new')}
          </Button>
          <Button
            variant="outline"
            className="h-11 w-full sm:h-9 sm:w-auto"
            onClick={() => router.push(`/${locale}/documents`)}
          >
            <FileText className="mr-2 h-4 w-4" />
            {t('common:dashboard_browse_all')}
          </Button>
          <Button
            variant="outline"
            className="h-11 w-full sm:h-9 sm:w-auto"
            onClick={() => router.push(`/${locale}/my-documents`)}
          >
            <FileUser className="mr-2 h-4 w-4" />
            {t('common:my_documents_title')}
          </Button>
        </div>
      </section>

      <section aria-labelledby="recent-heading">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 id="recent-heading" className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {t('common:dashboard_recent')}
            </h2>
            {!loading && documents.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {t('common:dashboard_recent_subtitle', {
                  shown: Math.min(5, documents.length),
                  total: meta?.totalRecords ?? documents.length,
                })}
              </p>
            )}
          </div>
          {!loading && documents.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/documents`)}>
              {t('common:nav_documents')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>

        {loading ? (
          <>
            <div className="hidden md:block">
              <TableSkeleton columns={4} rows={5} ariaLabel={t('common:loading')} />
            </div>
            <div className="md:hidden">
              <DocumentCardList
                documents={[]}
                loading
                skeletonCount={3}
                getHref={() => '#'}
                getTypeDisplayName={() => ''}
              />
            </div>
          </>
        ) : documents.length === 0 ? (
          <EmptyState
            icon={<FileSearch size={48} />}
            title={t('common:dashboard_no_documents_yet')}
            actionLabel={t('common:dashboard_create_first')}
            onAction={() => router.push(`/${locale}/documents/create`)}
          />
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-sm md:block">
              <table className="w-full" aria-label={t('common:dashboard_recent')}>
                <thead>
                  <tr className="border-b border-border bg-muted/40">
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
                      className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {t('common:documents_created')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentDocs.map((doc) => {
                    const vtName = `doc-${sanitizeVTName(doc.registrationNumber)}-r${doc.revision}`;
                    return (
                      <ViewTransition key={doc.registrationNumber}>
                        <ClickableRow>
                          <td className="px-4 py-3.5 text-sm font-mono">
                            <RowLink
                              href={docHref(doc.registrationNumber)}
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
                          <td className="px-4 py-3.5 text-sm">
                            {doc.description?.slice(0, 60)}
                            {doc.description?.length && doc.description.length > 60 ? '…' : ''}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-muted-foreground">{getDisplayName(doc.type)}</td>
                          <td className="px-4 py-3.5 text-right text-sm text-muted-foreground tabular-nums">
                            {dayjs(doc.created).format('YYYY-MM-DD')}
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
                documents={recentDocs}
                getHref={(d) => docHref(d.registrationNumber)}
                getTypeDisplayName={getDisplayName}
              />
            </div>
          </>
        )}
      </section>
    </div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: React.ReactNode;
  index: number;
}

function StatCard({ icon, iconBg, label, value, index }: StatCardProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="stagger-item group flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-[transform,border-color,box-shadow] hover:-translate-y-px hover:border-primary/30 hover:shadow-md"
      style={{ ['--i' as string]: index } as React.CSSProperties}
    >
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
        aria-hidden="true"
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default DashboardPage;
