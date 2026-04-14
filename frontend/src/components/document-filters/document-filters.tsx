'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FileType2, X } from 'lucide-react';
import { Button } from '@components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@components/ui/dropdown-menu';
import { useDocumentTypeStore } from '@stores/document-type-store';
import { cn } from '@lib/utils';
import { DepartmentMultiPicker } from './department-multi-picker';
import {
  type DocumentFiltersValue,
  emptyDocumentFilters,
  hasActiveFilters,
} from './apply-filters';

export type { DocumentFiltersValue } from './apply-filters';
export { emptyDocumentFilters, hasActiveFilters, applyDocumentFilters } from './apply-filters';

interface DocumentFiltersProps {
  value: DocumentFiltersValue;
  onChange: (value: DocumentFiltersValue) => void;
  className?: string;
}

export function DocumentFilters({ value, onChange, className }: DocumentFiltersProps) {
  const { t } = useTranslation();
  const { types, fetchTypes, getDisplayName } = useDocumentTypeStore();

  useEffect(() => {
    if (types.length === 0) {
      fetchTypes();
    }
  }, [types.length, fetchTypes]);

  const toggleType = (type: string) => {
    if (value.documentTypes.includes(type)) {
      onChange({ ...value, documentTypes: value.documentTypes.filter((t) => t !== type) });
    } else {
      onChange({ ...value, documentTypes: [...value.documentTypes, type] });
    }
  };

  const typeTriggerLabel = (() => {
    if (value.documentTypes.length === 0) {
      return t('common:documents_filter_type_all');
    }
    if (value.documentTypes.length === 1) {
      return getDisplayName(value.documentTypes[0]);
    }
    return t('common:documents_filter_selected_count', { count: value.documentTypes.length });
  })();

  const active = hasActiveFilters(value);

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <div className="min-w-[180px] max-w-[260px] flex-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start font-normal',
                value.documentTypes.length === 0 && 'text-muted-foreground'
              )}
            >
              <FileType2 size={16} className="mr-2 shrink-0" />
              <span className="truncate">{typeTriggerLabel}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="max-h-72 w-[var(--radix-dropdown-menu-trigger-width)] min-w-[220px]"
          >
            {types.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                {t('common:documents_filter_type_empty')}
              </p>
            ) : (
              types.map((type) => (
                <DropdownMenuCheckboxItem
                  key={type.type}
                  checked={value.documentTypes.includes(type.type)}
                  onCheckedChange={() => toggleType(type.type)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {type.displayName}
                </DropdownMenuCheckboxItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="min-w-[180px] max-w-[260px] flex-1">
        <DepartmentMultiPicker
          value={value.departments}
          onChange={(departments) => onChange({ ...value, departments })}
        />
      </div>

      {active && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(emptyDocumentFilters)}
          className="text-muted-foreground"
        >
          <X className="mr-1 h-4 w-4" />
          {t('common:documents_filter_clear_all')}
        </Button>
      )}
    </div>
  );
}
