'use client';

import { ReactNode } from 'react';
import { Button } from '@sk-web-gui/react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, actionLabel, onAction }) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-[1.2rem] border border-dashed border-gray-300 bg-background-100 px-[3.2rem] py-[6.4rem]">
      <div className="mb-[1.6rem] text-gray-400" aria-hidden="true">{icon}</div>
      <p className="mb-[0.4rem] text-[1.6rem] font-semibold text-dark-primary">{title}</p>
      {description && <p className="mb-[1.6rem] text-[1.4rem] text-dark-secondary">{description}</p>}
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
