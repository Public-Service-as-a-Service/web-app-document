'use client';

import type {} from 'react/canary';

import { useEffect, useMemo, useState, ViewTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ChevronRight, FileSearch } from 'lucide-react';
import { useDocumentStore } from '@stores/document-store';
import { useDocumentTypeStore } from '@stores/document-type-store';
import { useUserStore } from '@stores/user-store';
import { apiService, ApiResponse } from '@services/api-service';
import EmptyState from '@components/empty-state/empty-state';
import { SearchInput } from '@components/ui/search-input';
import { DocumentStatusBadge } from '@components/document-status/document-status-badge';
import { Skeleton } from '@components/ui/skeleton';
import { sanitizeVTName } from '@lib/utils';
import type {
  DocumentDto,
  PagedDocumentResponseDto,
} from '@data-contracts/backend/data-contracts';
import dayjs from 'dayjs';

const useTypeDisplayName = () => useDocumentTypeStore((s) => s.getDisplayName);

// Threshold for the dashboard attention list. Matches the coarsest tier of
// the planned 30/14/7-day review-workflow notifications; see the comment on
// the attention fetch in DashboardPage for migration intent.
const ATTENTION_WINDOW_DAYS = 30;

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

  // --- Attention list: owned documents with a near-term action required. ---
  //
  // Two orthogonal signals are composed here:
  //   1. The document's own `validTo` is inside ATTENTION_WINDOW_DAYS.
  //   2. A responsibility holder on the document has an employment `endDate`
  //      that is past or inside the same window — i.e. the person is about
  //      to leave (or has left), so the document needs a new owner before
  //      the hand-off becomes an outage.
  //
  // Temporary frontend composition. The long-term home is upstream: when the
  // granskningsflöde (review workflow) lands in api-service-document, a
  // scheduled job there should emit actionable events at 30/14/7-day
  // thresholds — covering validTo, review date, AND responsible-holder
  // employment — and the frontend's job reduces to rendering a feed. At that
  // point, delete this effect, the AttentionSignal/AttentionItem types, the
  // employment fetch, and ATTENTION_WINDOW_DAYS.
  const [attentionItems, setAttentionItems] = useState<AttentionItem[] | null>(null);

  useEffect(() => {
    if (!user.personId) return;
    let cancelled = false;

    (async () => {
      const docsRes = await apiService.post<ApiResponse<PagedDocumentResponseDto>>(
        'documents/filter',
        {
          createdBy: user.personId,
          statuses: ['ACTIVE', 'SCHEDULED'],
          onlyLatestRevision: true,
          page: 1,
          limit: 50,
          sortBy: ['validTo'],
          sortDirection: 'ASC',
        }
      );
      if (cancelled) return;
      const docs = docsRes.data.data.documents ?? [];

      // Unique responsibility personIds across all owned docs. One request per
      // person — typical dashboards have a handful, so N+1 is acceptable until
      // the upstream feed replaces this.
      const personIds = Array.from(
        new Set(docs.flatMap((d) => d.responsibilities?.map((r) => r.personId) ?? []))
      );

      const personInfoEntries = await Promise.all(
        personIds.map(async (pid): Promise<[string, ResponsiblePersonInfo]> => {
          try {
            const res = await apiService.get<ApiResponse<EmploymentPerson[]>>(
              `employees/by-personid/${encodeURIComponent(pid)}/employments`
            );
            return [pid, summarisePerson(res.data.data)];
          } catch {
            return [pid, { maxEndDate: null, name: '' }];
          }
        })
      );
      if (cancelled) return;
      const personInfo = new Map(personInfoEntries);

      setAttentionItems(buildAttentionItems(docs, personInfo).slice(0, 4));
    })().catch(() => {
      if (!cancelled) setAttentionItems([]);
    });

    return () => {
      cancelled = true;
    };
  }, [user.personId]);

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

  const sampleQueries =
    i18n.language === 'en'
      ? ['policy', 'procedure', 'guideline', 'HR']
      : ['policy', 'riktlinje', 'rutin', 'anställning'];

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
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-muted-foreground">
            <span>{t('common:dashboard_search_try')}</span>
            {sampleQueries.map((q) => (
              <Link
                key={q}
                href={`/${locale}/documents?q=${encodeURIComponent(q)}`}
                className="rounded-sm text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {q}
              </Link>
            ))}
          </div>
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
            loading={attentionItems === null}
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

