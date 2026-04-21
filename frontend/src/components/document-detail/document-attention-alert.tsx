'use client';

import { Alert, AlertDescription } from '@components/ui/alert';
import {
  LeadIcon,
  useDocumentAttention,
  useSignalLabel,
  type AttentionSignal,
} from '@components/dashboard/attention';
import { useDocumentDetail } from './document-detail-context';

// Escalate to the destructive variant as soon as any signal lands in the
// top urgency tier (≤ 7 days or already past); otherwise the softer `info`
// variant matches the ochre `chart-3` used on the dashboard list's medium
// and low rows, so the two surfaces read as one visual system.
const variantForSignals = (signals: AttentionSignal[]): 'destructive' | 'info' =>
  signals.some((s) => s.daysLeft <= 7) ? 'destructive' : 'info';

export const DocumentAttentionAlert = () => {
  const { doc } = useDocumentDetail();
  const { signals, loading } = useDocumentAttention(doc);
  const signalLabel = useSignalLabel();

  if (loading || !signals || signals.length === 0) return null;

  return (
    <Alert variant={variantForSignals(signals)} className="mb-6">
      <LeadIcon signals={signals} />
      <AlertDescription>
        {signals.length === 1 ? (
          <span>{signalLabel(signals[0])}</span>
        ) : (
          <ul className="list-disc space-y-1 pl-5">
            {signals.map((signal, i) => (
              <li key={i}>{signalLabel(signal)}</li>
            ))}
          </ul>
        )}
      </AlertDescription>
    </Alert>
  );
};
