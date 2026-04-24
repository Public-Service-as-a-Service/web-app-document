'use client';

import { useEffect, useRef } from 'react';
import { ScrollArea } from '@components/ui/scroll-area';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@components/ui/empty';
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useChatStore } from '@stores/chat-store';
import { ChatMessage } from './chat-message';

export function ChatMessages() {
  const { t } = useTranslation();
  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Smooth-scroll the last message into view as tokens stream in.
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isStreaming]);

  if (messages.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-6">
        <Empty className="border-none p-0">
          <EmptyHeader>
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <EmptyTitle className="text-base">{t('chat.empty_title')}</EmptyTitle>
            <EmptyDescription className="text-sm">{t('chat.empty_description')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const lastMessage = messages[messages.length - 1];
  const lastIsStreamingAssistant = isStreaming && lastMessage?.role === 'assistant';

  return (
    <ScrollArea className="min-h-0 flex-1 overflow-hidden px-4 py-3">
      <div className="flex flex-col gap-3 pb-2">
        {messages.map((message, index) => (
          <ChatMessage
            key={message.id}
            message={message}
            streaming={lastIsStreamingAssistant && index === messages.length - 1}
          />
        ))}
        <div ref={bottomRef} aria-hidden />
      </div>
    </ScrollArea>
  );
}
