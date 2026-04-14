'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { useOrganizationStore } from '@stores/organization-store';
import { useDocumentTypeStore } from '@stores/document-type-store';
import { OrgTreeView } from '@components/org-tree/org-tree-view';
import { DepartmentDocuments } from '@components/org-tree/department-documents';
import { SearchInput } from '@components/ui/search-input';
import { ScrollArea } from '@components/ui/scroll-area';
import { Skeleton } from '@components/ui/skeleton';
import EmptyState from '@components/empty-state/empty-state';

export default function OrganizationPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'sv';

  const {
    orgTrees,
    loading,
    error,
    selectedOrgId,
    selectedOrgName,
    searchQuery,
    fetchOrgTree,
    setSelectedOrg,
    setSearchQuery,
  } = useOrganizationStore();

  const { fetchTypes } = useDocumentTypeStore();

  useEffect(() => {
    fetchOrgTree();
    fetchTypes();
  }, [fetchOrgTree, fetchTypes]);

  // URL is source of truth for selected department
  useEffect(() => {
    const deptParam = searchParams.get('dept');
    const nameParam = searchParams.get('name');
    if (deptParam && Number(deptParam) !== selectedOrgId) {
      setSelectedOrg(Number(deptParam), nameParam);
    } else if (!deptParam && selectedOrgId) {
      setSelectedOrg(null, null);
    }
  }, [searchParams, selectedOrgId, setSelectedOrg]);

  const handleSelect = (orgId: number, orgName: string) => {
    setSelectedOrg(orgId, orgName);
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('dept', String(orgId));
    newParams.set('name', orgName);
    router.replace(`/${locale}/organization?${newParams.toString()}`, { scroll: false });
  };

  return (
    <div className="mx-auto max-w-7xl">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">{t('common:org_title')}</h1>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {t('common:org_error')}
        </div>
      )}

      <div className="flex gap-6">
        {/* Left: Org tree */}
        <div className="w-80 shrink-0">
          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border p-3">
              <SearchInput
                placeholder={t('common:org_search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
              />
            </div>

            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="p-2">
                {loading ? (
                  <div className="space-y-2 p-2">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="ml-4 h-6 w-3/4" />
                    <Skeleton className="ml-4 h-6 w-3/4" />
                    <Skeleton className="ml-8 h-6 w-1/2" />
                    <Skeleton className="ml-4 h-6 w-3/4" />
                  </div>
                ) : orgTrees.length > 0 ? (
                  orgTrees.map((tree) => (
                    <OrgTreeView
                      key={tree.orgId}
                      tree={tree}
                      selectedOrgId={selectedOrgId}
                      onSelect={handleSelect}
                      searchQuery={searchQuery}
                    />
                  ))
                ) : !error ? (
                  <p className="p-4 text-center text-sm text-muted-foreground">
                    {t('common:org_no_results')}
                  </p>
                ) : null}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Right: Document list */}
        <div className="min-w-0 flex-1">
          {selectedOrgId && selectedOrgName ? (
            <DepartmentDocuments orgId={selectedOrgId} orgName={selectedOrgName} />
          ) : (
            <EmptyState icon={<Building2 size={40} />} title={t('common:org_select_department')} />
          )}
        </div>
      </div>
    </div>
  );
}
