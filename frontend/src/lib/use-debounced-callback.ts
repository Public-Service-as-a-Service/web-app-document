'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Returns a stable debounced wrapper around `fn` that fires `delay` ms after
 * the latest call. The returned function exposes a `cancel()` method that
 * clears the pending timer. Any pending timer is cleared on unmount.
 *
 * The wrapper keeps its identity across renders so it is safe to use as a
 * dependency in effects or as an event handler without triggering re-renders.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDebouncedCallback<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): T & { cancel: () => void } {
  const fnRef = useRef(fn);
  const delayRef = useRef(delay);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  useEffect(() => {
    delayRef.current = delay;
  }, [delay]);

  // Build the debounced wrapper exactly once per mount. It closes over the
  // refs above so `fn` / `delay` stay fresh without producing a new function
  // identity (which would defeat the purpose of a stable debouncer).
  const [debounced] = useState<T & { cancel: () => void }>(() => {
    const cancel = () => {
      const id = timerRef.current;
      if (id !== null) {
        clearTimeout(id);
        timerRef.current = null;
      }
    };

    const invoke = ((...args: Parameters<T>) => {
      const id = timerRef.current;
      if (id !== null) {
        clearTimeout(id);
      }
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        fnRef.current(...args);
      }, delayRef.current);
    }) as T & { cancel: () => void };

    invoke.cancel = cancel;
    return invoke;
  });

  useEffect(() => {
    return () => {
      const id = timerRef.current;
      if (id !== null) {
        clearTimeout(id);
        timerRef.current = null;
      }
    };
  }, []);

  return debounced;
}
