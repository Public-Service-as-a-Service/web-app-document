'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2 } from 'lucide-react';
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
import type { OrgNodeDto } from '@data-contracts/backend/data-contracts';

interface DepartmentPickerProps {
  value: { orgId: number; orgName: string } | null;
  onChange: (dept: { orgId: number; orgName: string } | null) => void;
  placeholder?: string;
}

export function DepartmentPicker({ value, onChange, placeholder }: DepartmentPickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { flatNodes, fetchOrgTree, loading } = useOrganizationStore();

  useEffect(() => {
    if (flatNodes.length === 0 && !loading) {
      fetchOrgTree();
    }
  }, [flatNodes.length, loading, fetchOrgTree]);

  const filtered = useMemo(() => {
    if (!search) return flatNodes;
    const lower = search.toLowerCase();
    return flatNodes.filter((n) => n.orgName.toLowerCase().includes(lower));
  }, [flatNodes, search]);

  const handleSelect = (node: OrgNodeDto) => {
    onChange({ orgId: node.orgId, orgName: node.orgName });
    setOpen(false);
    setSearch('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={cn('w-full justify-start font-normal', !value && 'text-muted-foreground')}
        >
          <Building2 size={16} className="mr-2 shrink-0" />
          {value
            ? value.orgName
            : placeholder || t('common:document_create_department_placeholder')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('common:document_create_department_label')}</DialogTitle>
        </DialogHeader>
        <SearchInput
          placeholder={t('common:org_search_placeholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch('')}
        />
        <ScrollArea className="h-72">
          <div className="flex flex-col gap-0.5">
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {t('common:org_no_results')}
              </p>
            ) : (
              filtered.map((node) => (
                <button
                  key={node.orgId}
                  type="button"
                  onClick={() => handleSelect(node)}
                  className={cn(
                    'rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
                    value?.orgId === node.orgId && 'bg-primary/10 font-semibold text-primary'
                  )}
                  style={{
                    paddingLeft: `${(node.treeLevel || 0) * 16 + 12}px`,
                  }}
                >
                  <HighlightText text={node.orgName} query={search} />
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
