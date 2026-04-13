'use client';

import { useTranslation } from 'react-i18next';
import { Button } from '@components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-24">
      <AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
      <h2 className="mb-2 text-xl font-bold">{t('common:error_title')}</h2>
      <p className="mb-6 text-sm text-muted-foreground">{t('common:error_description')}</p>
      <Button onClick={() => reset()}>{t('common:error_retry')}</Button>
    </div>
  );
}
