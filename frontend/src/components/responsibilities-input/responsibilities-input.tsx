'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Input } from '@components/ui/input';
import { Badge } from '@components/ui/badge';
import { cn } from '@lib/utils';

interface ResponsibilitiesInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
}

const normalize = (input: string) => input.trim().toLowerCase();

export function ResponsibilitiesInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  className,
  disabled,
}: ResponsibilitiesInputProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const commit = () => {
    const next = normalize(draft);
    if (!next) {
      setDraft('');
      return;
    }
    if (value.includes(next)) {
      setError(t('common:document_responsibilities_duplicate'));
      return;
    }
    onChange([...value, next]);
    setDraft('');
    setError(null);
  };

  const remove = (username: string) => {
    onChange(value.filter((u) => u !== username));
  };

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
      <Input
        type="text"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          if (error) setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Backspace' && draft.length === 0 && value.length > 0) {
            remove(value[value.length - 1]);
          }
        }}
        onBlur={commit}
        placeholder={placeholder ?? t('common:document_responsibilities_placeholder')}
        aria-label={ariaLabel ?? t('common:document_responsibilities_label')}
        aria-invalid={error ? true : undefined}
        disabled={disabled}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
