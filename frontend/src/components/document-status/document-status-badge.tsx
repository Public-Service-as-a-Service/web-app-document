'use client';

import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import { CheckCircle2, Clock, FileEdit, Hourglass, Ban } from 'lucide-react';
import { Badge } from '@components/ui/badge';
import { cn } from '@lib/utils';
import { DocumentStatusEnum } from '@data-contracts/backend/data-contracts';

interface StatusTheme {
  className: string;
  Icon: typeof CheckCircle2;
}

const STATUS_THEME: Record<DocumentStatusEnum, StatusTheme> = {
  [DocumentStatusEnum.DRAFT]: {
    className: 'border-slate-400/50 bg-slate-500/10 text-slate-700 dark:text-slate-300',
    Icon: FileEdit,
  },
  [DocumentStatusEnum.SCHEDULED]: {
    className: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    Icon: Clock,
  },
  [DocumentStatusEnum.ACTIVE]: {
    className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    Icon: CheckCircle2,
  },
  [DocumentStatusEnum.EXPIRED]: {
    className: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    Icon: Hourglass,
  },
  [DocumentStatusEnum.REVOKED]: {
    className: 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300',
    Icon: Ban,
  },
};

const STATUS_I18N_KEY: Record<DocumentStatusEnum, string> = {
  [DocumentStatusEnum.DRAFT]: 'common:document_status_draft',
  [DocumentStatusEnum.SCHEDULED]: 'common:document_status_scheduled',
  [DocumentStatusEnum.ACTIVE]: 'common:document_status_active',
  [DocumentStatusEnum.EXPIRED]: 'common:document_status_expired',
  [DocumentStatusEnum.REVOKED]: 'common:document_status_revoked',
};

export const useDocumentStatusLabel = () => {
  const { t } = useTranslation();
  return useMemo(
    () => (status: DocumentStatusEnum | string | undefined) => {
      if (status && (STATUS_I18N_KEY as Record<string, string>)[status]) {
        return t((STATUS_I18N_KEY as Record<string, string>)[status]);
      }
      return t('common:document_status_unknown');
    },
    [t]
  );
};

interface DocumentStatusBadgeProps {
  status?: DocumentStatusEnum | string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

export const DocumentStatusBadge = ({
  status,
  size = 'sm',
  showIcon = true,
  className,
}: DocumentStatusBadgeProps) => {
  const { t } = useTranslation();
  const theme = status ? STATUS_THEME[status as DocumentStatusEnum] : undefined;
  const labelKey = status
    ? (STATUS_I18N_KEY as Record<string, string>)[status]
    : undefined;
  const label = labelKey ? t(labelKey) : t('common:document_status_unknown');
  const Icon = theme?.Icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium',
        size === 'md' && 'h-6 px-2 text-xs',
        theme?.className ?? 'border-border bg-muted text-muted-foreground',
        className
      )}
    >
      {showIcon && Icon ? <Icon size={11} className="mr-1" aria-hidden="true" /> : null}
      {label}
    </Badge>
  );
};
