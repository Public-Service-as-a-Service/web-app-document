'use client';

import type {} from 'react/canary';

import { useEffect, useMemo, useState, ViewTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileSearch } from 'lucide-react';
import { useDocumentStore } from '@stores/document-store';
import { useDocumentTypeStore } from '@stores/document-type-store';
import { useUserStore } from '@stores/user-store';
import { apiService, ApiResponse } from '@services/api-service';
import EmptyState from '@components/empty-state/empty-state';
import { SearchInput } from '@components/ui/search-input';
import { DocumentStatusBadge } from '@components/document-status/document-status-badge';
import { Skeleton } from '@components/ui/skeleton';
import { SectionHeader } from '@components/dashboard/section-header';
import {
  AttentionSection,
  useAttentionItems,
} from '@components/dashboard/attention';
import { sanitizeVTName } from '@lib/utils';
import { getDocumentDisplayTitle } from '@utils/document-title';
import type { DocumentDto, PagedDocumentResponseDto } from '@data-contracts/backend/data-contracts';
import dayjs from 'dayjs';

const useTypeDisplayName = () => useDocumentTypeStore((s) => s.getDisplayName);

const getGreetingKey = (hour: number): string => {
  if (hour < 5) return 'dashboard_greeting_evening';
  if (hour < 11) return 'dashboard_greeting_morning';
  if (hour < 17) return 'dashboard_greeting_afternoon';
  return 'dashboard_greeting_evening';
};

const DashboardPage = () => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale as string;

  const {
    documents,
    meta,
    loading,
    fetchDocuments,
  } = useDocumentStore();

  const { types, loading: typesLoading, fetchTypes } = useDocumentTypeStore();
  const { user } = useUserStore();
  const getDisplayName = useTypeDisplayName();

  const [myDocumentCount, setMyDocumentCount] = useState<number | null>(null);
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    fetchDocuments();
    fetchTypes();
  }, [fetchDocuments, fetchTypes]);

  useEffect(() => {
    if (!user.personId) return;
    let cancelled = false;
    apiService
      .post<ApiResponse<PagedDocumentResponseDto>>('documents/filter', {
        createdBy: user.personId,
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
  }, [user.personId]);

  const recentDocs = useMemo(() => documents.slice(0, 5), [documents]);
  const freshDocs = useMemo(() => documents.slice(0, 6), [documents]);

  // Attention list: owned documents with a near-term action required.
  // Composition lives in `@components/dashboard/attention` — see that module
  // for the signal model and the migration note about moving this upstream
  // when the review workflow (granskningsflöde) lands.
  const { items: attentionItems, loading: attentionLoading } = useAttentionItems(
    user.personId
  );

  const docHref = (regNum: string) => `/${locale}/documents/${regNum}`;

  const now = new Date();
  const greetingKey = getGreetingKey(now.getHours());
  const displayName = user.firstName;
  const greeting = displayName
    ? t(`common:${greetingKey}`, { name: displayName })
    : t('common:dashboard_greeting_fallback');

  const dateLabel = new Intl.DateTimeFormat(i18n.language || 'sv', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now);

  const handleSearchSubmit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    router.push(`/${locale}/documents?q=${encodeURIComponent(trimmed)}`);
  };

  const totalDocs = meta?.totalRecords ?? 0;
  const totalTypes = types.length;
  const countsReady = !loading && !typesLoading && myDocumentCount !== null;
  const hasOwned = (myDocumentCount ?? 0) > 0;

  const countsSentence = countsReady
    ? hasOwned
      ? t('common:dashboard_counts_sentence', {
          total: totalDocs,
          types: totalTypes,
          mine: myDocumentCount,
        })
      : t('common:dashboard_counts_sentence_no_mine', {
          total: totalDocs,
          types: totalTypes,
        })
    : null;

  const isEmptyOverall = !loading && documents.length === 0;

  return (
    <div className="mx-auto w-full max-w-[1320px]">
      {/* Welcome block + search hero */}
      <section aria-labelledby="welcome-heading" className="mb-12 max-w-[62ch]">
        <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground md:mb-6">
          {dateLabel}
        </p>
        <h1
          id="welcome-heading"
          className="font-serif text-[30px] font-normal leading-[1.12] tracking-[-0.015em] text-foreground md:text-[44px]"
        >
          {greeting}
        </h1>
        <p className="mt-4 max-w-[54ch] text-base leading-relaxed text-muted-foreground md:text-[18px] md:leading-[1.55]">
          {t('common:dashboard_intro')}
        </p>

        <div className="mt-8 max-w-[720px] md:mt-9">
          <SearchInput
            name="q"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onSearch={handleSearchSubmit}
            onClear={() => setSearchValue('')}
            placeholder={t('common:dashboard_search_placeholder')}
            shortcut="⌘K"
            className="[&_input]:h-14 [&_input]:rounded-lg [&_input]:bg-card [&_input]:pl-12 [&_input]:text-base [&_input]:md:text-[17px] [&_svg]:h-5 [&_svg]:w-5 [&_svg]:left-4"
            aria-label={t('common:search')}
          />
        </div>

        {countsSentence && (
          <p className="mt-8 max-w-[60ch] font-serif text-[15px] italic leading-relaxed text-muted-foreground md:mt-10 md:text-[15.5px]">
            {countsSentence}
          </p>
        )}
      </section>

      {isEmptyOverall ? (
        <EmptyState
          icon={<FileSearch size={48} />}
          title={t('common:dashboard_no_documents_yet')}
          actionLabel={t('common:dashboard_create_first')}
          onAction={() => router.push(`/${locale}/documents/create`)}
        />
      ) : (
        <div className="mt-4 flex max-w-[860px] flex-col gap-12">
          <AttentionSection
            loading={attentionLoading}
            items={attentionItems ?? []}
            docHref={docHref}
            getDisplayName={getDisplayName}
            emptyText={t('common:dashboard_attention_empty')}
            headingLabel={t('common:dashboard_attention_heading')}
            metaText={
              !attentionItems || attentionItems.length === 0
                ? undefined
                : t('common:dashboard_attention_meta_count', {
                    count: attentionItems.length,
                  })
            }
          />

          <DocListSection
            loading={loading}
            documents={recentDocs}
            docHref={docHref}
            getDisplayName={getDisplayName}
            heading={t('common:dashboard_continue_heading')}
            meta={t('common:dashboard_continue_meta')}
            viewTransitionPrefix="dash-continue"
          />

          <DocListSection
            loading={loading}
            documents={freshDocs}
            docHref={docHref}
            getDisplayName={getDisplayName}
            heading={t('common:dashboard_fresh_heading')}
            meta={t('common:dashboard_fresh_meta')}
            showStatus={false}
            rightLink={{
              href: `/${locale}/documents`,
              label: t('common:dashboard_fresh_view_all'),
            }}
            viewTransitionPrefix="dash-fresh"
          />
        </div>
      )}
    </div>
  );
};

