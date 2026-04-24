// Request body sent to Eneo's POST /conversations/.
// Fields we don't use (group_chat_id, files, use_web_search) are omitted —
// add later if the UI grows those affordances.
export interface EneoConversationRequest {
  question: string;
  session_id?: string;
  assistant_id?: string;
  stream: boolean;
}
