'use client';

import { create } from 'zustand';
import { apiService, ApiResponse } from '@services/api-service';
import type { OrgNode, OrgTree } from '@interfaces/company.interface';

const CACHE_KEY = 'org-tree-cache';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

interface CacheEntry {
  trees: OrgTree[];
  timestamp: number;
}

interface OrganizationState {
  orgTrees: OrgTree[];
  flatNodes: OrgNode[];
  loading: boolean;
  error: string | null;

  selectedOrgId: number | null;
  selectedOrgName: string | null;
  searchQuery: string;

  fetchOrgTree: () => Promise<void>;
  expandRoot: (orgId: number) => Promise<void>;
  setSelectedOrg: (orgId: number | null, orgName?: string | null) => void;
  setSearchQuery: (query: string) => void;
  reset: () => void;
}

const flattenTree = (node: OrgTree, result: OrgNode[] = []): OrgNode[] => {
  result.push({
    orgId: node.orgId,
    orgName: node.orgName,
    parentId: node.parentId,
    companyId: node.companyId,
    treeLevel: node.treeLevel,
    isLeafNode: node.isLeafNode,
  });
  if (node.children) {
    for (const child of node.children) {
      flattenTree(child, result);
    }
  }
  return result;
};

const readCache = (): CacheEntry | null => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return entry;
  } catch {
    return null;
  }
};

const writeCache = (trees: OrgTree[]) => {
  try {
    const entry: CacheEntry = { trees, timestamp: Date.now() };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // sessionStorage full or unavailable — ignore
  }
};

const initialState = {
  orgTrees: [] as OrgTree[],
  flatNodes: [] as OrgNode[],
  loading: false,
  error: null as string | null,
  selectedOrgId: null as number | null,
  selectedOrgName: null as string | null,
  searchQuery: '',
};

export const useOrganizationStore = create<OrganizationState>((set, get) => ({
  ...initialState,

  fetchOrgTree: async () => {
    // Return early if already loaded in this session
    if (get().orgTrees.length > 0) return;

    // Try sessionStorage cache first
    const cached = readCache();
    if (cached) {
      const flat = cached.trees.flatMap((tree) => flattenTree(tree));
      set({ orgTrees: cached.trees, flatNodes: flat });
      return;
    }

    set({ loading: true, error: null });

    try {
      const rootRes = await apiService.get<ApiResponse<OrgNode[]>>('company/orgnodesroot');
      const roots = rootRes.data.data;

      if (!roots || roots.length === 0) {
        set({ loading: false, error: 'No root nodes found' });
        return;
      }

      // Show root nodes immediately (without children)
      const rootTrees: OrgTree[] = roots.map((r) => ({
        ...r,
        children: undefined,
        _loaded: false,
      }));
      set({ orgTrees: rootTrees, loading: false });

      // Fetch full trees in background
      const treeResults = await Promise.all(
        roots.map((root) =>
          apiService
            .get<ApiResponse<OrgTree>>(`company/${root.orgId}/orgtree`)
            .then((res) => res.data.data)
            .catch(() => null)
        )
      );

      const trees = treeResults.filter((t): t is OrgTree => t !== null);
      const flat = trees.flatMap((tree) => flattenTree(tree));

      set({ orgTrees: trees, flatNodes: flat });
      writeCache(trees);
    } catch {
      set({ loading: false, error: 'Failed to fetch organization tree' });
    }
  },

  expandRoot: async (orgId: number) => {
    const { orgTrees } = get();
    const existing = orgTrees.find((t) => t.orgId === orgId);
    if (existing?.children) return; // already loaded

    try {
      const res = await apiService.get<ApiResponse<OrgTree>>(`company/${orgId}/orgtree`);
      const fullTree = res.data.data;

      const updated = orgTrees.map((t) => (t.orgId === orgId ? fullTree : t));
      const flat = updated.flatMap((tree) => flattenTree(tree));

      set({ orgTrees: updated, flatNodes: flat });
      writeCache(updated);
    } catch {
      // keep collapsed — user can retry
    }
  },

  setSelectedOrg: (orgId, orgName = null) =>
    set({ selectedOrgId: orgId, selectedOrgName: orgName }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  reset: () => set(initialState),
}));
