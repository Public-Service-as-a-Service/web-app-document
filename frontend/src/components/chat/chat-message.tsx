'use client';

import { cn } from '@lib/utils';
import { AlertCircle, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ChatMessage as ChatMessageType } from '@stores/chat-store';

interface ChatMessageProps {
  message: ChatMessageType;
  streaming?: boolean;
}

export function ChatMessage({ message, streaming }: ChatMessageProps) {
  const { t } = useTranslation();
  const isUser = message.role === 'user';
  const showTypingCursor = !isUser && streaming && message.content.length > 0;
  const showPendingDots = !isUser && streaming && message.content.length === 0;

  return (
    <div
      data-slot="chat-message"
      className={cn('flex w-full gap-2', isUser ? 'justify-end' : 'justify-start')}
    >
      {!isUser ? (
        <div
          aria-hidden
          className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground"
        >
          <Sparkles className="h-3.5 w-3.5" />
        </div>
      ) : null}
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-muted text-foreground rounded-bl-sm',
          message.errored && 'border border-destructive/40'
        )}
      >
        {showPendingDots ? (
          <span
            className="inline-flex items-center gap-1 text-muted-foreground"
            aria-label={t('chat.typing')}
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:300ms]" />
          </span>
        ) : (
          <>
            {message.content}
            {showTypingCursor ? (
              <span
                aria-hidden
                className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-current align-middle"
              />
            ) : null}
          </>
        )}
        {message.errored ? (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" />
            <span>{t('chat.error_generic')}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
