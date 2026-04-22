import { type ComponentProps } from 'react';
import { cn } from '@lib/utils';

/**
 * Small uppercase meta-label used above page headers and beside toolbars.
 * Mirrors the mono-uppercase treatment used throughout the documents
 * surface so titles and counts share one voice.
 */
export function Eyebrow({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      className={cn(
        'font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground',
        className
      )}
      {...props}
    />
  );
}
