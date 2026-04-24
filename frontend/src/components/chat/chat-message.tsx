'use client';

import { cn } from '@lib/utils';
import { AlertCircle, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ChatMessage as ChatMessageType } from '@stores/chat-store';
import { ChatDocumentResults, type ChatDocumentResultsPayload } from './chat-document-results';

interface ChatMessageProps {
  message: ChatMessageType;
  streaming?: boolean;
}

export function ChatMessage({ message, streaming }: ChatMessageProps) {
  const { t } = useTranslation();
  const isUser = message.role === 'user';
  const documentResults = !isUser ? parseDocumentResultsPayload(message.content) : null;
  const looksLikeStructuredPayload =
    !isUser && !documentResults && looksLikeJsonPayload(message.content);
  const showTypingCursor = !isUser && streaming && message.content.length > 0;
  const showPendingDots =
    !isUser && streaming && (message.content.length === 0 || looksLikeStructuredPayload);

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
          documentResults && 'max-w-[92%] px-3 py-3',
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
        ) : documentResults ? (
          <ChatDocumentResults payload={documentResults} />
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

function parseDocumentResultsPayload(raw: string): ChatDocumentResultsPayload | null {
  const parsed = parseJsonPayload(raw);
  if (!parsed || parsed.type !== 'document_results' || !Array.isArray(parsed.documents)) {
    return null;
  }

  return {
    type: 'document_results',
    summary: asNullableString(parsed.summary),
    documents: parsed.documents
      .map((item) => {
        if (!isRecord(item)) return null;
        const registrationNumber = asNullableString(item.registrationNumber);
        if (!registrationNumber) return null;

        return {
          registrationNumber,
          title: asNullableString(item.title),
          documentType: asNullableString(item.documentType),
          status: asNullableString(item.status),
          validFrom: asNullableString(item.validFrom),
          validTo: asNullableString(item.validTo),
          matchReason: asNullableString(item.matchReason),
          snippet: asNullableString(item.snippet),
        };
      })
      .filter((item): item is ChatDocumentResultsPayload['documents'][number] => item !== null),
    followUp: asNullableString(parsed.followUp),
  };
}

function parseJsonPayload(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  const json = trimmed.startsWith('```') ? stripJsonFence(trimmed) : trimmed;

  try {
    const parsed = JSON.parse(json);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function stripJsonFence(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

function looksLikeJsonPayload(raw: string): boolean {
  const trimmed = raw.trim().toLowerCase();
  return trimmed.startsWith('{') || trimmed.startsWith('```');
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
