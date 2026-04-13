'use client';

import { ReactNode } from 'react';
import { Button } from '@components/ui/button';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-8 py-16">
      <div className="mb-4 text-muted-foreground" aria-hidden="true">
        {icon}
      </div>
      <p className="mb-1 text-base font-semibold text-foreground">{title}</p>
      {description && <p className="mb-4 text-sm text-muted-foreground">{description}</p>}
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
