// Product events only. Codex session IDs and raw provider events stay local.
export type ConversationEvent =
  | { type: 'accepted'; threadId: string; messageId: string }
  | { type: 'status'; message: string }
  | { type: 'assistant'; content: string }
  | { type: 'completed' }
  | { type: 'failed'; message: string };
