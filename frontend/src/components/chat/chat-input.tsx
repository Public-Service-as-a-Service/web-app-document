'use client';

import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Button } from '@components/ui/button';
import { Textarea } from '@components/ui/textarea';
import { Send, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useChatStore } from '@stores/chat-store';

export function ChatInput() {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const abort = useChatStore((s) => s.abort);
  const isOpen = useChatStore((s) => s.isOpen);

  useEffect(() => {
    if (isOpen) {
      // Small delay lets the panel mount before we steal focus,
      // otherwise the browser ignores the request.
      const id = window.setTimeout(() => textareaRef.current?.focus(), 50);
      return () => window.clearTimeout(id);
    }
  }, [isOpen]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    // Cap auto-grow at ~6 rows so the input never crowds the messages list.
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [value]);

  const submit = () => {
    if (!value.trim() || isStreaming) return;
    const question = value;
    setValue('');
    void sendMessage(question);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form
      className="flex items-end gap-2 border-t border-border bg-card px-3 py-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={t('chat.input_placeholder')}
        rows={1}
        className="max-h-[180px] min-h-[40px] flex-1 resize-none"
        aria-label={t('chat.input_label')}
      />
      {isStreaming ? (
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={abort}
          aria-label={t('chat.stop')}
        >
          <Square className="h-4 w-4 fill-current" />
        </Button>
      ) : (
        <Button type="submit" size="icon" disabled={!value.trim()} aria-label={t('chat.send')}>
          <Send className="h-4 w-4" />
        </Button>
      )}
    </form>
  );
}
