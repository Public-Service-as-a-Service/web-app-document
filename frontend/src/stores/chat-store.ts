'use client';

import { create } from 'zustand';
import { apiURL } from '@utils/api-url';
import { parseSseStream, type SseEvent } from '@utils/sse-parser';

// Mirror what services/api-service.ts does for axios: in token auth mode
// the access token lives in localStorage and must be attached manually;
// in SAML mode the session lives in a cookie and requires credentials to
// be sent. Native fetch does neither by default, so the backend auth
// middleware rejects with 401 NOT_AUTHORIZED.
const isTokenMode = process.env.NEXT_PUBLIC_AUTH_TYPE === 'token';

const getAuthHeaders = (): Record<string, string> => {
  if (isTokenMode && typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  }
  return {};
};

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
          ...getAuthHeaders(),
        },
        // Include cookies for SAML session auth; no-op in token mode but
        // cheap to always set and keeps the call uniform across env.
        credentials: 'include',
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
    case 'first_chunk': {
      const sessionId = typeof payload?.session_id === 'string' ? payload.session_id : null;
      if (sessionId) {
        set(() => ({ sessionId }));
      }
      return;
    }
    case 'text': {
      // Eneo sends incremental tokens in `answer`, not `text` — the
      // OpenAPI spec uses PascalCase names (SSEText) but the wire
      // format is snake_case and uses `answer`.
      const chunk = typeof payload?.answer === 'string' ? payload.answer : '';
      if (!chunk) return;
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === assistantMessageId ? { ...m, content: m.content + chunk } : m
        ),
      }));
      return;
    }
    case 'error': {
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
      // token_usage and other intric events are ignored — they carry
      // metadata (prompt/completion token counts, generated files) that
      // the current UI doesn't render.
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
