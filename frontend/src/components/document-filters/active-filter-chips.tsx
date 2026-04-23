'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, FileType2, Building2, UserCircle, X } from 'lucide-react';
import { cn } from '@lib/utils';
import { EmployeeName } from '@components/user-display/employee-name';
import { DocumentStatusEnum } from '@data-contracts/backend/data-contracts';
import { useDocumentStatusLabel } from '@components/document-status/document-status-badge';
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
  const statusLabel = useDocumentStatusLabel();

  // Status chips always reflect the current selection so the default lifecycle
  // subset is visible rather than hidden. The row renders whenever any filter
  // is active (including the default status set).
  const statusChips = value.statuses;

  const totalActive =
    value.documentTypes.length +
    value.departments.length +
    value.responsibilities.length +
    statusChips.length;
  if (totalActive === 0) return null;

  const removeType = (type: string) =>
    onChange({ ...value, documentTypes: value.documentTypes.filter((t) => t !== type) });
  const removeDept = (orgId: number) =>
    onChange({ ...value, departments: value.departments.filter((d) => d.orgId !== orgId) });
  const removeResponsibility = (personId: string) =>
    onChange({
      ...value,
      responsibilities: value.responsibilities.filter((id) => id !== personId),
    });
  const removeStatus = (status: DocumentStatusEnum) =>
    onChange({
      ...value,
      statuses: value.statuses.filter((s) => s !== status),
    });

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
        {value.responsibilities.map((personId) => (
          <li key={`resp-${personId}`} className="chip-enter">
            <FilterChip
              icon={<UserCircle size={12} />}
              label={<EmployeeName personId={personId} />}
              onRemove={() => removeResponsibility(personId)}
              ariaRemoveLabel={t('common:documents_filter_chip_remove', { label: personId })}
            />
          </li>
        ))}
        {statusChips.map((status) => {
          const label = statusLabel(status);
          return (
            <li key={`status-${status}`} className="chip-enter">
              <FilterChip
                icon={<Activity size={12} />}
                label={label}
                onRemove={() => removeStatus(status)}
                ariaRemoveLabel={t('common:documents_filter_chip_remove', { label })}
              />
            </li>
          );
        })}
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
  label: React.ReactNode;
  onRemove: () => void;
  ariaRemoveLabel: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground shadow-sm">
      <span className="text-muted-foreground">{icon}</span>
      <span className="inline-flex max-w-[160px] items-center truncate">{label}</span>
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
