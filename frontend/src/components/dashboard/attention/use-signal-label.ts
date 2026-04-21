import { useTranslation } from 'react-i18next';
import type { AttentionSignal } from './types';

/**
 * Translate an AttentionSignal into its display string. Shared by the
 * dashboard list and the document detail banner so wording stays in sync.
 */
export const useSignalLabel = () => {
  const { t } = useTranslation();
  return (signal: AttentionSignal): string => {
    if (signal.kind === 'validTo') {
      return signal.daysLeft === 0
        ? t('common:dashboard_attention_expires_today')
        : t('common:dashboard_attention_expires_in', { count: signal.daysLeft });
    }
    const { daysLeft, personName } = signal;
    const name = personName || t('common:dashboard_attention_responsible_fallback');
    if (daysLeft < 0) {
      return t('common:dashboard_attention_responsible_expired', { name });
    }
    if (daysLeft === 0) {
      return t('common:dashboard_attention_responsible_expires_today', { name });
    }
    return t('common:dashboard_attention_responsible_expires_in', {
      name,
      count: daysLeft,
    });
  };
};