interface SectionHeaderProps {
  title: string;
  meta?: string;
  rightLink?: { href: string; label: string };
}

const SectionHeader = ({ title, meta, rightLink }: SectionHeaderProps) => (
  <div className="mb-1.5 flex items-baseline justify-between gap-4 border-b border-border pb-2.5">
    <div>
      <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
      {meta && <p className="mt-1 text-[12.5px] text-muted-foreground">{meta}</p>}
    </div>
    {rightLink && (
      <Link
        href={rightLink.href}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-sm text-[13px] text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {rightLink.label}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    )}
  </div>
);

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
  const title = doc.description?.length
    ? doc.description
    : doc.registrationNumber;

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

// Minimal shape of the upstream employments response (array of persons, each
// with 0..N employment records). Mirrors backend `Employeev2` but keeps only
// the fields the dashboard actually touches.
interface EmploymentRecord {
  endDate?: string | null;
}

interface EmploymentPerson {
  givenname?: string | null;
  lastname?: string | null;
  employments?: EmploymentRecord[] | null;
}

interface ResponsiblePersonInfo {
  // The latest (max) endDate across all of the person's employments. If the
  // person's latest engagement is in the past they're considered gone; if it
  // is inside the attention window they're considered leaving. `null` means
  // no endDate is known — treat as stable.
  maxEndDate: string | null;
  name: string;
}

// Signal describing why a document ended up on the attention list. Only the
// most urgent signal per document is surfaced to the UI.
type AttentionSignal =
  | { kind: 'validTo'; daysLeft: number }
  | { kind: 'responsible'; daysLeft: number; personName: string };

interface AttentionItem {
  doc: DocumentDto;
  signal: AttentionSignal;
}

const summarisePerson = (records: EmploymentPerson[]): ResponsiblePersonInfo => {
  const first = records[0];
  const name = first
    ? `${first.givenname ?? ''} ${first.lastname ?? ''}`.trim()
    : '';
  const endDates = records
    .flatMap((p) => p.employments ?? [])
    .map((e) => e.endDate)
    .filter((d): d is string => !!d);
  if (endDates.length === 0) return { maxEndDate: null, name };
  const maxEndDate = endDates.reduce((a, b) =>
    dayjs(a).isAfter(dayjs(b)) ? a : b
  );
  return { maxEndDate, name };
};

// Whole calendar days between today (local) and `iso`. May be negative when
// `iso` is in the past — used to distinguish "already expired" from "soon".
const diffDays = (iso: string): number =>
  dayjs(iso).startOf('day').diff(dayjs().startOf('day'), 'day');

const buildAttentionItems = (
  docs: DocumentDto[],
  personInfo: Map<string, ResponsiblePersonInfo>
): AttentionItem[] => {
  const now = dayjs();
  const cutoff = now.add(ATTENTION_WINDOW_DAYS, 'day');

  const items: AttentionItem[] = [];
  for (const doc of docs) {
    const signals: AttentionSignal[] = [];

    if (doc.validTo) {
      const vt = dayjs(doc.validTo);
      if (!vt.isBefore(now) && vt.isBefore(cutoff)) {
        signals.push({ kind: 'validTo', daysLeft: Math.max(0, diffDays(doc.validTo)) });
      }
    }

    for (const r of doc.responsibilities ?? []) {
      const info = personInfo.get(r.personId);
      if (!info?.maxEndDate) continue;
      const ed = dayjs(info.maxEndDate);
      if (ed.isBefore(cutoff)) {
        signals.push({
          kind: 'responsible',
          daysLeft: diffDays(info.maxEndDate),
          personName: info.name,
        });
      }
    }

    if (signals.length === 0) continue;
    signals.sort((a, b) => a.daysLeft - b.daysLeft);
    items.push({ doc, signal: signals[0] });
  }

  items.sort((a, b) => a.signal.daysLeft - b.signal.daysLeft);
  return items;
};

