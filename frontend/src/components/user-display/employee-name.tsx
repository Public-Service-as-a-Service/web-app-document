'use client';

import { useEffect, useState } from 'react';
import { Skeleton } from '@components/ui/skeleton';
import { cn } from '@lib/utils';
import { getEmployeeByPersonId } from '@services/employee-service';
import { displayUsername } from '@utils/display-username';
import type { PortalPersonDto } from '@data-contracts/backend/data-contracts';

type EmployeeNameProps = {
  personId: string | null | undefined;
  className?: string;
  showLoginName?: boolean;
};

export const EmployeeName = ({
  personId,
  className,
  showLoginName = false,
}: EmployeeNameProps) => {
  const [person, setPerson] = useState<PortalPersonDto | null>(null);
  const [error, setError] = useState(false);
  const [prevPersonId, setPrevPersonId] = useState<string | null | undefined>(personId);

  // Reset state when personId prop changes (React "reset state during render" pattern).
  if (personId !== prevPersonId) {
    setPrevPersonId(personId);
    setPerson(null);
    setError(false);
  }

  useEffect(() => {
    if (!personId) return;
    let cancelled = false;
    getEmployeeByPersonId(personId)
      .then((data) => {
        if (!cancelled) setPerson(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [personId]);

  if (!personId) return <span className={cn('text-muted-foreground', className)}>—</span>;

  const loginFallback = person?.loginName ? displayUsername(person.loginName) : '';
  const fullName = person ? `${person.givenname ?? ''} ${person.lastname ?? ''}`.trim() : '';
  const label = fullName || loginFallback || '—';
  const loading = !person && !error;

  if (loading) {
    return (
      <span className={cn('inline-flex items-center', className)}>
        <Skeleton className="h-4 w-28" />
      </span>
    );
  }

  return (
    <span className={cn('truncate', className)} title={loginFallback || undefined}>
      {label}
      {showLoginName && fullName && loginFallback && (
        <span className="ml-2 font-mono text-[0.7rem] text-muted-foreground/80">
          {loginFallback}
        </span>
      )}
    </span>
  );
};
