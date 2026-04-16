'use client';

import { DocumentCard } from './document-card';
import { Skeleton } from '@components/ui/skeleton';
import { cn } from '@lib/utils';
import type { Document } from '@interfaces/document.interface';

interface DocumentCardListProps {
  documents: Document[];
  loading?: boolean;
  getHref: (doc: Document) => string;
  getTypeDisplayName: (type: string) => string;
  showRevision?: boolean;
  className?: string;
  skeletonCount?: number;
}

export function DocumentCardList({
  documents,
  loading,
  getHref,
  getTypeDisplayName,
  showRevision,
  className,
  skeletonCount = 4,
}: DocumentCardListProps) {
  if (loading) {
    return (
      <div className={cn('space-y-2.5', className)} aria-busy="true" aria-live="polite">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card p-4 shadow-sm"
          >
            <Skeleton className="mb-2 h-4 w-32" />
            <Skeleton className="mb-1 h-3 w-full" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <ul className={cn('space-y-2.5', className)}>
      {documents.map((doc, i) => (
        <li
          key={doc.registrationNumber + '-' + doc.revision}
          className="stagger-item"
          style={{ ['--i' as string]: i } as React.CSSProperties}
        >
          <DocumentCard
            doc={doc}
            href={getHref(doc)}
            typeDisplayName={getTypeDisplayName(doc.type)}
            showRevision={showRevision}
          />
        </li>
      ))}
    </ul>
  );
}
