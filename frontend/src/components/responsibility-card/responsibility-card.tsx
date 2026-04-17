'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback } from '@components/ui/avatar';
import { Badge } from '@components/ui/badge';
import { Skeleton } from '@components/ui/skeleton';
import { Mail, Phone, Smartphone, ShieldCheck, AlertCircle } from 'lucide-react';
import { getEmployee } from '@services/employee-service';
import type { PortalPersonDto } from '@data-contracts/backend/data-contracts';

type OrgSegment = { level: number; id: string; name: string };

const parseOrgTree = (orgTree: string | undefined): OrgSegment[] => {
  if (!orgTree) return [];
  return orgTree
    .split('¤')
    .map((segment) => segment.split('|'))
    .filter((parts) => parts.length >= 3)
    .map(([level, id, ...nameParts]) => ({
      level: Number(level) || 0,
      id: id || '',
      name: nameParts.join('|').trim(),
    }))
    .filter((segment) => segment.name.length > 0);
};

// Collapse consecutive duplicates — upstream pads out to 6 levels with repeats.
const uniqueOrgPath = (segments: OrgSegment[]): string[] => {
  const names: string[] = [];
  for (const segment of segments) {
    if (names[names.length - 1] !== segment.name) {
      names.push(segment.name);
    }
  }
  return names;
};

const getInitials = (person: PortalPersonDto): string => {
  const first = person.givenname?.[0] ?? '';
  const last = person.lastname?.[0] ?? '';
  const initials = `${first}${last}`.trim();
  return initials || person.fullname?.[0]?.toUpperCase() || '?';
};

type ResponsibilityCardProps = {
  username: string;
};

export const ResponsibilityCard = ({ username }: ResponsibilityCardProps) => {
  const { t } = useTranslation();
  const [person, setPerson] = useState<PortalPersonDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getEmployee(username)
      .then((data) => {
        if (cancelled) return;
        setPerson(data);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [username]);

  if (loading) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-dashed border-border bg-card p-4 shadow-sm">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
          aria-hidden="true"
        >
          <AlertCircle className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-sm tracking-tight text-foreground">{username}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('common:document_responsibilities_lookup_error')}
          </p>
        </div>
      </div>
    );
  }

  const orgPath = uniqueOrgPath(parseOrgTree(person.orgTree));
  const department = orgPath[orgPath.length - 1];
  const fullPath = orgPath.join(' › ');

  return (
    <div className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/30 hover:bg-accent/30">
      <Avatar size="lg" className="shrink-0">
        <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
          {getInitials(person)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate font-semibold text-foreground">
            {person.givenname} {person.lastname}
          </p>
          {person.isManager && (
            <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[0.7rem] font-medium">
              <ShieldCheck className="h-3 w-3" aria-hidden="true" />
              {t('common:document_responsibilities_manager')}
            </Badge>
          )}
        </div>

        {department && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground" title={fullPath}>
            {department}
          </p>
        )}

        <div className="mt-2 flex flex-col gap-1 text-xs">
          {person.email && (
            <a
              href={`mailto:${person.email}`}
              className="inline-flex min-w-0 items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"
            >
              <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{person.email}</span>
            </a>
          )}
          {person.workPhone && (
            <a
              href={`tel:${person.workPhone.replace(/\s+/g, '')}`}
              className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"
            >
              <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="tabular-nums">{person.workPhone}</span>
            </a>
          )}
          {person.mobilePhone && (
            <a
              href={`tel:${person.mobilePhone.replace(/\s+/g, '')}`}
              className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"
            >
              <Smartphone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="tabular-nums">{person.mobilePhone}</span>
            </a>
          )}
        </div>

        <p className="mt-2 font-mono text-[0.65rem] uppercase tracking-wide text-muted-foreground/70">
          {username}
        </p>
      </div>
    </div>
  );
};
