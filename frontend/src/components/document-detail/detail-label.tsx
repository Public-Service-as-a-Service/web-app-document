import type { LucideIcon } from 'lucide-react';
import { cn } from '@lib/utils';

// Repeated in details-card for every field heading — keeps the uppercase
// tracking / muted-foreground / leading-icon pattern in one place.
export const DetailLabel = ({
  icon: Icon,
  children,
  className,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) => (
  <p
    className={cn(
      'mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground',
      className
    )}
  >
    <Icon size={11} aria-hidden="true" />
    {children}
  </p>
);
