import type { TFunction } from 'i18next';
import { getProblemStatus } from '@interfaces/upstream-problem';

export type LifecycleAction = 'publish' | 'revoke' | 'unrevoke';

const EXPIRED_ERROR_KEYS: Partial<Record<LifecycleAction, string>> = {
  publish: 'common:document_publish_expired_error',
  unrevoke: 'common:document_unrevoke_expired_error',
};

export const resolveLifecycleError = (
  error: unknown,
  action: LifecycleAction,
  t: TFunction
): string => {
  if (getProblemStatus(error) === 409) {
    const expiredKey = EXPIRED_ERROR_KEYS[action];
    if (expiredKey) return t(expiredKey);
  }
  return t('common:document_save_error');
};
