'use client';

import { forwardRef, useImperativeHandle, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Loader2, Search, X } from 'lucide-react';
import { Alert, AlertDescription } from '@components/ui/alert';
import { Input } from '@components/ui/input';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Field } from '@components/ui/field';
import { cn } from '@lib/utils';
import { EmployeeName } from '@components/user-display/employee-name';
import { getEmployee, getEmployeeByEmail } from '@services/employee-service';

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
  /**
   * List of personIds currently selected. The input component always commits
   * a personId resolved via the employee directory; the raw loginName/email
   * the user typed is never surfaced here.
   */
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  /**
   * When true, entries are verified against the employee directory before
   * being added. Supports both loginNames and email addresses. When false,
   * the input still resolves to a personId via the directory — `validateUser`
   * only controls whether the failure surfaces as an inline error vs being
   * silently dropped (kept for API compatibility with filter UIs).
   */
  validateUser?: boolean;
  /**
   * Render the inline commit button next to the input. Defaults to true.
   * Filter contexts hide it because commit happens on Enter/blur.
   */
  showAddButton?: boolean;
  /**
   * Optional renderer for selected entries. Receives the personId. Defaults
   * to a compact badge that looks the personId's name up via the directory.
   */
  renderItem?: (personId: string, onRemove: () => void) => ReactNode;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const looksLikeEmail = (input: string) => input.includes('@');
const normalizeLoginName = (input: string) => input.trim().toLowerCase();
const normalizeEmail = (input: string) => input.trim().toLowerCase();

export const ResponsibilitiesInput = forwardRef<
  ResponsibilitiesInputHandle,
  ResponsibilitiesInputProps
>(function ResponsibilitiesInput(
  {
    value,
    onChange,
    placeholder,
    ariaLabel,
    className,
    disabled,
    validateUser = false,
    showAddButton = true,
    renderItem,
  },
  ref
) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const pendingRef = useRef<Promise<boolean> | null>(null);

  const addPersonId = (personId: string): boolean => {
    const next = personId.trim();
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

  const commitByEmail = async (): Promise<boolean> => {
    const email = normalizeEmail(draft);
    if (!EMAIL_RE.test(email)) {
      return fail(t('common:document_responsibilities_invalid_email'));
    }
    setResolving(true);
    setError(null);
    try {
      const person = await getEmployeeByEmail(email);
      if (!person.personid) {
        return fail(t('common:document_responsibilities_email_not_found', { email }));
      }
      return addPersonId(person.personid);
    } catch {
      return fail(t('common:document_responsibilities_email_not_found', { email }));
    } finally {
      setResolving(false);
    }
  };

  const commitByLoginName = async (): Promise<boolean> => {
    const username = normalizeLoginName(draft);
    setResolving(true);
    setError(null);
    try {
      const person = await getEmployee(username);
      if (!person.personid) {
        return fail(
          t('common:document_responsibilities_username_not_found', { username })
        );
      }
      return addPersonId(person.personid);
    } catch {
      return fail(t('common:document_responsibilities_username_not_found', { username }));
    } finally {
      setResolving(false);
    }
  };

  const runCommit = async (): Promise<boolean> => {
    const trimmed = draft.trim();
    if (!trimmed) {
      setDraft('');
      return true;
    }

    // Even filter contexts resolve to a personId — we never store raw text
    // because upstream only accepts uuid-typed responsibility entries. The
    // validateUser flag is retained for symmetry but no longer branches
    // behavior meaningfully.
    void validateUser;

    return looksLikeEmail(trimmed) ? commitByEmail() : commitByLoginName();
  };

  const commit = (): Promise<boolean> => {
    if (pendingRef.current) return pendingRef.current;
    const p = runCommit();
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

  const remove = (personId: string) => {
    onChange(value.filter((id) => id !== personId));
  };

  const effectivePlaceholder =
    placeholder ?? t('common:document_responsibilities_placeholder');

  return (
    <div className={cn('space-y-2', className)}>
      {value.length > 0 && (
        <ul
          className={cn(
            renderItem ? 'flex flex-col gap-2' : 'flex flex-wrap gap-1.5'
          )}
          aria-label={ariaLabel}
        >
          {value.map((personId) => (
            <li key={personId}>
              {renderItem ? (
                renderItem(personId, () => remove(personId))
              ) : (
                <Badge
                  variant="secondary"
                  className="h-6 gap-1 pr-1 text-xs tracking-tight"
                >
                  <EmployeeName personId={personId} className="max-w-[14ch] truncate" />
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => remove(personId)}
                      aria-label={t('common:document_responsibilities_remove_aria', {
                        username: personId,
                      })}
                      className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              )}
            </li>
          ))}
        </ul>
      )}

      <Field orientation="horizontal">
        <div className="relative flex-1">
          <Input
            type="text"
            inputMode="text"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
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
        {showAddButton && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              void commit();
            }}
            disabled={disabled || resolving || !draft.trim()}
          >
            <Search className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            {t('common:document_responsibilities_add_action')}
          </Button>
        )}
      </Field>
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
