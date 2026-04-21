import type { DocumentDto } from '@data-contracts/backend/data-contracts';

// Coarsest tier of the planned 30/14/7-day review-workflow notifications.
// Documents with no signal inside this window do not appear on the list.
export const ATTENTION_WINDOW_DAYS = 30;

/**
 * Why a document ended up on the attention list. Only the most urgent signal
 * per document is surfaced to the UI.
 *
 *   - `validTo`: the document's own expiry is inside the window.
 *   - `responsible`: a person listed in `responsibilities` has an employment
 *     `endDate` that is past (negative `daysLeft`) or inside the window, so
 *     the document needs a new owner before the hand-off becomes an outage.
 */
export type AttentionSignal =
  | { kind: 'validTo'; daysLeft: number }
  | { kind: 'responsible'; daysLeft: number; personName: string };

export interface AttentionItem {
  doc: DocumentDto;
  signal: AttentionSignal;
}

export interface ResponsiblePersonInfo {
  /**
   * Latest (max) `endDate` across all of the person's employments. If the
   * person's latest engagement is in the past they are considered gone; if
   * it is inside the attention window they are considered leaving. `null`
   * means no endDate is known — treat as stable.
   */
  maxEndDate: string | null;
  name: string;
}
