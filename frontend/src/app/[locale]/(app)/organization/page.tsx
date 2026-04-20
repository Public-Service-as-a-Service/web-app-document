'use client';

import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { ArrowLeft, FileText } from 'lucide-react';
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
    <div className="mx-auto w-full max-w-7xl 2xl:max-w-[1800px]">
      <header className="mb-6 md:mb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          {t('common:org_eyebrow')}
        </p>
        <h1 className="mt-1.5 font-serif text-[28px] font-normal leading-[1.12] tracking-[-0.015em] text-foreground md:text-[36px] xl:text-[40px]">
          {t('common:org_headline')}
        </h1>
        <p className="mt-3 max-w-[56ch] font-serif text-[15.5px] leading-[1.55] text-muted-foreground md:text-[17px]">
          {t('common:org_lede')}
        </p>
      </header>

      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {t('common:org_error')}
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        {/* Left: Org tree */}
        <div
          className={cn(
            'shrink-0 lg:w-[340px] lg:border-r lg:border-border lg:pr-6',
            hasSelection ? 'hidden lg:block' : 'block'
          )}
        >
          <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none">
            <div className="sticky top-0 z-10 space-y-3 border-b border-border bg-card/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-card/80 lg:border-0 lg:bg-background/95 lg:px-0 lg:pt-0 lg:supports-[backdrop-filter]:bg-background/70">
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
                    'flex-1 rounded-md px-3 py-1.5 font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
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
                    'flex-1 rounded-md px-3 py-1.5 font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:opacity-50',
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

            <ScrollArea className="h-[calc(100dvh-340px)] lg:h-[calc(100dvh-280px)]">
              <div className="p-2 lg:px-0">
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
            <div className="space-y-6">
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

              <header>
                <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                  {t('common:org_title')}
                </p>
                <h2 className="mt-1.5 font-serif text-[24px] font-normal leading-[1.18] tracking-[-0.01em] text-foreground md:text-[28px]">
                  {selectedOrgName}
                </h2>
                <dl className="mt-4 grid grid-cols-[max-content_1fr] gap-x-8 gap-y-2 text-[13px]">
                  <dt className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground">
                    {t('common:org_context_org_id')}
                  </dt>
                  <dd className="m-0 truncate font-mono tabular-nums text-foreground">
                    {selectedOrgId}
                  </dd>
                  {selectedNode?.treeLevel !== undefined && (
                    <>
                      <dt className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground">
                        {t('common:org_context_level')}
                      </dt>
                      <dd className="m-0 tabular-nums text-foreground">
                        {selectedNode.treeLevel}
                      </dd>
                    </>
                  )}
                  {parentNode && (
                    <>
                      <dt className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground">
                        {t('common:org_context_parent')}
                      </dt>
                      <dd className="m-0 truncate text-foreground">
                        <button
                          type="button"
                          onClick={() => handleSelect(parentNode.orgId, parentNode.orgName)}
                          className="rounded-sm underline-offset-2 outline-none hover:underline focus-visible:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                        >
                          {parentNode.orgName}
                        </button>
                      </dd>
                    </>
                  )}
                  {onlyWithDocs && (
                    <>
                      <dt className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground">
                        {t('common:org_context_documents')}
                      </dt>
                      <dd
                        className={cn(
                          'm-0',
                          selectionHasDocs ? 'text-foreground' : 'text-muted-foreground'
                        )}
                      >
                        {selectionHasDocs
                          ? t('common:revision_latest')
                          : t('common:org_documents_empty')}
                      </dd>
                    </>
                  )}
                </dl>
              </header>

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
      title: t('common:org_hint_step_1'),
      description: t('common:org_hint_step_1_description'),
    },
    {
      title: t('common:org_hint_step_2'),
      description: t('common:org_hint_step_2_description'),
    },
    {
      title: t('common:org_hint_step_3'),
      description: t('common:org_hint_step_3_description'),
    },
  ];

  return (
    <section aria-labelledby="org-onboarding-heading">
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
        {t('common:org_title')}
      </p>
      <h2
        id="org-onboarding-heading"
        className="mt-1.5 font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.01em] text-foreground md:text-[26px]"
      >
        {t('common:org_hint_tree_heading')}
      </h2>
      <ol className="mt-6 flex flex-col gap-5 border-t border-border pt-5">
        {steps.map((s, i) => (
          <li
            key={i}
            className="stagger-item grid grid-cols-[max-content_1fr] gap-x-5 gap-y-1"
            style={{ ['--i' as string]: i } as React.CSSProperties}
          >
            <span
              aria-hidden="true"
              className="row-span-2 pt-0.5 font-mono text-[11px] uppercase tracking-[0.08em] tabular-nums text-muted-foreground"
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <p className="font-serif text-[16px] leading-[1.35] text-foreground md:text-[17px]">
              {s.title}
            </p>
            <p className="text-[13.5px] leading-[1.55] text-muted-foreground">
              {s.description}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
