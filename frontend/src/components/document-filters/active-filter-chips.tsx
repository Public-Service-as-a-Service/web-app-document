'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { FileType2, Building2, X } from 'lucide-react';
import { cn } from '@lib/utils';
import type { DocumentFiltersValue } from './apply-filters';

interface ActiveFilterChipsProps {
  value: DocumentFiltersValue;
  onChange: (next: DocumentFiltersValue) => void;
  getTypeLabel: (type: string) => string;
  onClearAll?: () => void;
  className?: string;
}

export function ActiveFilterChips({
  value,
  onChange,
  getTypeLabel,
  onClearAll,
  className,
}: ActiveFilterChipsProps) {
  const { t } = useTranslation();
  const totalActive = value.documentTypes.length + value.departments.length;
  if (totalActive === 0) return null;

  const removeType = (type: string) =>
    onChange({ ...value, documentTypes: value.documentTypes.filter((t) => t !== type) });
  const removeDept = (orgId: number) =>
    onChange({ ...value, departments: value.departments.filter((d) => d.orgId !== orgId) });

  return (
    <div
      className={cn('flex flex-wrap items-center gap-2', className)}
      role="region"
      aria-label={t('common:documents_filter_active_heading')}
    >
      <span className="text-xs font-medium text-muted-foreground">
        {t('common:documents_filter_active_heading')}:
      </span>
      <ul className="flex flex-wrap items-center gap-1.5" role="list">
        {value.documentTypes.map((type) => (
          <li key={`type-${type}`} className="chip-enter">
            <FilterChip
              icon={<FileType2 size={12} />}
              label={getTypeLabel(type)}
              onRemove={() => removeType(type)}
              ariaRemoveLabel={t('common:documents_filter_chip_remove', {
                label: getTypeLabel(type),
              })}
            />
          </li>
        ))}
        {value.departments.map((dept) => (
          <li key={`dept-${dept.orgId}`} className="chip-enter">
            <FilterChip
              icon={<Building2 size={12} />}
              label={dept.orgName}
              onRemove={() => removeDept(dept.orgId)}
              ariaRemoveLabel={t('common:documents_filter_chip_remove', { label: dept.orgName })}
            />
          </li>
        ))}
      </ul>
      {onClearAll && (
        <button
          type="button"
          onClick={onClearAll}
          className="ml-1 text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
        >
          {t('common:documents_filter_clear_all')}
        </button>
      )}
    </div>
  );
}

function FilterChip({
  icon,
  label,
  onRemove,
  ariaRemoveLabel,
}: {
  icon: React.ReactNode;
  label: string;
  onRemove: () => void;
  ariaRemoveLabel: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground shadow-sm">
      <span className="text-muted-foreground">{icon}</span>
      <span className="max-w-[160px] truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={ariaRemoveLabel}
        className="-mr-1 inline-flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X size={12} />
      </button>
    </span>
  );
}
