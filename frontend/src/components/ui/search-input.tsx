'use client';

import { forwardRef, type InputHTMLAttributes, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';
import { cn } from '@lib/utils';

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onSearch?: (value: string) => void;
  onClear?: () => void;
  /**
   * Optional keyboard shortcut label rendered as a <kbd> adornment on the
   * right side of the input on desktop (>= md). Pass a string like "⌘K";
   * on non-Apple platforms it is rendered as "Ctrl+K".
   * The shortcut is hidden while the input has a value or the clear button
   * is showing, and on viewports below md.
   */
  shortcut?: string;
}

const getIsApplePlatform = () => {
  if (typeof navigator === 'undefined') return true;
  const userAgentDataPlatform = (
    navigator as Navigator & { userAgentData?: { platform?: string } }
  ).userAgentData?.platform;
  const platform = `${userAgentDataPlatform ?? navigator.platform ?? ''} ${navigator.userAgent ?? ''}`.toLowerCase();
  return /mac|iphone|ipad|ipod/.test(platform);
};

const toPlatformShortcutLabel = (shortcut: string, useAppleSymbols: boolean) => {
  if (useAppleSymbols) return shortcut;
  return shortcut
    .replaceAll('⌘', 'Ctrl+')
    .replaceAll('⌃', 'Ctrl+')
    .replaceAll('⌥', 'Alt+')
    .replaceAll('⇧', 'Shift+');
};

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value, onChange, onSearch, onClear, shortcut, ...props }, ref) => {
    const { t } = useTranslation();
    const hasValue = value !== undefined && value !== null && String(value).length > 0;
    const useAppleShortcutSymbols = useMemo(() => getIsApplePlatform(), []);

    const shortcutLabel = useMemo(
      () =>
        shortcut ? toPlatformShortcutLabel(shortcut, useAppleShortcutSymbols) : undefined,
      [shortcut, useAppleShortcutSymbols]
    );

    const handleClear = () => {
      if (onClear) onClear();
      if (onSearch) onSearch('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && onSearch) {
        onSearch((e.target as HTMLInputElement).value);
        return;
      }
      if (e.key === 'Escape' && hasValue) {
        e.preventDefault();
        handleClear();
        (e.target as HTMLInputElement).blur();
      }
    };

    return (
      <div className={cn('relative', className)}>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          ref={ref}
          type="text"
          data-search-input="true"
          className={cn(
            'flex h-10 w-full rounded-lg border border-input bg-background pl-10 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            hasValue ? 'pr-10' : shortcutLabel ? 'pr-10 md:pr-16' : 'pr-10'
          )}
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          {...props}
        />
        {hasValue ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={t('common:search_clear')}
          >
            <X className="h-4 w-4" />
          </button>
        ) : shortcutLabel ? (
          <kbd
            suppressHydrationWarning
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-xs text-muted-foreground md:inline-flex"
          >
            {shortcutLabel}
          </kbd>
        ) : null}
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';

export { SearchInput };
