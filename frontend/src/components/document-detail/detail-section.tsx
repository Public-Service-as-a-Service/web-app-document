import type { ReactNode } from 'react';
import { cn } from '@lib/utils';

// Heading + horizontal rule. Embedding the label inside the rule turns the
// divider itself into the structural marker, so we don't pile heading + line
// + extra margin on top of each other.
export const SectionHeading = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div className={cn('mt-5 mb-3 flex items-center gap-3', className)}>
    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </span>
    <span className="h-px flex-1 bg-border" aria-hidden="true" />
  </div>
);

// Two-column definition list with a fixed label column on wide viewports
// and a stacked single column on narrow ones.
export const DetailList = ({ children }: { children: ReactNode }) => (
  <dl className="grid grid-cols-1 items-baseline gap-x-6 gap-y-3 sm:grid-cols-[180px_1fr]">
    {children}
  </dl>
);

// Single label/value pair. Returns a fragment of dt + dd so the parent
// DetailList grid keeps both cells aligned across rows.
export const DetailItem = ({ label, children }: { label: ReactNode; children: ReactNode }) => (
  <>
    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
    <dd className="m-0 min-w-0 text-sm">{children}</dd>
  </>
);