interface AttentionSectionProps {
  loading: boolean;
  items: AttentionItem[];
  docHref: (registrationNumber: string) => string;
  getDisplayName: (type: string) => string;
  emptyText: string;
  headingLabel: string;
  metaText?: string;
}

// Urgency tiers mirror the planned notification thresholds (7/14/30 days).
// Already-expired signals (negative daysLeft) collapse into the top tier.
type AttentionUrgency = 'high' | 'medium' | 'low';

const urgencyFor = (daysLeft: number): AttentionUrgency =>
  daysLeft <= 7 ? 'high' : daysLeft <= 14 ? 'medium' : 'low';

const urgencyTextClass: Record<AttentionUrgency, string> = {
  high: 'text-destructive',
  medium: 'text-amber-700 dark:text-amber-400',
  low: 'text-muted-foreground',
};

const urgencyIconClass: Record<AttentionUrgency, string> = {
  high: 'bg-destructive/10 text-destructive dark:bg-destructive/20',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400',
  low: 'bg-muted text-muted-foreground',
};

const signalLabel = (
  signal: AttentionSignal,
  t: ReturnType<typeof useTranslation>['t']
): string => {
  if (signal.kind === 'validTo') {
    return signal.daysLeft === 0
      ? t('common:dashboard_attention_expires_today')
      : t('common:dashboard_attention_expires_in', { count: signal.daysLeft });
  }
  const { daysLeft, personName } = signal;
  const name = personName || t('common:dashboard_attention_responsible_fallback');
  if (daysLeft < 0) {
    return t('common:dashboard_attention_responsible_expired', { name });
  }
  if (daysLeft === 0) {
    return t('common:dashboard_attention_responsible_expires_today', { name });
  }
  return t('common:dashboard_attention_responsible_expires_in', {
    name,
    count: daysLeft,
  });
};

const AttentionSection = ({
  loading,
  items,
  docHref,
  getDisplayName,
  emptyText,
  headingLabel,
  metaText,
}: AttentionSectionProps) => {
  const { t } = useTranslation();

  return (
    <section>
      <SectionHeader title={headingLabel} meta={metaText} />
      {loading ? (
        <ul className="divide-y divide-border">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="flex items-start gap-3.5 py-3.5">
              <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-[60%]" />
                <Skeleton className="mt-2 h-3 w-[40%]" />
              </div>
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <p className="max-w-[48ch] py-5 font-serif text-[15px] italic leading-relaxed text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map(({ doc, signal }) => {
            const urgency = urgencyFor(signal.daysLeft);
            return (
              <li key={`${doc.registrationNumber}-r${doc.revision}`}>
                <Link
                  href={docHref(doc.registrationNumber)}
                  className="-mx-3 grid grid-cols-[auto_1fr_auto] items-start gap-3.5 rounded-md px-3 py-3.5 no-underline transition-colors hover:bg-foreground/[0.04] hover:text-primary focus-visible:bg-foreground/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
                >
                  <span
                    aria-hidden="true"
                    className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${urgencyIconClass[urgency]}`}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-medium leading-snug text-foreground">
                      {doc.description || doc.registrationNumber}
                    </p>
                    <p className="mt-1 text-[13px] text-muted-foreground">
                      <span className="font-mono tracking-wide">{doc.registrationNumber}</span>
                      <span className="mx-2 text-border" aria-hidden="true">·</span>
                      <span>{getDisplayName(doc.type)}</span>
                    </p>
                  </div>
                  <span
                    className={`shrink-0 self-start whitespace-nowrap text-[12.5px] font-medium tabular-nums ${urgencyTextClass[urgency]}`}
                  >
                    {signalLabel(signal, t)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default DashboardPage;
