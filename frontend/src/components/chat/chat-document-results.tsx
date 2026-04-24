'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge } from '@components/ui/badge';
import { cn } from '@lib/utils';
import { ChevronRight, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface ChatDocumentResult {
  registrationNumber: string;
  title: string | null;
  documentType: string | null;
  status: string | null;
  validFrom: string | null;
  validTo: string | null;
  matchReason: string | null;
  snippet: string | null;
}

export interface ChatDocumentResultsPayload {
  type: 'document_results';
  summary: string | null;
  documents: ChatDocumentResult[];
  followUp: string | null;
}

interface ChatDocumentResultsProps {
  payload: ChatDocumentResultsPayload;
}

export function ChatDocumentResults({ payload }: ChatDocumentResultsProps) {
  const { t } = useTranslation();
  const params = useParams<{ locale?: string }>();
  const locale = typeof params.locale === 'string' ? params.locale : 'sv';

  return (
    <div className="space-y-3 whitespace-normal">
      {payload.summary ? <p className="text-sm leading-relaxed">{payload.summary}</p> : null}

      {payload.documents.length > 0 ? (
        <div className="space-y-2">
          {payload.documents.map((document) => {
            const title = document.title?.trim() || t('chat.document_results.no_title');
            const href = `/${locale}/documents/${encodeURIComponent(document.registrationNumber)}`;

            return (
              <Link
                key={document.registrationNumber}
                href={href}
                className={cn(
                  'group block rounded-md border border-border bg-card px-3 py-2.5 text-foreground no-underline shadow-sm transition-colors',
                  'hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                )}
                aria-label={t('chat.document_results.open_document', {
                  registrationNumber: document.registrationNumber,
                  title,
                })}
              >
                <div className="flex min-w-0 items-start gap-2.5">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" aria-hidden />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
                          {title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                          <span className="font-mono tabular-nums">
                            {document.registrationNumber}
                          </span>
                          {document.documentType ? <span>{document.documentType}</span> : null}
                        </div>
                      </div>

                      <ChevronRight
                        className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                        aria-hidden
                      />
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {document.status ? (
                        <Badge variant="outline" className="h-5 px-1.5 text-[11px]">
                          {document.status}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t('chat.document_results.no_results')}</p>
      )}

      {payload.followUp ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{payload.followUp}</p>
      ) : null}
    </div>
  );
}
