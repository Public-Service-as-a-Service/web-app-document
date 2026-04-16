'use client';

import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { Building2, ArrowLeft, FileText, Sparkles, Search as SearchIcon, Filter } from 'lucide-react';
import { useOrganizationStore } from '@stores/organization-store';
import { useDocumentTypeStore } from '@stores/document-type-store';
import { OrgTreeView } from '@components/org-tree/org-tree-view';
import { DepartmentDocuments } from '@components/org-tree/department-documents';
import { DepartmentBreadcrumb } from '@components/org-tree/department-breadcrumb';
import { SearchInput } from '@components/ui/search-input';
import { ScrollArea } from '@components/ui/scroll-area';
import { Skeleton } from '@components/ui/skeleton';
import { Button } from '@components/ui/button';
import { cn } from '@lib/utils';

export default function OrganizationPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'sv';

  const {
    orgTrees,
    flatNodes,
    loading,
    error,
    selectedOrgId,
    selectedOrgName,
    searchQuery,
    onlyWithDocs,
    departmentsWithDocs,
    departmentsWithDocsLoading,
    fetchOrgTree,
    fetchDepartmentsWithDocs,
    setSelectedOrg,
    setSearchQuery,
    setOnlyWithDocs,
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

  const hasSelection = Boolean(selectedOrgId && selectedOrgName);

  const clearSelection = () => {
    setSelectedOrg(null, null);
    const next = new URLSearchParams(searchParams.toString());
    next.delete('dept');
    next.delete('name');
    const q = next.toString();
    router.replace(`/${locale}/organization${q ? `?${q}` : ''}`, { scroll: false });
  };

  const selectedNode = useMemo(
    () => flatNodes.find((n) => n.orgId === selectedOrgId),
    [flatNodes, selectedOrgId]
  );
  const parentId = selectedNode?.parentId ?? null;
  const parentNode = useMemo(
    () => (parentId ? flatNodes.find((n) => n.orgId === parentId) : null),
    [flatNodes, parentId]
  );
  const selectionHasDocs = selectedOrgId ? departmentsWithDocs.has(selectedOrgId) : false;

  const handleFilterChange = (next: boolean) => {
    setOnlyWithDocs(next);
    if (next) fetchDepartmentsWithDocs();
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('common:org_title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('common:org_hint_tree_description')}
          </p>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {t('common:org_error')}
        </div>
      )}

      <div className="flex flex-col gap-5 lg:flex-row">
        {/* Left: Org tree */}
        <div
          className={cn(
            'shrink-0 lg:w-[360px]',
            hasSelection ? 'hidden lg:block' : 'block'
          )}
        >
          <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="sticky top-0 z-10 space-y-3 border-b border-border bg-card/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-card/80">
              <SearchInput
                placeholder={t('common:org_search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
              />
              <div
                className="inline-flex w-full rounded-lg bg-muted p-0.5 text-xs"
                role="group"
                aria-label={t('common:org_only_with_documents')}
              >
                <button
                  type="button"
                  onClick={() => handleFilterChange(false)}
                  aria-pressed={!onlyWithDocs}
                  className={cn(
                    'flex-1 rounded-md px-3 py-1.5 font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                    !onlyWithDocs
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {t('common:org_filter_all')}
                </button>
                <button
                  type="button"
                  onClick={() => handleFilterChange(true)}
                  aria-pressed={onlyWithDocs}
                  disabled={departmentsWithDocsLoading}
                  className={cn(
                    'flex-1 rounded-md px-3 py-1.5 font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50',
                    onlyWithDocs
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <FileText size={12} className="mr-1 inline-block shrink-0" aria-hidden="true" />
                  {t('common:org_filter_with_docs')}
                </button>
              </div>
            </div>

            <ScrollArea className="h-[calc(100dvh-340px)] lg:h-[calc(100dvh-260px)]">
              <div className="p-2">
                {loading ? (
                  <div className="space-y-2 p-2">
                    <Skeleton className="h-7 w-full" />
                    <Skeleton className="ml-4 h-7 w-3/4" />
                    <Skeleton className="ml-4 h-7 w-3/4" />
                    <Skeleton className="ml-8 h-7 w-1/2" />
                    <Skeleton className="ml-4 h-7 w-3/4" />
                    <Skeleton className="h-7 w-5/6" />
                    <Skeleton className="ml-4 h-7 w-2/3" />
                  </div>
                ) : orgTrees.length > 0 ? (
                  <ul
                    role="tree"
                    aria-label={t('common:org_tree_aria_label')}
                    className="flex flex-col gap-0.5"
                  >
                    {orgTrees.map((tree) => (
                      <OrgTreeView
                        key={tree.orgId}
                        tree={tree}
                        selectedOrgId={selectedOrgId}
                        onSelect={handleSelect}
                        searchQuery={searchQuery}
                        filterOrgIds={onlyWithDocs ? departmentsWithDocs : undefined}
                        docCountIds={departmentsWithDocs}
                      />
                    ))}
                  </ul>
                ) : !error ? (
                  <p className="p-4 text-center text-sm text-muted-foreground">
                    {t('common:org_no_results')}
                  </p>
                ) : null}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Right: Selected or onboarding */}
        <div
          className={cn(
            'min-w-0 flex-1',
            hasSelection ? 'block' : 'hidden lg:block'
          )}
        >
          {hasSelection && selectedOrgId && selectedOrgName ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <DepartmentBreadcrumb orgId={selectedOrgId} orgName={selectedOrgName} />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="lg:hidden"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t('common:back')}
                </Button>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
                    aria-hidden="true"
                  >
                    <Building2 size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-semibold tracking-tight text-foreground">
                      {selectedOrgName}
                    </h2>
                    <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-4">
                      <div className="min-w-0">
                        <dt className="font-medium uppercase tracking-wide text-muted-foreground">
                          {t('common:org_context_org_id')}
                        </dt>
                        <dd className="mt-0.5 truncate font-mono text-sm text-foreground">
                          {selectedOrgId}
                        </dd>
                      </div>
                      {selectedNode?.treeLevel !== undefined && (
                        <div className="min-w-0">
                          <dt className="font-medium uppercase tracking-wide text-muted-foreground">
                            {t('common:org_context_level')}
                          </dt>
                          <dd className="mt-0.5 text-sm text-foreground">{selectedNode.treeLevel}</dd>
                        </div>
                      )}
                      {parentNode && (
                        <div className="col-span-2 min-w-0">
                          <dt className="font-medium uppercase tracking-wide text-muted-foreground">
                            {t('common:org_context_parent')}
                          </dt>
                          <dd className="mt-0.5 truncate text-sm text-foreground">
                            <button
                              type="button"
                              onClick={() => handleSelect(parentNode.orgId, parentNode.orgName)}
                              className="underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
                            >
                              {parentNode.orgName}
                            </button>
                          </dd>
                        </div>
                      )}
                      {onlyWithDocs && (
                        <div className="min-w-0">
                          <dt className="font-medium uppercase tracking-wide text-muted-foreground">
                            {t('common:org_context_documents')}
                          </dt>
                          <dd
                            className={cn(
                              'mt-0.5 text-sm',
                              selectionHasDocs ? 'text-foreground' : 'text-muted-foreground'
                            )}
                          >
                            {selectionHasDocs
                              ? t('common:revision_latest')
                              : t('common:org_documents_empty')}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>
              </div>

              <DepartmentDocuments orgId={selectedOrgId} orgName={selectedOrgName} />
            </div>
          ) : (
            <OrgOnboardingPanel />
          )}
        </div>
      </div>
    </div>
  );
}

function OrgOnboardingPanel() {
  const { t } = useTranslation();
  const steps = [
    {
      icon: <SearchIcon size={16} className="text-primary" aria-hidden="true" />,
      title: t('common:org_hint_step_1'),
      description: t('common:org_hint_step_1_description'),
    },
    {
      icon: <Filter size={16} className="text-[hsl(var(--chart-2))]" aria-hidden="true" />,
      title: t('common:org_hint_step_2'),
      description: t('common:org_hint_step_2_description'),
    },
    {
      icon: <Building2 size={16} className="text-[hsl(var(--chart-3))]" aria-hidden="true" />,
      title: t('common:org_hint_step_3'),
      description: t('common:org_hint_step_3_description'),
    },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="mb-5 flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
          aria-hidden="true"
        >
          <Sparkles size={18} />
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          {t('common:org_hint_tree_heading')}
        </h2>
      </div>
      <ol className="grid gap-3 sm:grid-cols-3">
        {steps.map((s, i) => (
          <li
            key={i}
            className="stagger-item rounded-lg border border-border bg-background/40 p-4"
            style={{ ['--i' as string]: i } as React.CSSProperties}
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-md bg-muted">
                {s.icon}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {i + 1}
              </span>
            </div>
            <p className="text-sm font-medium text-foreground">{s.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
