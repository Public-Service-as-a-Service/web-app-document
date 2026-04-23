'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Eye, FileText as FileTextIcon } from 'lucide-react';
import { Badge } from '@components/ui/badge';
import { Card } from '@components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@components/ui/accordion';
import { toDisplayRevision } from '@utils/document-revision';
import type {
  DocumentStatistics,
  FileStatistics,
  RevisionStatistics,
} from '@interfaces/document.interface';

interface RevisionRowProps {
  revision: RevisionStatistics;
  fallbackFileName: string;
}

const RevisionRow = ({ revision, fallbackFileName }: RevisionRowProps) => {
  const { t } = useTranslation();
  const display = toDisplayRevision(revision.revision ?? 0);
  const files: FileStatistics[] = revision.perFile ?? [];

  return (
    <AccordionItem value={String(revision.revision ?? 0)} className="border-border">
      <AccordionTrigger className="px-4 hover:no-underline">
        <div className="flex flex-1 items-center gap-3 pr-2">
          <Badge variant="secondary" className="h-6 px-2 font-mono text-[0.7rem]">
            {t('common:document_revision')} {display}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {t('common:statistics_files_count', { count: files.length })}
          </span>
          <div className="ml-auto flex items-center gap-4 text-sm tabular-nums">
            <span className="inline-flex items-center gap-1.5 text-chart-2">
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="font-mono">{(revision.views ?? 0).toLocaleString('sv-SE')}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-chart-1">
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="font-mono">{(revision.downloads ?? 0).toLocaleString('sv-SE')}</span>
            </span>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4">
        {files.length === 0 ? (
          <p className="py-2 text-xs text-muted-foreground">{t('common:statistics_files_empty')}</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-background">
            {files.map((file, i) => (
              <li
                key={file.documentDataId ?? `file-${i}`}
                className="flex items-center gap-3 px-3 py-2.5"
              >
                <FileTextIcon
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <span
                  className="min-w-0 flex-1 truncate text-sm"
                  title={file.fileName || undefined}
                >
                  {file.fileName || fallbackFileName}
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono text-xs tabular-nums text-chart-2">
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  {(file.views ?? 0).toLocaleString('sv-SE')}
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono text-xs tabular-nums text-chart-1">
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  {(file.downloads ?? 0).toLocaleString('sv-SE')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </AccordionContent>
    </AccordionItem>
  );
};

export interface StatisticsBreakdownProps {
  statistics: DocumentStatistics | null;
}

export const StatisticsBreakdown = ({ statistics }: StatisticsBreakdownProps) => {
  const { t } = useTranslation();

  // Breakdown list is ordered newest-first for scanning; the overview chart
  // shows the same data oldest-first to read as a timeline.
  const sortedRevisions = useMemo(() => {
    const revisions = statistics?.perRevision ?? [];
    return revisions.slice().sort((a, b) => (b.revision ?? 0) - (a.revision ?? 0));
  }, [statistics]);

  if (sortedRevisions.length === 0) {
    return null;
  }

  const latest = sortedRevisions[0];
  const defaultValue = latest ? String(latest.revision ?? 0) : undefined;

  return (
    <Card className="p-0">
      <div className="border-b border-border px-5 py-4">
        <h3 className="text-sm font-semibold text-foreground">
          {t('common:statistics_breakdown_title')}
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t('common:statistics_breakdown_description')}
        </p>
      </div>
      <Accordion type="single" collapsible defaultValue={defaultValue} className="px-1">
        {sortedRevisions.map((revision) => (
          <RevisionRow
            key={revision.revision ?? 0}
            revision={revision}
            fallbackFileName={t('common:statistics_file_fallback_name')}
          />
        ))}
      </Accordion>
    </Card>
  );
};
