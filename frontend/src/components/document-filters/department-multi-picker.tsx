'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Check, X } from 'lucide-react';
import { Button } from '@components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@components/ui/dialog';
import { SearchInput } from '@components/ui/search-input';
import { ScrollArea } from '@components/ui/scroll-area';
import { useOrganizationStore } from '@stores/organization-store';
import { HighlightText } from '@components/org-tree/org-tree-view';
import { cn } from '@lib/utils';
import type { OrgNode } from '@interfaces/company.interface';

export interface SelectedDepartment {
  orgId: number;
  orgName: string;
}

interface DepartmentMultiPickerProps {
  value: SelectedDepartment[];
  onChange: (value: SelectedDepartment[]) => void;
  placeholder?: string;
  className?: string;
}

export function DepartmentMultiPicker({
  value,
  onChange,
  placeholder,
  className,
}: DepartmentMultiPickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { flatNodes, fetchOrgTree, loading } = useOrganizationStore();

  useEffect(() => {
    if (flatNodes.length === 0 && !loading) {
      fetchOrgTree();
    }
  }, [flatNodes.length, loading, fetchOrgTree]);

  const selectedIds = useMemo(() => new Set(value.map((d) => d.orgId)), [value]);

  const filtered = useMemo(() => {
    if (!search) return flatNodes;
    const lower = search.toLowerCase();
    return flatNodes.filter((n) => n.orgName.toLowerCase().includes(lower));
  }, [flatNodes, search]);

  const toggleNode = (node: OrgNode) => {
    if (selectedIds.has(node.orgId)) {
      onChange(value.filter((d) => d.orgId !== node.orgId));
    } else {
      onChange([...value, { orgId: node.orgId, orgName: node.orgName }]);
    }
  };

  const triggerLabel = (() => {
    if (value.length === 0) {
      return placeholder || t('common:documents_filter_department_all');
    }
    if (value.length === 1) return value[0].orgName;
    return t('common:documents_filter_selected_count', { count: value.length });
  })();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start font-normal',
            value.length === 0 && 'text-muted-foreground',
            className
          )}
        >
          <Building2 size={16} className="mr-2 shrink-0" />
          <span className="truncate">{triggerLabel}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('common:documents_filter_department_label')}</DialogTitle>
        </DialogHeader>
        <SearchInput
          placeholder={t('common:org_search_placeholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch('')}
        />
        {value.length > 0 && (
          <div className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-2 text-sm">
            <span className="text-muted-foreground">
              {t('common:documents_filter_selected_count', { count: value.length })}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => onChange([])}
            >
              <X className="mr-1 h-3 w-3" />
              {t('common:documents_filter_clear')}
            </Button>
          </div>
        )}
        <ScrollArea className="h-72">
          <div className="flex flex-col gap-0.5">
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {t('common:org_no_results')}
              </p>
            ) : (
              filtered.map((node) => {
                const isSelected = selectedIds.has(node.orgId);
                return (
                  <button
                    key={node.orgId}
                    type="button"
                    onClick={() => toggleNode(node)}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
                      isSelected && 'bg-primary/10 font-semibold text-primary'
                    )}
                    style={{
                      paddingLeft: `${(node.treeLevel || 0) * 16 + 12}px`,
                    }}
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input'
                      )}
                      aria-hidden
                    >
                      {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                    <HighlightText text={node.orgName} query={search} />
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
