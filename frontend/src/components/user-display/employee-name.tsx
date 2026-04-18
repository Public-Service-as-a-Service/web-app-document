'use client';

import { useEffect, useState } from 'react';
import { Skeleton } from '@components/ui/skeleton';
import { cn } from '@lib/utils';
import { getEmployee } from '@services/employee-service';
import { displayUsername } from '@utils/display-username';
import type { PortalPersonDto } from '@data-contracts/backend/data-contracts';

type EmployeeNameProps = {
  username: string | null | undefined;
  className?: string;
  showUsername?: boolean;
};

export const EmployeeName = ({
  username,
  className,
  showUsername = false,
}: EmployeeNameProps) => {
  const [person, setPerson] = useState<PortalPersonDto | null>(null);
  const [error, setError] = useState(false);
  const [prevUsername, setPrevUsername] = useState<string | null | undefined>(username);

  // Reset state when username prop changes (React "reset state during render" pattern).
  if (username !== prevUsername) {
    setPrevUsername(username);
    setPerson(null);
    setError(false);
  }

  useEffect(() => {
    if (!username) return;
    let cancelled = false;
    getEmployee(username)
      .then((data) => {
        if (!cancelled) setPerson(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [username]);

  if (!username) return <span className={cn('text-muted-foreground', className)}>—</span>;

  const fallback = displayUsername(username);
  const fullName = person ? `${person.givenname ?? ''} ${person.lastname ?? ''}`.trim() : '';
  const label = fullName || fallback;
  const loading = !person && !error;

  if (loading) {
    return (
      <span className={cn('inline-flex items-center', className)}>
        <Skeleton className="h-4 w-28" aria-label={fallback} />
      </span>
    );
  }

  return (
    <span className={cn('truncate', className)} title={username}>
      {label}
      {showUsername && fullName && (
        <span className="ml-2 font-mono text-[0.7rem] text-muted-foreground/80">{fallback}</span>
      )}
    </span>
  );
};
