'use client';

import { useState, useMemo, useCallback } from 'react';
import { ChevronRight, FileText, Building2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@components/ui/collapsible';
import { cn } from '@lib/utils';
import type { OrgTreeDto } from '@data-contracts/backend/data-contracts';

interface OrgTreeViewProps {
  tree: OrgTreeDto;
  selectedOrgId: number | null;
  onSelect: (orgId: number, orgName: string) => void;
  searchQuery: string;
  filterOrgIds?: Set<number>;
  docCountIds?: Set<number>;
}

interface OrgTreeNodeProps {
  node: OrgTreeDto;
  depth: number;
  selectedOrgId: number | null;
  onSelect: (orgId: number, orgName: string) => void;
  matchingIds: Set<number>;
  ancestorIds: Set<number>;
  searchQuery: string;
  filterOrgIds?: Set<number>;
  filterAncestorIds?: Set<number>;
  docCountIds?: Set<number>;
}

function buildAncestorSet(tree: OrgTreeDto, matchingIds: Set<number>): Set<number> {
  const ancestors = new Set<number>();
  const parentMap = new Map<number, number>();

  const buildParentMap = (node: OrgTreeDto) => {
    if (node.organizations) {
      for (const child of node.organizations) {
        parentMap.set(child.orgId, node.orgId);
        buildParentMap(child);
      }
    }
  };
  buildParentMap(tree);

  for (const id of matchingIds) {
    let current = parentMap.get(id);
    while (current !== undefined) {
      ancestors.add(current);
      current = parentMap.get(current);
    }
  }
  return ancestors;
}

function findMatchingIds(node: OrgTreeDto, query: string): Set<number> {
  const ids = new Set<number>();
  const lower = query.toLowerCase();

  const walk = (n: OrgTreeDto) => {
    if (n.orgName.toLowerCase().includes(lower)) {
      ids.add(n.orgId);
    }
    if (n.organizations) {
      for (const child of n.organizations) walk(child);
    }
  };
  walk(node);
  return ids;
}

export function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;

  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-yellow-200/90 px-0.5 text-foreground dark:bg-yellow-500/30 dark:text-yellow-100">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function OrgTreeNode({
  node,
  depth,
  selectedOrgId,
  onSelect,
  matchingIds,
  ancestorIds,
  searchQuery,
  filterOrgIds,
  filterAncestorIds,
  docCountIds,
}: OrgTreeNodeProps) {
  const hasChildren = node.organizations && node.organizations.length > 0;
  const isSearching = searchQuery.length > 0;
  const isMatch = matchingIds.has(node.orgId);
  const isAncestor = ancestorIds.has(node.orgId);
  const isSelected = selectedOrgId === node.orgId;
  const isFiltering = filterOrgIds !== undefined;
  const isFilterMatch = isFiltering && filterOrgIds.has(node.orgId);
  const isFilterAncestor = isFiltering && filterAncestorIds?.has(node.orgId);
  const hasDocs = Boolean(docCountIds?.has(node.orgId));

  const [open, setOpen] = useState(false);

  const isExpanded = isSearching
    ? isAncestor || isMatch
    : isFiltering
      ? isFilterAncestor || isFilterMatch
      : open;

  if (isSearching && !isMatch && !isAncestor) {
    return null;
  }

  if (isFiltering && !isFilterMatch && !isFilterAncestor) {
    return null;
  }

  const indent = depth * 14;

  const commonPillContent = (
    <>
      <span
        className={cn(
          'inline-flex size-5 shrink-0 items-center justify-center rounded-md',
          isSelected ? 'bg-primary/15 text-primary' : 'text-muted-foreground'
        )}
        aria-hidden="true"
      >
        {hasChildren ? <Building2 size={13} /> : <FileText size={12} />}
      </span>
      <span className="min-w-0 flex-1 truncate">
        <HighlightText text={node.orgName} query={searchQuery} />
      </span>
      {hasDocs && !isSelected && (
        <span
          className="inline-block size-1.5 shrink-0 rounded-full bg-primary/70"
          aria-hidden="true"
          title="Har dokument"
        />
      )}
    </>
  );

  if (!hasChildren) {
    return (
      <li role="treeitem" aria-selected={isSelected} aria-level={depth + 1}>
        <button
          type="button"
          title={node.orgName}
          onClick={() => onSelect(node.orgId, node.orgName)}
          className={cn(
            'flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-md py-1.5 pr-2 text-left text-sm outline-none transition-colors',
            'focus-visible:ring-[2px] focus-visible:ring-ring/50',
            isSelected
              ? 'bg-primary/10 font-semibold text-primary'
              : 'text-foreground/90 hover:bg-accent'
          )}
          style={{ paddingLeft: `${indent + 28}px` }}
        >
          {commonPillContent}
        </button>
      </li>
    );
  }

  return (
    <li
      role="treeitem"
      aria-selected={isSelected}
      aria-expanded={isExpanded}
      aria-level={depth + 1}
    >
      <Collapsible open={isExpanded} onOpenChange={isSearching ? undefined : setOpen}>
        <div className="flex items-center">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              title={node.orgName}
              className={cn(
                'group flex w-full min-w-0 items-center gap-1.5 overflow-hidden rounded-md py-1.5 pr-2 text-left text-sm outline-none transition-colors',
                'focus-visible:ring-[2px] focus-visible:ring-ring/50',
                isSelected
                  ? 'bg-primary/10 font-semibold text-primary'
                  : 'text-foreground/90 hover:bg-accent'
              )}
              style={{ paddingLeft: `${indent + 6}px` }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(node.orgId, node.orgName);
                if (!isSearching) setOpen((prev) => !prev);
              }}
            >
              <ChevronRight
                size={14}
                className={cn(
                  'shrink-0 text-muted-foreground transition-transform duration-150',
                  isExpanded && 'rotate-90 text-foreground'
                )}
                aria-hidden="true"
              />
              {commonPillContent}
            </button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <ul role="group" className="flex flex-col gap-0.5">
            {node.organizations?.map((child) => (
              <OrgTreeNode
                key={child.orgId}
                node={child}
                depth={depth + 1}
                selectedOrgId={selectedOrgId}
                onSelect={onSelect}
                matchingIds={matchingIds}
                ancestorIds={ancestorIds}
                searchQuery={searchQuery}
                filterOrgIds={filterOrgIds}
                filterAncestorIds={filterAncestorIds}
                docCountIds={docCountIds}
              />
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}

export function OrgTreeView({
  tree,
  selectedOrgId,
  onSelect,
  searchQuery,
  filterOrgIds,
  docCountIds,
}: OrgTreeViewProps) {
  const matchingIds = useMemo(
    () => (searchQuery ? findMatchingIds(tree, searchQuery) : new Set<number>()),
    [tree, searchQuery]
  );

  const ancestorIds = useMemo(
    () => (searchQuery ? buildAncestorSet(tree, matchingIds) : new Set<number>()),
    [tree, matchingIds, searchQuery]
  );

  const filterAncestorIds = useMemo(
    () => (filterOrgIds ? buildAncestorSet(tree, filterOrgIds) : undefined),
    [tree, filterOrgIds]
  );

  const handleSelect = useCallback(
    (orgId: number, orgName: string) => onSelect(orgId, orgName),
    [onSelect]
  );

  return (
    <OrgTreeNode
      node={tree}
      depth={0}
      selectedOrgId={selectedOrgId}
      onSelect={handleSelect}
      matchingIds={matchingIds}
      ancestorIds={ancestorIds}
      searchQuery={searchQuery}
      filterOrgIds={filterOrgIds}
      filterAncestorIds={filterAncestorIds}
      docCountIds={docCountIds}
    />
  );
}
