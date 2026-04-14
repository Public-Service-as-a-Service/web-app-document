'use client';

import { create } from 'zustand';
import { apiService, ApiResponse } from '@services/api-service';
import type { OrgNode, OrgTree } from '@interfaces/company.interface';

interface OrganizationState {
  orgTree: OrgTree | null;
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
  orgTree: null as OrgTree | null,
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

      const treeRes = await apiService.get<ApiResponse<OrgTree>>(
        `company/${roots[0].orgId}/orgtree`
      );
      const tree = treeRes.data.data;
      const flat = flattenTree(tree);

      set({ orgTree: tree, flatNodes: flat, loading: false });
    } catch {
      set({ loading: false, error: 'Failed to fetch organization tree' });
    }
  },

  setSelectedOrg: (orgId, orgName = null) =>
    set({ selectedOrgId: orgId, selectedOrgName: orgName }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  reset: () => set(initialState),
}));