interface DocListSectionProps {
  loading: boolean;
  documents: DocumentDto[];
  docHref: (registrationNumber: string) => string;
  getDisplayName: (type: string) => string;
  heading: string;
  meta: string;
  showStatus?: boolean;
  rightLink?: { href: string; label: string };
  viewTransitionPrefix: string;
}

const DocListSection = ({
  loading,
  documents,
  docHref,
  getDisplayName,
  heading,
  meta,
  showStatus = true,
  rightLink,
  viewTransitionPrefix,
}: DocListSectionProps) => (
  <section>
    <SectionHeader title={heading} meta={meta} rightLink={rightLink} />
    {loading ? (
      <ul className="divide-y divide-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i} className="flex items-center justify-between gap-4 py-3.5">
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-[60%]" />
              <Skeleton className="mt-2 h-3 w-[40%]" />
            </div>
            <Skeleton className="h-4 w-20 shrink-0" />
          </li>
        ))}
      </ul>
    ) : documents.length === 0 ? (
      <p className="max-w-[48ch] py-4 font-serif text-[15px] italic leading-relaxed text-muted-foreground">
        —
      </p>
    ) : (
      <ul className="divide-y divide-border">
        {documents.map((doc) => (
          <DocRow
            key={`${doc.registrationNumber}-r${doc.revision}`}
            doc={doc}
            href={docHref(doc.registrationNumber)}
            typeLabel={getDisplayName(doc.type)}
            showStatus={showStatus}
            viewTransitionPrefix={viewTransitionPrefix}
          />
        ))}
      </ul>
    )}
  </section>
);

interface DocRowProps {
  doc: DocumentDto;
  href: string;
  typeLabel: string;
  showStatus: boolean;
  viewTransitionPrefix: string;
}

const DocRow = ({ doc, href, typeLabel, showStatus, viewTransitionPrefix }: DocRowProps) => {
  const vtName = `${viewTransitionPrefix}-${sanitizeVTName(doc.registrationNumber)}-r${doc.revision}`;
  const department = doc.metadataList?.find((m) => m.key === 'department')?.value;
  const title = getDocumentDisplayTitle(doc);

  return (
    <li>
      <ViewTransition>
        <Link
          href={href}
          className="-mx-3 grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1 rounded-md px-3 py-3.5 text-foreground no-underline transition-colors hover:bg-foreground/[0.04] hover:text-primary focus-visible:bg-foreground/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
          aria-label={`${doc.registrationNumber} – ${title}`}
        >
          <div className="min-w-0">
            <p className="truncate text-[15px] font-medium leading-snug">
              {title}
            </p>
            <p className="mt-1 flex items-center gap-2.5 text-[12.5px] text-muted-foreground">
              <ViewTransition
                name={vtName}
                default="none"
                share={{
                  'nav-forward': 'morph-forward',
                  'nav-back': 'morph-back',
                  default: 'morph',
                }}
              >
                <span className="font-mono tracking-wide">{doc.registrationNumber}</span>
              </ViewTransition>
              <span className="text-border" aria-hidden="true">·</span>
              <span className="truncate">{typeLabel}</span>
              {department && (
                <>
                  <span className="text-border" aria-hidden="true">·</span>
                  <span className="truncate">{department}</span>
                </>
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {showStatus && doc.status && (
              <DocumentStatusBadge status={doc.status} size="sm" />
            )}
            <time
              dateTime={doc.created}
              className="whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground"
            >
              {dayjs(doc.created).format('YYYY-MM-DD')}
            </time>
          </div>
        </Link>
      </ViewTransition>
    </li>
  );
};

export default DashboardPage;
