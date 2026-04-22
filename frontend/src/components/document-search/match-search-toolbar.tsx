'use client';

import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch } from '@components/ui/switch';

interface MatchSearchToolbarProps {
  totalRecords: number | undefined;
  includeHistoricalRevisions: boolean;
  onIncludeHistoricalChange: (value: boolean) => void;
  showResultCount: boolean;
}

export function MatchSearchToolbar({
  totalRecords,
  includeHistoricalRevisions,
  onIncludeHistoricalChange,
  showResultCount,
}: MatchSearchToolbarProps) {
  const { t } = useTranslation();
  const switchId = useId();

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      {showResultCount ? (
        <p
          aria-live="polite"
          className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground"
        >
          {t('common:documents_match_results_count', { count: totalRecords ?? 0 })}
        </p>
      ) : (
        <span />
      )}
      <label
        htmlFor={switchId}
        className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground"
      >
        <Switch
          id={switchId}
          size="sm"
          checked={includeHistoricalRevisions}
          onCheckedChange={onIncludeHistoricalChange}
        />
        <span>{t('common:documents_match_include_historical')}</span>
      </label>
    </div>
  );
}
