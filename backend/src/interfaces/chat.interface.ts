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

// SSE event types Eneo actually emits on the wire. The upstream OpenAPI
// spec documents PascalCase names (SSEText, SSEFirstChunk, …) but the
// deployed service ships snake_case, so the frontend parser keys off
// these. Kept loose on purpose — we pipe raw `data` payloads through to
// the browser and only care about event names for logging/diagnostics.
export type EneoSseEventName =
  | 'first_chunk'
  | 'text'
  | 'error'
  | 'token_usage'
  | 'files'
  | 'intric_event';
