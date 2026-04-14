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
    isLeafLevel: node.isLeafLevel,
  });
  if (node.organizations) {
    for (const child of node.organizations) {
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

export const useOrganizationStore = create<OrganizationState>((set, get) => ({
  ...initialState,

  fetchOrgTree: async () => {
    if (get().orgTrees.length > 0) return;

    set({ loading: true, error: null });

    try {
      const res = await apiService.get<ApiResponse<OrgTree[]>>('company/orgtrees');
      const trees = res.data.data || [];
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
