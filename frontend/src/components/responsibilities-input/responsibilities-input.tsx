'use client';

import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { Alert, AlertDescription } from '@components/ui/alert';
import { Input } from '@components/ui/input';
import { Badge } from '@components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@components/ui/toggle-group';
import { cn } from '@lib/utils';
import { getEmployee, getEmployeeByEmail } from '@services/employee-service';

type Mode = 'username' | 'email';

export interface ResponsibilitiesInputHandle {
  /**
   * Wait for any in-flight resolve and commit any unresolved draft text.
   * Returns true if the input is in a clean state (no pending text, or the
   * pending text resolved to a user). Returns false if there is an
   * unresolved error — callers should abort save in that case.
   */
  flush: () => Promise<boolean>;
}

interface ResponsibilitiesInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  enableEmailLookup?: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizeUsername = (input: string) => input.trim().toLowerCase();
const normalizeEmail = (input: string) => input.trim().toLowerCase();

export const ResponsibilitiesInput = forwardRef<
  ResponsibilitiesInputHandle,
  ResponsibilitiesInputProps
>(function ResponsibilitiesInput(
  { value, onChange, placeholder, ariaLabel, className, disabled, enableEmailLookup = false },
  ref
) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>('username');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const pendingRef = useRef<Promise<boolean> | null>(null);

  const addUsername = (username: string): boolean => {
    const next = normalizeUsername(username);
    if (!next) return false;
    if (value.includes(next)) {
      setError(t('common:document_responsibilities_duplicate'));
      return false;
    }
    onChange([...value, next]);
    setDraft('');
    setError(null);
    return true;
  };

  const fail = (message: string): boolean => {
    setError(message);
    return false;
  };

  const commitUsername = async (): Promise<boolean> => {
    const next = normalizeUsername(draft);
    if (!next) {
      setDraft('');
      return true;
    }
    if (value.includes(next)) {
      setError(t('common:document_responsibilities_duplicate'));
      return false;
    }

    setResolving(true);
    setError(null);
    try {
      const person = await getEmployee(next);
      if (!person.loginName) {
        return fail(t('common:document_responsibilities_username_not_found', { username: next }));
      }
      return addUsername(person.loginName);
    } catch {
      return fail(t('common:document_responsibilities_username_not_found', { username: next }));
    } finally {
      setResolving(false);
    }
  };

  const commitEmail = async (): Promise<boolean> => {
    const email = normalizeEmail(draft);
    if (!email) {
      setDraft('');
      return true;
    }
    if (!EMAIL_RE.test(email)) {
      return fail(t('common:document_responsibilities_invalid_email'));
    }

    setResolving(true);
    setError(null);
    try {
      const person = await getEmployeeByEmail(email);
      if (!person.loginName) {
        return fail(t('common:document_responsibilities_email_not_found', { email }));
      }
      return addUsername(person.loginName);
    } catch {
      return fail(t('common:document_responsibilities_email_not_found', { email }));
    } finally {
      setResolving(false);
    }
  };

  const commit = (): Promise<boolean> => {
    const p = mode === 'email' ? commitEmail() : commitUsername();
    pendingRef.current = p;
    void p.finally(() => {
      if (pendingRef.current === p) pendingRef.current = null;
    });
    return p;
  };

  useImperativeHandle(ref, () => ({
    async flush() {
      if (pendingRef.current) {
        try {
          const ok = await pendingRef.current;
          if (!ok) return false;
        } catch {
          return false;
        }
      }
      if (draft.trim()) {
        return commit();
      }
      return true;
    },
  }));

  const remove = (username: string) => {
    onChange(value.filter((u) => u !== username));
  };

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setError(null);
  };

  const effectivePlaceholder =
    placeholder ??
    (mode === 'email'
      ? t('common:document_responsibilities_placeholder_email')
      : t('common:document_responsibilities_placeholder'));

  return (
    <div className={cn('space-y-2', className)}>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={ariaLabel}>
          {value.map((username) => (
            <li key={username}>
              <Badge
                variant="secondary"
                className="h-6 gap-1 pr-1 font-mono text-xs tracking-tight"
              >
                <span>{username}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => remove(username)}
                    aria-label={t('common:document_responsibilities_remove_aria', {
                      username,
                    })}
                    className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            </li>
          ))}
        </ul>
      )}

      {enableEmailLookup && (
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={mode}
          onValueChange={(next) => {
            if (next === 'username' || next === 'email') switchMode(next);
          }}
          disabled={disabled || resolving}
          aria-label={t('common:document_responsibilities_mode_aria')}
        >
          <ToggleGroupItem value="username">
            {t('common:document_responsibilities_mode_username')}
          </ToggleGroupItem>
          <ToggleGroupItem value="email">
            {t('common:document_responsibilities_mode_email')}
          </ToggleGroupItem>
        </ToggleGroup>
      )}

      <div className="relative">
        <Input
          type={mode === 'email' ? 'email' : 'text'}
          inputMode={mode === 'email' ? 'email' : 'text'}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || (mode === 'username' && e.key === ',')) {
              e.preventDefault();
              void commit();
            } else if (e.key === 'Backspace' && draft.length === 0 && value.length > 0) {
              remove(value[value.length - 1]);
            }
          }}
          onBlur={() => {
            void commit();
          }}
          placeholder={effectivePlaceholder}
          aria-label={ariaLabel ?? t('common:document_responsibilities_label')}
          aria-invalid={error ? true : undefined}
          aria-busy={resolving || undefined}
          disabled={disabled || resolving}
          className={cn(resolving && 'pr-9')}
        />
        {resolving && (
          <Loader2
            aria-hidden
            className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
          />
        )}
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {resolving && (
        <p className="sr-only" role="status">
          {t('common:document_responsibilities_resolving')}
        </p>
      )}
    </div>
  );
});
