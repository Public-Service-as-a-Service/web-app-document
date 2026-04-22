'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@components/ui/alert';
import { Separator } from '@components/ui/separator';
import { StatisticsRangeForm } from './statistics-range-form';
import { StatisticsOverview } from './statistics-overview';
import { StatisticsBreakdown } from './statistics-breakdown';
import { useDocumentStatistics, type StatisticsRange } from './use-document-statistics';
import { useDocumentDetail } from './document-detail-context';

export const StatisticsTab = () => {
  const { t } = useTranslation();
  const { registrationNumber, locale } = useDocumentDetail();
  const [range, setRange] = useState<StatisticsRange>({});
  const { statistics, loading, error } = useDocumentStatistics(registrationNumber, range);

  return (
    <div className="mt-5 space-y-5">
      <StatisticsRangeForm onChange={setRange} locale={locale} />

      <Separator />

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{t('common:statistics_loading_error')}</AlertDescription>
        </Alert>
      ) : loading && !statistics ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      ) : (
        <>
          <StatisticsOverview statistics={statistics} />
          <StatisticsBreakdown statistics={statistics} />
        </>
      )}
    </div>
  );
};
