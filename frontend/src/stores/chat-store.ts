'use client';

import { create } from 'zustand';
import { apiURL } from '@utils/api-url';
import { parseSseStream, type SseEvent } from '@utils/sse-parser';

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  /** Set on assistant messages when the stream fails mid-answer. */
  errored?: boolean;
}

interface ChatState {
  isOpen: boolean;
  sessionId: string | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  streamError: string | null;

  openWidget: () => void;
  closeWidget: () => void;
  toggleWidget: () => void;
  sendMessage: (question: string) => Promise<void>;
  resetConversation: () => void;
  abort: () => void;
}

let currentAbortController: AbortController | null = null;

const newId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const initialState = {
  isOpen: false,
  sessionId: null as string | null,
  messages: [] as ChatMessage[],
  isStreaming: false,
  streamError: null as string | null,
};

export const useChatStore = create<ChatState>((set, get) => ({
  ...initialState,

  openWidget: () => set({ isOpen: true }),
  closeWidget: () => set({ isOpen: false }),
  toggleWidget: () => set((state) => ({ isOpen: !state.isOpen })),

  abort: () => {
    currentAbortController?.abort();
    currentAbortController = null;
    set({ isStreaming: false });
  },

  resetConversation: () => {
    currentAbortController?.abort();
    currentAbortController = null;
    set({ ...initialState, isOpen: get().isOpen });
  },

  sendMessage: async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || get().isStreaming) return;

    const userMessage: ChatMessage = {
      id: newId(),
      role: 'user',
      content: trimmed,
      createdAt: Date.now(),
    };
    const assistantMessage: ChatMessage = {
      id: newId(),
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
    };

    set((state) => ({
      messages: [...state.messages, userMessage, assistantMessage],
      isStreaming: true,
      streamError: null,
    }));

    const controller = new AbortController();
    currentAbortController = controller;

    try {
      const response = await fetch(apiURL('chat', 'conversations'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          question: trimmed,
          ...(get().sessionId ? { sessionId: get().sessionId } : {}),
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Chat request failed (${response.status})`);
      }

      for await (const event of parseSseStream(response.body)) {
        handleSseEvent(event, assistantMessage.id, set);
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      set((state) => ({
        isStreaming: false,
        streamError: 'chat_stream_failed',
        messages: state.messages.map((m) =>
          m.id === assistantMessage.id ? { ...m, errored: true } : m
        ),
      }));
      return;
    }

    set({ isStreaming: false });
    currentAbortController = null;
  },
}));

// Translate an incoming SSE event into a state patch. Kept out of the
// store action body so the streaming logic reads top-to-bottom cleanly.
function handleSseEvent(
  event: SseEvent,
  assistantMessageId: string,
  set: (fn: (state: ChatState) => Partial<ChatState>) => void
): void {
  const payload = parseJson(event.data);

  switch (event.event) {
    case 'SSEFirstChunk': {
      const sessionId = typeof payload?.session_id === 'string' ? payload.session_id : null;
      if (sessionId) {
        set(() => ({ sessionId }));
      }
      return;
    }
    case 'SSEText': {
      const chunk = typeof payload?.text === 'string' ? payload.text : '';
      if (!chunk) return;
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === assistantMessageId ? { ...m, content: m.content + chunk } : m
        ),
      }));
      return;
    }
    case 'SSEError': {
      const message = typeof payload?.message === 'string' ? payload.message : 'chat_error';
      set((state) => ({
        streamError: message,
        messages: state.messages.map((m) =>
          m.id === assistantMessageId ? { ...m, errored: true } : m
        ),
      }));
      return;
    }
    default:
      return;
  }
}

function parseJson(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
