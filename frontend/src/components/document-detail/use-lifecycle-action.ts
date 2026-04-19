'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';

interface LifecycleActionOptions {
  action: () => Promise<void>;
  onSuccess?: () => void | Promise<void>;
  successMessage: string;
  resolveErrorMessage: (error: unknown) => string;
}

// publish/revoke/unrevoke all follow the same shape: flip a loading flag,
// call the upstream action, reset the pinned revision (handled via onSuccess),
// reload revisions, then toast. Keeping the wiring in one place means every
// lifecycle transition stays in sync (e.g. if we add optimistic updates later).
export const useLifecycleAction = ({
  action,
  onSuccess,
  successMessage,
  resolveErrorMessage,
}: LifecycleActionOptions) => {
  const [loading, setLoading] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    try {
      await action();
      if (onSuccess) await onSuccess();
      toast.success(successMessage);
    } catch (error) {
      toast.error(resolveErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [action, onSuccess, successMessage, resolveErrorMessage]);

  return { loading, run };
};
