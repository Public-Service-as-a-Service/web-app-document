import { useEffect, useState } from 'react';
import { apiService, ApiResponse } from '@services/api-service';
import type {
  DocumentDto,
  PagedDocumentResponseDto,
} from '@data-contracts/backend/data-contracts';
import type { Employee } from '@interfaces/employee.interface';
import { buildAttentionItems, summarisePerson } from './build-attention-items';
import type { AttentionItem, ResponsiblePersonInfo } from './types';

const MAX_ITEMS = 4;
const FETCH_DOC_LIMIT = 50;

/**
 * Fetch the logged-in user's owned documents, resolve each responsibility
 * holder's employment data, and compose the attention list.
 *
 * Temporary frontend composition. Long-term, when the review workflow lands
 * in api-service-document, this hook should be replaced by a single call to
 * an upstream feed and the `buildAttentionItems` logic should move upstream.
 */
export const useAttentionItems = (personId: string | undefined | null) => {
  const [items, setItems] = useState<AttentionItem[] | null>(null);

  useEffect(() => {
    if (!personId) return;
    let cancelled = false;

    (async () => {
      const docsRes = await apiService.post<ApiResponse<PagedDocumentResponseDto>>(
        'documents/filter',
        {
          createdBy: personId,
          statuses: ['ACTIVE', 'SCHEDULED'],
          onlyLatestRevision: true,
          page: 1,
          limit: FETCH_DOC_LIMIT,
          sortBy: ['validTo'],
          sortDirection: 'ASC',
        }
      );
      if (cancelled) return;
      const docs: DocumentDto[] = docsRes.data.data.documents ?? [];

      // Unique responsibility personIds across all owned docs. One request
      // per person — typical dashboards have a handful, so N+1 is acceptable
      // until the upstream feed replaces this.
      const personIds = Array.from(
        new Set(docs.flatMap((d) => d.responsibilities?.map((r) => r.personId) ?? []))
      );

      const entries = await Promise.all(
        personIds.map(async (pid): Promise<[string, ResponsiblePersonInfo]> => {
          try {
            const res = await apiService.get<ApiResponse<Employee[]>>(
              `employees/by-personid/${encodeURIComponent(pid)}/employments`
            );
            return [pid, summarisePerson(res.data.data)];
          } catch {
            return [pid, { maxEndDate: null, name: '' }];
          }
        })
      );
      if (cancelled) return;

      const personInfo = new Map(entries);
      setItems(buildAttentionItems(docs, personInfo).slice(0, MAX_ITEMS));
    })().catch(() => {
      if (!cancelled) setItems([]);
    });

    return () => {
      cancelled = true;
    };
  }, [personId]);

  return { items, loading: items === null };
};
