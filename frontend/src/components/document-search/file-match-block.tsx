'use client';

import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react';
import { HighlightSnippet } from './highlight-snippet';
import type { FileMatch } from '@interfaces/document.interface';

interface FileMatchBlockProps {
  file: FileMatch;
}

// Order highlight fields by editorial priority (title / description / filename
// / text body). Unknown fields fall to the end, alphabetical among themselves.
const FIELD_ORDER: readonly string[] = ['title', 'description', 'fileName', 'extractedText'];

// Map each field name to its i18n key. Fields not listed here show no label —
// the snippet still renders, which is the graceful fallback for unknown fields
// added upstream.
const FIELD_LABEL_KEYS: Record<string, string> = {
  title: 'common:documents_match_field_title',
  description: 'common:documents_match_field_description',
  fileName: 'common:documents_match_field_filename',
  extractedText: 'common:documents_match_field_text',
};

const orderFields = (highlights: FileMatch['highlights']): Array<[string, string[]]> => {
  return Object.entries(highlights ?? {}).sort(([a], [b]) => {
    const ai = FIELD_ORDER.indexOf(a);
    const bi = FIELD_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
};

export function FileMatchBlock({ file }: FileMatchBlockProps) {
  const { t } = useTranslation();
  const fields = orderFields(file.highlights);
  const totalSnippets = fields.reduce((sum, [, arr]) => sum + arr.length, 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-[13px] font-medium text-foreground">
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="truncate">{file.fileName}</span>
        <span
          className="ml-auto font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground"
          aria-label={t('common:documents_match_count', { count: totalSnippets })}
        >
          {totalSnippets}
        </span>
      </div>
      <ul className="flex flex-col gap-1.5 pl-6">
        {fields.map(([field, snippets]) =>
          snippets.map((snippet, i) => (
            <li key={`${field}-${i}`} className="flex gap-2 text-sm leading-relaxed">
              {FIELD_LABEL_KEYS[field] && (
                <span className="mt-0.5 shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  {t(FIELD_LABEL_KEYS[field])}
                </span>
              )}
              <HighlightSnippet text={snippet} className="min-w-0 text-muted-foreground" />
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
