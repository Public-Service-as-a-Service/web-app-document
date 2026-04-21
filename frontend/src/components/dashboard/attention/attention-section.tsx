'use client';

import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@components/ui/badge';
import { Skeleton } from '@components/ui/skeleton';
import { SectionHeader } from '@components/dashboard/section-header';
import { cn } from '@lib/utils';
import type { AttentionItem, AttentionSignal } from './types';

// Urgency tiers mirror the planned notification thresholds (7/14/30 days).
// Already-expired signals (negative daysLeft) collapse into the top tier.
//
// Colour tokens match `DocumentStatusBadge` so the dashboard reads as one
// visual system: `destructive` ≈ REVOKED, `chart-3` (ochre) ≈ EXPIRED,
// `muted` ≈ DRAFT. Semantic tokens also keep multi-tenant theming intact.
type AttentionUrgency = 'high' | 'medium' | 'low';

const urgencyFor = (daysLeft: number): AttentionUrgency =>
  daysLeft <= 7 ? 'high' : daysLeft <= 14 ? 'medium' : 'low';

const urgencyBadgeClass: Record<AttentionUrgency, string> = {
  high: 'border-destructive/40 bg-destructive/10 text-destructive',
  medium: 'border-chart-3/40 bg-chart-3/10 text-chart-3',
  low: 'border-border bg-muted text-muted-foreground',
};

const urgencyIconClass: Record<AttentionUrgency, string> = {
  high: 'bg-destructive/10 text-destructive dark:bg-destructive/20',
  medium: 'bg-chart-3/15 text-chart-3 dark:bg-chart-3/20',
  low: 'bg-muted text-muted-foreground',
};

const useSignalLabel = () => {
  const { t } = useTranslation();
  return (signal: AttentionSignal): string => {
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
};

export interface AttentionSectionProps {
  loading: boolean;
  items: AttentionItem[];
  docHref: (registrationNumber: string) => string;
  getDisplayName: (type: string) => string;
  emptyText: string;
  headingLabel: string;
  metaText?: string;
}

export const AttentionSection = ({
  loading,
  items,
  docHref,
  getDisplayName,
  emptyText,
  headingLabel,
  metaText,
}: AttentionSectionProps) => {
  const signalLabel = useSignalLabel();

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
                    className={cn(
                      'mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                      urgencyIconClass[urgency]
                    )}
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
                  <Badge
                    variant="outline"
                    className={cn(
                      'shrink-0 self-start font-medium tabular-nums',
                      urgencyBadgeClass[urgency]
                    )}
                  >
                    {signalLabel(signal)}
                  </Badge>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
