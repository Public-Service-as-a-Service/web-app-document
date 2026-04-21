import dayjs from 'dayjs';
import type { DocumentDto } from '@data-contracts/backend/data-contracts';
import type { Employee } from '@interfaces/employee.interface';
import {
  ATTENTION_WINDOW_DAYS,
  type AttentionItem,
  type AttentionSignal,
  type ResponsiblePersonInfo,
} from './types';

/**
 * Collapse the upstream employments response for a single person into the
 * minimal info the attention list needs. Upstream returns an array (the same
 * person can appear once per company) so we flatten and pick the display
 * fields from the first entry.
 */
export const summarisePerson = (records: Employee[]): ResponsiblePersonInfo => {
  const first = records[0];
  const name = first
    ? `${first.givenname ?? ''} ${first.lastname ?? ''}`.trim()
    : '';
  const endDates = records
    .flatMap((p) => p.employments ?? [])
    .map((e) => e.endDate)
    .filter((d): d is string => !!d);
  if (endDates.length === 0) return { maxEndDate: null, name };
  const maxEndDate = endDates.reduce((a, b) =>
    dayjs(a).isAfter(dayjs(b)) ? a : b
  );
  return { maxEndDate, name };
};

/**
 * Whole calendar days between today (local) and `iso`. May be negative when
 * `iso` is in the past — used to distinguish "already expired" from "soon".
 */
export const diffDays = (iso: string, now: dayjs.Dayjs = dayjs()): number =>
  dayjs(iso).startOf('day').diff(now.startOf('day'), 'day');

/**
 * All applicable attention signals for a single document, sorted most-urgent
 * first. Pure and side-effect-free so both the dashboard list (which picks
 * the single most urgent signal per doc) and the document detail banner
 * (which shows all of them at once) can share the same logic.
 */
export const buildDocumentSignals = (
  doc: DocumentDto,
  personInfo: Map<string, ResponsiblePersonInfo>,
  now: dayjs.Dayjs = dayjs()
): AttentionSignal[] => {
  const cutoff = now.add(ATTENTION_WINDOW_DAYS, 'day');
  const signals: AttentionSignal[] = [];

  if (doc.validTo) {
    const vt = dayjs(doc.validTo);
    if (!vt.isBefore(now) && vt.isBefore(cutoff)) {
      signals.push({
        kind: 'validTo',
        daysLeft: Math.max(0, diffDays(doc.validTo, now)),
      });
    }
  }

  for (const r of doc.responsibilities ?? []) {
    const info = personInfo.get(r.personId);
    if (!info?.maxEndDate) continue;
    const ed = dayjs(info.maxEndDate);
    if (ed.isBefore(cutoff)) {
      signals.push({
        kind: 'responsible',
        daysLeft: diffDays(info.maxEndDate, now),
        personName: info.name,
      });
    }
  }

  signals.sort((a, b) => a.daysLeft - b.daysLeft);
  return signals;
};

/**
 * Compose attention items from owned documents and the employment summary
 * of their responsibility holders. For each document the most urgent signal
 * wins; documents with no signal inside the window are dropped. The result
 * is sorted ascending by urgency (most urgent first).
 */
export const buildAttentionItems = (
  docs: DocumentDto[],
  personInfo: Map<string, ResponsiblePersonInfo>,
  now: dayjs.Dayjs = dayjs()
): AttentionItem[] => {
  const items: AttentionItem[] = [];
  for (const doc of docs) {
    const signals = buildDocumentSignals(doc, personInfo, now);
    if (signals.length === 0) continue;
    items.push({ doc, signals });
  }

  items.sort((a, b) => a.signals[0].daysLeft - b.signals[0].daysLeft);
  return items;
};
