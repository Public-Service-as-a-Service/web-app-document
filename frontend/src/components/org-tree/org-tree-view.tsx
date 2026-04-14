'use client';

import { useState, useMemo, useCallback } from 'react';
import { ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@components/ui/collapsible';
import { cn } from '@lib/utils';
import type { OrgTree } from '@interfaces/company.interface';

interface OrgTreeViewProps {
  tree: OrgTree;
  selectedOrgId: number | null;
  onSelect: (orgId: number, orgName: string) => void;
  searchQuery: string;
}

interface OrgTreeNodeProps {
  node: OrgTree;
  depth: number;
  selectedOrgId: number | null;
  onSelect: (orgId: number, orgName: string) => void;
  matchingIds: Set<number>;
  ancestorIds: Set<number>;
  searchQuery: string;
}

function buildAncestorSet(tree: OrgTree, matchingIds: Set<number>): Set<number> {
  const ancestors = new Set<number>();
  const parentMap = new Map<number, number>();

  const buildParentMap = (node: OrgTree) => {
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

function findMatchingIds(node: OrgTree, query: string): Set<number> {
  const ids = new Set<number>();
  const lower = query.toLowerCase();

  const walk = (n: OrgTree) => {
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
      <mark className="rounded bg-yellow-200 px-0.5 dark:bg-yellow-800">
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
}: OrgTreeNodeProps) {
  const hasChildren = node.organizations && node.organizations.length > 0;
  const isSearching = searchQuery.length > 0;
  const isMatch = matchingIds.has(node.orgId);
  const isAncestor = ancestorIds.has(node.orgId);
  const isSelected = selectedOrgId === node.orgId;

  const [open, setOpen] = useState(false);

  const isExpanded = isSearching ? isAncestor || isMatch : open;

  if (isSearching && !isMatch && !isAncestor) {
    return null;
  }

  if (!hasChildren) {
    return (
      <button
        type="button"
        title={node.orgName}
        onClick={() => onSelect(node.orgId, node.orgName)}
        className={cn(
          'flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-md px-2 py-1.5 text-left text-sm transition-colors',
          isSelected
            ? 'bg-primary/10 font-semibold text-primary'
            : 'text-foreground hover:bg-accent'
        )}
        style={{ paddingLeft: `${depth * 16 + 32}px` }}
      >
        <span className="truncate">
          <HighlightText text={node.orgName} query={searchQuery} />
        </span>
      </button>
    );
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={isSearching ? undefined : setOpen}>
      <div className="flex items-center">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            title={node.orgName}
            className={cn(
              'flex w-full min-w-0 items-center gap-1 overflow-hidden rounded-md px-2 py-1.5 text-left text-sm transition-colors',
              isSelected
                ? 'bg-primary/10 font-semibold text-primary'
                : 'text-foreground hover:bg-accent'
            )}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(node.orgId, node.orgName);
              if (!isSearching) setOpen((prev) => !prev);
            }}
          >
            <ChevronRight
              size={16}
              className={cn(
                'shrink-0 text-muted-foreground transition-transform',
                isExpanded && 'rotate-90'
              )}
            />
            <span className="truncate">
              <HighlightText text={node.orgName} query={searchQuery} />
            </span>
          </button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
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
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function OrgTreeView({ tree, selectedOrgId, onSelect, searchQuery }: OrgTreeViewProps) {
  const matchingIds = useMemo(
    () => (searchQuery ? findMatchingIds(tree, searchQuery) : new Set<number>()),
    [tree, searchQuery]
  );

  const ancestorIds = useMemo(
    () => (searchQuery ? buildAncestorSet(tree, matchingIds) : new Set<number>()),
    [tree, matchingIds, searchQuery]
  );

  const handleSelect = useCallback(
    (orgId: number, orgName: string) => onSelect(orgId, orgName),
    [onSelect]
  );

  return (
    <div className="flex flex-col gap-0.5">
      <OrgTreeNode
        node={tree}
        depth={0}
        selectedOrgId={selectedOrgId}
        onSelect={handleSelect}
        matchingIds={matchingIds}
        ancestorIds={ancestorIds}
        searchQuery={searchQuery}
      />
    </div>
  );
}
