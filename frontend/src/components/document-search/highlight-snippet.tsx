'use client';

import { Fragment, type ComponentProps } from 'react';
import { cn } from '@lib/utils';

interface HighlightSnippetProps extends Omit<ComponentProps<'span'>, 'children'> {
  /**
   * Snippet with `<em>…</em>` wrapping matched terms. Any other HTML is
   * rendered as literal text — the tokenizer only accepts `<em>` open/close
   * pairs, so there is no path from the upstream payload to real DOM
   * injection. We deliberately avoid `dangerouslySetInnerHTML`.
   */
  text: string;
}

const EM_PATTERN = /<em>([\s\S]*?)<\/em>/g;

type Part = { t: 'text'; v: string } | { t: 'em'; v: string };

const tokenize = (text: string): Part[] => {
  const parts: Part[] = [];
  let lastIndex = 0;
  EM_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = EM_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ t: 'text', v: text.slice(lastIndex, match.index) });
    }
    parts.push({ t: 'em', v: match[1] });
    lastIndex = EM_PATTERN.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push({ t: 'text', v: text.slice(lastIndex) });
  }
  return parts;
};

export function HighlightSnippet({ text, className, ...props }: HighlightSnippetProps) {
  const parts = tokenize(text);

  return (
    <span className={cn('text-sm leading-relaxed', className)} {...props}>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {p.t === 'text' ? (
            p.v
          ) : (
            <mark className="rounded-[2px] bg-[var(--sd-amber)]/25 px-[2px] text-foreground">
              {p.v}
            </mark>
          )}
        </Fragment>
      ))}
    </span>
  );
}
