export interface ChatRequest {
  question: string;
  sessionId?: string;
}

// Request body sent to Eneo's POST /conversations/.
// Fields we don't use (group_chat_id, files, use_web_search) are omitted —
// can be added later if the UI grows those affordances.
export interface EneoConversationRequest {
  question: string;
  session_id?: string;
  assistant_id?: string;
  stream: boolean;
}

// SSE event types Eneo can emit. Kept loose on purpose — we pass the raw
// `data` payload through to the browser, so the only thing we care about
// server-side is recognising `event:` names for logging/diagnostics.
export type EneoSseEventName =
  | 'SSEFirstChunk'
  | 'SSEText'
  | 'SSEFiles'
  | 'SSEIntricEvent'
  | 'SSEError';
