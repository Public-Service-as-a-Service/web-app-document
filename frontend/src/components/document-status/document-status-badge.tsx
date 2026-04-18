'use client';

import { useTranslation } from 'react-i18next';
import { CheckCircle2, Clock, FileEdit, Hourglass, Ban, type LucideIcon } from 'lucide-react';
import { Badge } from '@components/ui/badge';
import { cn } from '@lib/utils';
import { DocumentStatusEnum } from '@data-contracts/backend/data-contracts';

interface StatusConfig {
  className: string;
  Icon: LucideIcon;
  i18nKey: string;
}

// Semantic tokens only — keeps light/dark mode and tenant overrides consistent.
const STATUS_CONFIG: Record<DocumentStatusEnum, StatusConfig> = {
  [DocumentStatusEnum.DRAFT]: {
    className: 'border-border bg-muted text-muted-foreground',
    Icon: FileEdit,
    i18nKey: 'common:document_status_draft',
  },
  [DocumentStatusEnum.SCHEDULED]: {
    className: 'border-primary/40 bg-primary/10 text-primary',
    Icon: Clock,
    i18nKey: 'common:document_status_scheduled',
  },
  [DocumentStatusEnum.ACTIVE]: {
    className: 'border-chart-2/40 bg-chart-2/10 text-chart-2',
    Icon: CheckCircle2,
    i18nKey: 'common:document_status_active',
  },
  [DocumentStatusEnum.EXPIRED]: {
    className: 'border-chart-3/40 bg-chart-3/10 text-chart-3',
    Icon: Hourglass,
    i18nKey: 'common:document_status_expired',
  },
  [DocumentStatusEnum.REVOKED]: {
    className: 'border-destructive/40 bg-destructive/10 text-destructive',
    Icon: Ban,
    i18nKey: 'common:document_status_revoked',
  },
};

const getStatusConfig = (
  status: DocumentStatusEnum | string | undefined
): StatusConfig | undefined => {
  if (!status) return undefined;
  return STATUS_CONFIG[status as DocumentStatusEnum];
};

export const useDocumentStatusLabel = () => {
  const { t } = useTranslation();
  return (status: DocumentStatusEnum | string | undefined) => {
    const config = getStatusConfig(status);
    return config ? t(config.i18nKey) : t('common:document_status_unknown');
  };
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
  const config = getStatusConfig(status);
  if (!config) return null;
  const label = t(config.i18nKey);
  const Icon = config.Icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium',
        size === 'md' && 'h-6 px-2 text-xs',
        config.className,
        className
      )}
    >
      {showIcon && Icon ? <Icon size={11} className="mr-1" aria-hidden="true" /> : null}
      {label}
    </Badge>
  );
};
