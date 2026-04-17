'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDocumentStore } from '@stores/document-store';
import { useOrganizationStore } from '@stores/organization-store';
import { useDebouncedCallback } from '@lib/use-debounced-callback';
import type { SelectedDepartment } from '@components/document-filters/department-multi-picker';
import type { DocumentFiltersValue } from '@components/document-filters/apply-filters';
import { DocumentStatusEnum } from '@data-contracts/backend/data-contracts';
import { DOCUMENT_STATUSES } from '@interfaces/document.interface';

const parseCsv = (value: string | null): string[] => {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
};

const parseDeptIds = (value: string | null): number[] => {
  return parseCsv(value)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));
};

const areStringArraysEqual = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

const areDeptArraysEqual = (
  a: SelectedDepartment[],
  b: SelectedDepartment[]
): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].orgId !== b[i].orgId || a[i].orgName !== b[i].orgName) return false;
  }
  return true;
};

/**
 * Syncs the document store (`query`, `page`, `onlyLatestRevision`, `filters`)
 * with the URL query string on the /documents page.
 *
 * - On mount: reads URL -> hydrates store (one-shot).
 * - On store change: writes URL (debounced, 250ms, history-replace only).
 *
 * The write-back path is guarded by an `isHydrating` flag so the first URL ->
 * store hydration does not immediately bounce back as a store -> URL write.
 */
export function useDocumentUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const hydratedRef = useRef(false);
  const isHydratingRef = useRef(false);
  const pendingDeptIdsRef = useRef<number[] | null>(null);

  // Hydrate store from URL once on mount.
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    isHydratingRef.current = true;

    const orgStore = useOrganizationStore.getState();

    const q = searchParams.get('q');
    const p = searchParams.get('p');
    const latest = searchParams.get('latest');
    const type = searchParams.get('type');
    const dept = searchParams.get('dept');
    const resp = searchParams.get('resp');
    const status = searchParams.get('status');

    const nextQuery = q && q.length > 0 ? q : '*';
    const pageNum = p ? Math.max(0, Number(p) - 1) : 0;
    const onlyLatest = latest === null ? true : latest !== '0';

    const documentTypes = parseCsv(type);
    const deptIds = parseDeptIds(dept);
    const responsibilities = parseCsv(resp);
    const statusSet = new Set<string>(DOCUMENT_STATUSES);
    const statuses: DocumentStatusEnum[] =
      status === null
        ? [...DOCUMENT_STATUSES]
        : (parseCsv(status).filter((s) => statusSet.has(s)) as DocumentStatusEnum[]);
    const nameFromTree = (orgId: number): string =>
      orgStore.flatNodes.find((n) => n.orgId === orgId)?.orgName ?? '';
    const departments: SelectedDepartment[] = deptIds.map((orgId) => ({
      orgId,
      orgName: nameFromTree(orgId),
    }));

    // If the org tree hasn't loaded yet, remember which ids still need names
    // so we can backfill once it arrives.
    const needsBackfill = departments.some((d) => d.orgName.length === 0);
    if (needsBackfill) pendingDeptIdsRef.current = deptIds;

    useDocumentStore.setState({
      query: nextQuery,
      page: pageNum,
      onlyLatestRevision: onlyLatest,
      filters: {
        documentTypes,
        departments,
        responsibilities,
        statuses,
      } satisfies DocumentFiltersValue,
    });

    // Kick off tree fetch if needed so names can be backfilled.
    if (needsBackfill && orgStore.flatNodes.length === 0 && !orgStore.loading) {
      void orgStore.fetchOrgTree();
    }

    // Release hydration guard after the next microtask so the write-back
    // effect can observe the hydrated state without treating it as a change.
    queueMicrotask(() => {
      isHydratingRef.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Backfill department names when the org tree loads after hydration.
  useEffect(() => {
    const unsubscribe = useOrganizationStore.subscribe((state) => {
      const pending = pendingDeptIdsRef.current;
      if (!pending || pending.length === 0) return;
      if (state.flatNodes.length === 0) return;

      const current = useDocumentStore.getState().filters.departments;
      const currentIds = current.map((d) => d.orgId);
      if (!areStringArraysEqual(currentIds.map(String), pending.map(String))) {
        // User already changed the selection; abandon backfill.
        pendingDeptIdsRef.current = null;
        return;
      }

      const backfilled: SelectedDepartment[] = pending.map((orgId) => ({
        orgId,
        orgName: state.flatNodes.find((n) => n.orgId === orgId)?.orgName ?? '',
      }));
      pendingDeptIdsRef.current = null;

      isHydratingRef.current = true;
      useDocumentStore.setState((s) => ({
        filters: { ...s.filters, departments: backfilled },
      }));
      queueMicrotask(() => {
        isHydratingRef.current = false;
      });
    });

    return unsubscribe;
  }, []);

  const writeUrl = useDebouncedCallback((search: string) => {
    const current = searchParams.toString();
    if (current === search) return;
    const href = search.length > 0 ? `${pathname}?${search}` : pathname;
    router.replace(href, { scroll: false });
  }, 250);

  // Subscribe to store -> write URL (debounced).
  useEffect(() => {
    const unsubscribe = useDocumentStore.subscribe((state, prev) => {
      if (isHydratingRef.current) return;
      if (
        state.query === prev.query &&
        state.page === prev.page &&
        state.onlyLatestRevision === prev.onlyLatestRevision &&
        areStringArraysEqual(
          state.filters.documentTypes,
          prev.filters.documentTypes
        ) &&
        areDeptArraysEqual(state.filters.departments, prev.filters.departments) &&
        areStringArraysEqual(
          state.filters.responsibilities,
          prev.filters.responsibilities
        ) &&
        areStringArraysEqual(state.filters.statuses, prev.filters.statuses)
      ) {
        return;
      }

      const params = new URLSearchParams();
      if (state.query && state.query !== '*') {
        params.set('q', state.query);
      }
      if (state.page > 0) {
        params.set('p', String(state.page + 1));
      }
      if (!state.onlyLatestRevision) {
        params.set('latest', '0');
      }
      if (state.filters.documentTypes.length > 0) {
        params.set('type', state.filters.documentTypes.join(','));
      }
      if (state.filters.departments.length > 0) {
        params.set(
          'dept',
          state.filters.departments.map((d) => d.orgId).join(',')
        );
      }
      if (state.filters.responsibilities.length > 0) {
        params.set('resp', state.filters.responsibilities.join(','));
      }
      // Only serialise statuses when the user has narrowed from the default
      // "all 5". Keeps the URL clean for the common case.
      const statusIsDefault =
        state.filters.statuses.length === DOCUMENT_STATUSES.length &&
        DOCUMENT_STATUSES.every((s) => state.filters.statuses.includes(s));
      if (!statusIsDefault) {
        params.set('status', state.filters.statuses.join(','));
      }

      writeUrl(params.toString());
    });

    return () => {
      unsubscribe();
      writeUrl.cancel();
    };
  }, [writeUrl]);
}
