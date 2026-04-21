import { useEffect, useState } from 'react';
import { apiService, ApiResponse } from '@services/api-service';
import type {
  DocumentDto,
  PagedDocumentResponseDto,
} from '@data-contracts/backend/data-contracts';
import { buildAttentionItems } from './build-attention-items';
import { fetchEmploymentInfoMap } from './fetch-employment-info';
import type { AttentionItem } from './types';

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

      // Typical dashboards have a handful of unique holders. N+1 is
      // acceptable until the upstream feed replaces this; the shared cache
      // keeps repeat fetches in-session to a single call per personId.
      const personInfo = await fetchEmploymentInfoMap(
        docs.flatMap((d) => d.responsibilities?.map((r) => r.personId) ?? [])
      );
      if (cancelled) return;

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
