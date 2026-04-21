import { AlertTriangle, UserMinus, type LucideProps } from 'lucide-react';
import type { AttentionSignal } from './types';

/**
 * The single icon that best represents a set of signals. When every signal
 * is about a responsible holder leaving we surface the people-oriented
 * icon; otherwise — including mixed (validTo + responsible) and pure
 * validTo rows — the generic warning triangle keeps the semantic honest.
 */
export const LeadIcon = ({
  signals,
  ...props
}: LucideProps & { signals: AttentionSignal[] }) => {
  const Icon = signals.every((s) => s.kind === 'responsible') ? UserMinus : AlertTriangle;
  return <Icon {...props} />;
};
