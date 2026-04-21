import { useEffect, useState } from 'react';
import type { DocumentDto } from '@data-contracts/backend/data-contracts';
import { buildDocumentSignals } from './build-attention-items';
import { fetchEmploymentInfoMap } from './fetch-employment-info';
import type { AttentionSignal } from './types';

/**
 * Resolve the attention signals for a single document. Returns every
 * applicable signal — unlike the dashboard list which picks the most urgent
 * one per row, the detail surface has room to show them all so the user
 * sees the full reason for the warning.
 */
export const useDocumentAttention = (doc: DocumentDto | null | undefined) => {
  const [signals, setSignals] = useState<AttentionSignal[] | null>(null);

  // Stable primitive dep over the fields that actually influence signals —
  // keeps the effect from re-running when unrelated parts of the doc
  // object change identity.
  const key = doc
    ? [
        doc.registrationNumber,
        doc.revision,
        doc.validTo ?? '',
        (doc.responsibilities ?? [])
          .map((r) => r.personId)
          .sort()
          .join(','),
      ].join('|')
    : null;

  useEffect(() => {
    if (!doc) {
      setSignals(null);
      return;
    }
    let cancelled = false;

    fetchEmploymentInfoMap((doc.responsibilities ?? []).map((r) => r.personId))
      .then((personInfo) => {
        if (!cancelled) setSignals(buildDocumentSignals(doc, personInfo));
      })
      .catch(() => {
        if (!cancelled) setSignals([]);
      });

    return () => {
      cancelled = true;
    };
    // `doc` is captured via closure; re-run only when `key` (the serialised
    // identifying fields) actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { signals, loading: signals === null };
};
