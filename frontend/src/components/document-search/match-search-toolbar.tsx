'use client';

import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Field, FieldLabel } from '@components/ui/field';
import { Switch } from '@components/ui/switch';
import { Eyebrow } from '@components/ui/eyebrow';

interface MatchSearchToolbarProps {
  totalRecords: number | undefined;
  includeHistoricalRevisions: boolean;
  onIncludeHistoricalChange: (value: boolean) => void;
}

export function MatchSearchToolbar({
  totalRecords,
  includeHistoricalRevisions,
  onIncludeHistoricalChange,
}: MatchSearchToolbarProps) {
  const { t } = useTranslation();
  const switchId = useId();

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <Eyebrow aria-live="polite">
        {t('common:documents_match_results_count', { count: totalRecords ?? 0 })}
      </Eyebrow>
      <Field orientation="horizontal" className="ml-auto w-auto">
        <Switch
          id={switchId}
          size="sm"
          checked={includeHistoricalRevisions}
          onCheckedChange={onIncludeHistoricalChange}
        />
        <FieldLabel htmlFor={switchId} className="text-xs text-muted-foreground">
          {t('common:documents_match_include_historical')}
        </FieldLabel>
      </Field>
    </div>
  );
}
