'use client';

import { create } from 'zustand';
import { apiService, ApiResponse } from '@services/api-service';
import type {
  OrgNodeDto,
  OrgTreeDto,
  PagedDocumentResponseDto,
} from '@data-contracts/backend/data-contracts';

interface OrganizationState {
  orgTrees: OrgTreeDto[];
  flatNodes: OrgNodeDto[];
  loading: boolean;
  error: string | null;
  orgTreeFailedAt: number | null;

  selectedOrgId: number | null;
  selectedOrgName: string | null;
  searchQuery: string;

  onlyWithDocs: boolean;
  departmentsWithDocs: Set<number>;
  departmentsWithDocsLoading: boolean;
  departmentsWithDocsFailedAt: number | null;

  fetchOrgTree: () => Promise<void>;
  fetchDepartmentsWithDocs: () => Promise<void>;
  setSelectedOrg: (orgId: number | null, orgName?: string | null) => void;
  setSearchQuery: (query: string) => void;
  setOnlyWithDocs: (value: boolean) => void;
  reset: () => void;
}

// Cooldown after a failed fetch before the same call is retried. Prevents
// retry storms when the backend (or the user's network) briefly can't reach
// the upstream service — e.g. WSO2 outage in prod, or VPN disconnect in dev.
// Consumers that genuinely need to force a retry can call reset().
const FETCH_FAILURE_COOLDOWN_MS = 30_000;

// Module-scope inflight references de-dupe concurrent calls from multiple
// subscribers that mount in the same tick. Kept outside Zustand state so they
// don't force unrelated re-renders.
let orgTreeInflight: Promise<void> | null = null;
let departmentsWithDocsInflight: Promise<void> | null = null;

const flattenTree = (node: OrgTreeDto, result: OrgNodeDto[] = []): OrgNodeDto[] => {
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
  orgTrees: [] as OrgTreeDto[],
  flatNodes: [] as OrgNodeDto[],
  loading: false,
  error: null as string | null,
  orgTreeFailedAt: null as number | null,
  selectedOrgId: null as number | null,
  selectedOrgName: null as string | null,
  searchQuery: '',
  onlyWithDocs: false,
  departmentsWithDocs: new Set<number>(),
  departmentsWithDocsLoading: false,
  departmentsWithDocsFailedAt: null as number | null,
};

export const useOrganizationStore = create<OrganizationState>((set, get) => ({
  ...initialState,

  fetchOrgTree: async () => {
    if (get().orgTrees.length > 0) return;
    if (orgTreeInflight) return orgTreeInflight;

    const failedAt = get().orgTreeFailedAt;
    if (failedAt !== null && Date.now() - failedAt < FETCH_FAILURE_COOLDOWN_MS) {
      return;
    }

    orgTreeInflight = (async () => {
      set({ loading: true, error: null });
      try {
        const res = await apiService.get<ApiResponse<OrgTreeDto[]>>('company/orgtrees');
        const trees = res.data.data || [];
        const flat = trees.flatMap((tree) => flattenTree(tree));

        set({ orgTrees: trees, flatNodes: flat, loading: false, orgTreeFailedAt: null });
      } catch {
        set({
          loading: false,
          error: 'Failed to fetch organization tree',
          orgTreeFailedAt: Date.now(),
        });
      } finally {
        orgTreeInflight = null;
      }
    })();

    return orgTreeInflight;
  },

  fetchDepartmentsWithDocs: async () => {
    if (get().departmentsWithDocs.size > 0) return;
    if (departmentsWithDocsInflight) return departmentsWithDocsInflight;

    const failedAt = get().departmentsWithDocsFailedAt;
    if (failedAt !== null && Date.now() - failedAt < FETCH_FAILURE_COOLDOWN_MS) {
      return;
    }

    departmentsWithDocsInflight = (async () => {
      set({ departmentsWithDocsLoading: true });
      try {
        const params = new URLSearchParams({
          query: '*',
          page: '0',
          size: '10000',
          includeConfidential: 'false',
          onlyLatestRevision: 'true',
        });
        const res = await apiService.get<ApiResponse<PagedDocumentResponseDto>>(
          `documents?${params.toString()}`
        );
        const docs = res.data.data.documents || [];
        const ids = new Set<number>();
        for (const doc of docs) {
          const meta = doc.metadataList?.find((m) => m.key === 'departmentOrgId');
          if (meta?.value) ids.add(Number(meta.value));
        }
        set({
          departmentsWithDocs: ids,
          departmentsWithDocsLoading: false,
          departmentsWithDocsFailedAt: null,
        });
      } catch {
        set({
          departmentsWithDocsLoading: false,
          departmentsWithDocsFailedAt: Date.now(),
        });
      } finally {
        departmentsWithDocsInflight = null;
      }
    })();

    return departmentsWithDocsInflight;
  },

  setSelectedOrg: (orgId, orgName = null) =>
    set({ selectedOrgId: orgId, selectedOrgName: orgName }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setOnlyWithDocs: (value) => set({ onlyWithDocs: value }),
  reset: () => {
    orgTreeInflight = null;
    departmentsWithDocsInflight = null;
    set(initialState);
  },
}));
