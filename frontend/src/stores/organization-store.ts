'use client';

import { create } from 'zustand';
import { apiService, ApiResponse } from '@services/api-service';
import type { OrgNode, OrgTree } from '@interfaces/company.interface';

interface OrganizationState {
  orgTrees: OrgTree[];
  flatNodes: OrgNode[];
  loading: boolean;
  error: string | null;

  selectedOrgId: number | null;
  selectedOrgName: string | null;
  searchQuery: string;

  fetchOrgTree: () => Promise<void>;
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

const initialState = {
  orgTrees: [] as OrgTree[],
  flatNodes: [] as OrgNode[],
  loading: false,
  error: null as string | null,
  selectedOrgId: null as number | null,
  selectedOrgName: null as string | null,
  searchQuery: '',
};

export const useOrganizationStore = create<OrganizationState>((set) => ({
  ...initialState,

  fetchOrgTree: async () => {
    set({ loading: true, error: null });

    try {
      const rootRes = await apiService.get<ApiResponse<OrgNode[]>>('company/orgnodesroot');
      const roots = rootRes.data.data;

      if (!roots || roots.length === 0) {
        set({ loading: false, error: 'No root nodes found' });
        return;
      }

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

      set({ orgTrees: trees, flatNodes: flat, loading: false });
    } catch {
      set({ loading: false, error: 'Failed to fetch organization tree' });
    }
  },

  setSelectedOrg: (orgId, orgName = null) =>
    set({ selectedOrgId: orgId, selectedOrgName: orgName }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  reset: () => set(initialState),
}));
