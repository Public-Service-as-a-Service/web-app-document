'use client';

import { create } from 'zustand';
import { apiService, ApiResponse } from '@services/api-service';
import type { OrgNode, OrgTree } from '@interfaces/company.interface';
import type { PagedDocumentResponse } from '@interfaces/document.interface';

interface OrganizationState {
  orgTrees: OrgTree[];
  flatNodes: OrgNode[];
  loading: boolean;
  error: string | null;

  selectedOrgId: number | null;
  selectedOrgName: string | null;
  searchQuery: string;

  onlyWithDocs: boolean;
  departmentsWithDocs: Set<number>;
  departmentsWithDocsLoading: boolean;

  fetchOrgTree: () => Promise<void>;
  fetchDepartmentsWithDocs: () => Promise<void>;
  setSelectedOrg: (orgId: number | null, orgName?: string | null) => void;
  setSearchQuery: (query: string) => void;
  setOnlyWithDocs: (value: boolean) => void;
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
  onlyWithDocs: false,
  departmentsWithDocs: new Set<number>(),
  departmentsWithDocsLoading: false,
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

  fetchDepartmentsWithDocs: async () => {
    if (get().departmentsWithDocs.size > 0) return;

    set({ departmentsWithDocsLoading: true });
    try {
      const params = new URLSearchParams({
        query: '*',
        page: '0',
        size: '10000',
        includeConfidential: 'false',
        onlyLatestRevision: 'true',
      });
      const res = await apiService.get<ApiResponse<PagedDocumentResponse>>(
        `documents?${params.toString()}`
      );
      const docs = res.data.data.documents || [];
      const ids = new Set<number>();
      for (const doc of docs) {
        const meta = doc.metadataList?.find((m) => m.key === 'departmentOrgId');
        if (meta?.value) ids.add(Number(meta.value));
      }
      set({ departmentsWithDocs: ids, departmentsWithDocsLoading: false });
    } catch {
      set({ departmentsWithDocsLoading: false });
    }
  },

  setSelectedOrg: (orgId, orgName = null) =>
    set({ selectedOrgId: orgId, selectedOrgName: orgName }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setOnlyWithDocs: (value) => set({ onlyWithDocs: value }),
  reset: () => set(initialState),
}));
