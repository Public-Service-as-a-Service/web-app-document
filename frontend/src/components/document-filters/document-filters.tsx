'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FileType2, UserCircle, X } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@components/ui/popover';
import { useDocumentTypeStore } from '@stores/document-type-store';
import { cn } from '@lib/utils';
import { DepartmentMultiPicker } from './department-multi-picker';
import { ResponsibilitiesInput } from '@components/responsibilities-input/responsibilities-input';
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

  const typeCount = value.documentTypes.length;
  const deptCount = value.departments.length;
  const respCount = value.responsibilities.length;

  const typeTriggerLabel = (() => {
    if (typeCount === 0) return t('common:documents_filter_type_all');
    if (typeCount === 1) return getDisplayName(value.documentTypes[0]);
    return t('common:documents_filter_type_label');
  })();

  const active = hasActiveFilters(value);

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <div className="min-w-[180px] max-w-[260px] flex-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              aria-label={t('common:documents_filter_type_label')}
              className={cn(
                'w-full justify-start font-normal',
                typeCount === 0 && 'text-muted-foreground',
                typeCount > 0 && 'border-primary/50 text-foreground'
              )}
            >
              <FileType2 size={16} className="mr-2 shrink-0" aria-hidden="true" />
              <span className="truncate">{typeTriggerLabel}</span>
              {typeCount > 1 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                  {typeCount}
                </Badge>
              )}
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
          countBadge={deptCount > 1 ? deptCount : undefined}
        />
      </div>

      <div className="min-w-[180px] max-w-[260px] flex-1">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              aria-label={t('common:documents_filter_responsibilities')}
              className={cn(
                'w-full justify-start font-normal',
                respCount === 0 && 'text-muted-foreground',
                respCount > 0 && 'border-primary/50 text-foreground'
              )}
            >
              <UserCircle size={16} className="mr-2 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {respCount === 0
                  ? t('common:documents_filter_responsibilities_all')
                  : respCount === 1
                    ? value.responsibilities[0]
                    : t('common:documents_filter_responsibilities')}
              </span>
              {respCount > 1 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                  {respCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[260px]">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('common:documents_filter_responsibilities')}
              </p>
              <ResponsibilitiesInput
                value={value.responsibilities}
                onChange={(responsibilities) => onChange({ ...value, responsibilities })}
                placeholder={t('common:documents_filter_responsibilities_placeholder')}
                validateUser
              />
            </div>
          </PopoverContent>
        </Popover>
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
