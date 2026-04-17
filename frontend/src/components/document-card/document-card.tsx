'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@components/ui/badge';
import { cn } from '@lib/utils';
import { toDisplayRevision } from '@utils/document-revision';
import type { DocumentDto } from '@data-contracts/backend/data-contracts';
import dayjs from 'dayjs';

interface DocumentCardProps {
  doc: DocumentDto;
  href: string;
  typeDisplayName: string;
  showRevision?: boolean;
  className?: string;
}

export function DocumentCard({
  doc,
  href,
  typeDisplayName,
  showRevision = false,
  className,
}: DocumentCardProps) {
  const department = doc.metadataList?.find((m) => m.key === 'departmentOrgName')?.value;
  return (
    <Link
      href={href}
      className={cn(
        'group block rounded-lg border border-border bg-card p-4 text-foreground no-underline shadow-sm transition-all',
        'hover:border-primary/40 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold">{doc.registrationNumber}</span>
            {showRevision && (
              <Badge variant="secondary" className="h-5 px-1.5">
                r{toDisplayRevision(doc.revision)}
              </Badge>
            )}
          </div>
          {doc.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">{doc.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground">
            <span>{typeDisplayName}</span>
            <span aria-hidden="true">·</span>
            <span>{dayjs(doc.created).format('YYYY-MM-DD')}</span>
            {doc.createdBy && (
              <>
                <span aria-hidden="true">·</span>
                <span>{doc.createdBy}</span>
              </>
            )}
            {department && (
              <>
                <span aria-hidden="true">·</span>
                <span>{department}</span>
              </>
            )}
          </div>
        </div>
        <ChevronRight
          className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}
