'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, FileType2, SlidersHorizontal, UserCircle } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@components/ui/popover';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@components/ui/sheet';
import { useDocumentTypeStore } from '@stores/document-type-store';
import { cn } from '@lib/utils';
import { EmployeeName } from '@components/user-display/employee-name';
import { DepartmentMultiPicker } from './department-multi-picker';
import { ResponsibilitiesInput } from '@components/responsibilities-input/responsibilities-input';
import { DocumentStatusEnum } from '@data-contracts/backend/data-contracts';
import { DOCUMENT_STATUSES } from '@interfaces/document.interface';
import { useDocumentStatusLabel } from '@components/document-status/document-status-badge';
import { type DocumentFiltersValue } from './apply-filters';

export type { DocumentFiltersValue } from './apply-filters';
export {
  emptyDocumentFilters,
  hasActiveFilters,
  hasMatchIncompatibleFilters,
  applyDocumentFilters,
} from './apply-filters';

interface DocumentFiltersProps {
  value: DocumentFiltersValue;
  onChange: (value: DocumentFiltersValue) => void;
  className?: string;
}

export function DocumentFilters({ value, onChange, className }: DocumentFiltersProps) {
  const { t } = useTranslation();
  const { types, fetchTypes, getDisplayName } = useDocumentTypeStore();
  const statusLabel = useDocumentStatusLabel();

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

  const toggleStatus = (status: DocumentStatusEnum) => {
    const next = value.statuses.includes(status)
      ? value.statuses.filter((s) => s !== status)
      : [...value.statuses, status];
    onChange({ ...value, statuses: next });
  };

  const typeCount = value.documentTypes.length;
  const deptCount = value.departments.length;
  const respCount = value.responsibilities.length;
  const statusCount = value.statuses.length;
  const statusIsDefault = statusCount === DOCUMENT_STATUSES.length;

  const typeTriggerLabel = (() => {
    if (typeCount === 0) return t('common:documents_filter_type_all');
    if (typeCount === 1) return getDisplayName(value.documentTypes[0]);
    return t('common:documents_filter_type_label');
  })();

  const statusTriggerLabel = (() => {
    if (statusCount === 0) return t('common:documents_filter_status_none');
    if (statusIsDefault) return t('common:documents_filter_status_all');
    if (statusCount === 1) return statusLabel(value.statuses[0]);
    return t('common:documents_filter_status_label');
  })();

  const activeCount = typeCount + deptCount + respCount + (statusIsDefault ? 0 : statusCount);

  const typeFilterTrigger = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          aria-label={t('common:documents_filter_type_label')}
          className={cn(
            'h-11 w-full justify-start font-normal sm:h-9',
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
  );

  const departmentFilterTrigger = (
    <DepartmentMultiPicker
      value={value.departments}
      onChange={(departments) => onChange({ ...value, departments })}
      countBadge={deptCount > 1 ? deptCount : undefined}
    />
  );

  const statusFilterTrigger = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          aria-label={t('common:documents_filter_status_label')}
          className={cn(
            'h-11 w-full justify-start font-normal sm:h-9',
            statusIsDefault && 'text-muted-foreground',
            !statusIsDefault && 'border-primary/50 text-foreground'
          )}
        >
          <Activity size={16} className="mr-2 shrink-0" aria-hidden="true" />
          <span className="truncate">{statusTriggerLabel}</span>
          {!statusIsDefault && statusCount > 1 && (
            <Badge variant="secondary" className="ml-2 h-5 px-1.5">
              {statusCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[200px]"
      >
        {DOCUMENT_STATUSES.map((status) => (
          <DropdownMenuCheckboxItem
            key={status}
            checked={value.statuses.includes(status)}
            onCheckedChange={() => toggleStatus(status)}
            onSelect={(e) => e.preventDefault()}
          >
            {statusLabel(status)}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const responsibilityFilterTrigger = (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-label={t('common:documents_filter_responsibilities')}
          className={cn(
            'h-11 w-full justify-start font-normal sm:h-9',
            respCount === 0 && 'text-muted-foreground',
            respCount > 0 && 'border-primary/50 text-foreground'
          )}
        >
          <UserCircle size={16} className="mr-2 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {respCount === 0 ? (
              t('common:documents_filter_responsibilities_all')
            ) : respCount === 1 ? (
              <EmployeeName personId={value.responsibilities[0]} />
            ) : (
              t('common:documents_filter_responsibilities')
            )}
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
            showAddButton={false}
          />
        </div>
      </PopoverContent>
    </Popover>
  );

  return (
    <>
      <div className={cn('hidden gap-2 md:grid md:grid-cols-2 xl:grid-cols-4', className)}>
        {typeFilterTrigger}
        {departmentFilterTrigger}
        {statusFilterTrigger}
        {responsibilityFilterTrigger}
      </div>

      <div className={cn('md:hidden', className)}>
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              aria-label={t('common:documents_filter_open')}
              className={cn(
                'h-11 w-full justify-between font-normal',
                activeCount === 0 && 'text-muted-foreground',
                activeCount > 0 && 'border-primary/50 text-foreground'
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <SlidersHorizontal size={16} className="shrink-0" aria-hidden="true" />
                <span className="truncate">{t('common:documents_filter_mobile_trigger')}</span>
              </span>
              {activeCount > 0 && (
                <Badge variant="secondary" className="h-5 shrink-0 px-1.5">
                  {activeCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[88svh] rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>{t('common:documents_filter_mobile_trigger')}</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-3 overflow-y-auto px-4 pb-2">
              {typeFilterTrigger}
              {departmentFilterTrigger}
              {statusFilterTrigger}
              {responsibilityFilterTrigger}
            </div>
            <SheetFooter>
              <SheetClose asChild>
                <Button className="h-11 w-full">{t('common:documents_filter_apply')}</Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
