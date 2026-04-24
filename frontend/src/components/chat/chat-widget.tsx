'use client';

import { useEffect } from 'react';
import { Button } from '@components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@components/ui/tooltip';
import { MessageSquare, RotateCcw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@lib/utils';
import { useChatStore } from '@stores/chat-store';
import { ChatMessages } from './chat-messages';
import { ChatInput } from './chat-input';

export function ChatWidget() {
  const { t } = useTranslation();
  const isOpen = useChatStore((s) => s.isOpen);
  const toggleWidget = useChatStore((s) => s.toggleWidget);
  const closeWidget = useChatStore((s) => s.closeWidget);
  const resetConversation = useChatStore((s) => s.resetConversation);
  const hasMessages = useChatStore((s) => s.messages.length > 0);
  const isStreaming = useChatStore((s) => s.isStreaming);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isStreaming) {
        closeWidget();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, isStreaming, closeWidget]);

  return (
    <TooltipProvider delayDuration={200}>
      <div
        data-slot="chat-widget"
        className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-3 md:right-6 md:bottom-6"
      >
        <div
          role="dialog"
          aria-modal="false"
          aria-label={t('chat.panel_label')}
          aria-hidden={!isOpen}
          className={cn(
            'flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl',
            'origin-bottom-right transition-all duration-200 ease-out',
            'h-[min(640px,calc(100dvh-6rem))] w-[min(420px,calc(100vw-2rem))]',
            isOpen
              ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
              : 'pointer-events-none translate-y-2 scale-95 opacity-0'
          )}
        >
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-4 py-3">
            <div className="flex min-w-0 flex-col">
              <span className="text-sm font-medium text-foreground">{t('chat.title')}</span>
              <span className="truncate text-xs text-muted-foreground">{t('chat.subtitle')}</span>
            </div>
            <div className="flex items-center gap-1">
              {hasMessages ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={resetConversation}
                      disabled={isStreaming}
                      aria-label={t('chat.reset')}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{t('chat.reset')}</TooltipContent>
                </Tooltip>
              ) : null}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={closeWidget}
                    aria-label={t('chat.close')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{t('chat.close')}</TooltipContent>
              </Tooltip>
            </div>
          </header>
          <ChatMessages />
          <ChatInput />
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              onClick={toggleWidget}
              aria-label={isOpen ? t('chat.close') : t('chat.open')}
              aria-expanded={isOpen}
              className="h-12 w-12 rounded-full shadow-xl transition-transform duration-200 hover:scale-105"
            >
              {isOpen ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">{isOpen ? t('chat.close') : t('chat.open')}</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
