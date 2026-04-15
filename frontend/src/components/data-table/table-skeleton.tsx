import { Skeleton } from '@components/ui/skeleton';
import { cn } from '@lib/utils';

interface TableSkeletonProps {
  columns: number;
  rows?: number;
  className?: string;
  ariaLabel?: string;
}

export function TableSkeleton({
  columns,
  rows = 6,
  className,
  ariaLabel,
}: TableSkeletonProps) {
  // Use CSS grid for responsive skeleton; show on md+, hidden on mobile (cards take over there)
  // Aligns with shadcn card style: rounded-xl bg-card shadow-sm
  return (
    <div
      role="status"
      aria-label={ariaLabel}
      aria-live="polite"
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-card shadow-sm',
        className
      )}
    >
      {/* Header row */}
      <div className="border-b border-border bg-muted px-4 py-3">
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-24" />
          ))}
        </div>
      </div>
      {/* Body rows */}
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="px-4 py-4">
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: columns }).map((_, c) => (
                <Skeleton
                  key={c}
                  className="h-4"
                  style={{ width: `${60 + ((r + c) % 3) * 15}%` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
