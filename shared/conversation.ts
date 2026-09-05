import type { ComponentFootprint } from './component-footprint.ts';

export type MessageInput = {
  content: string;
  references: Array<{
    id: string;
    term: string;
    start: number;
    end: number;
    components: ComponentFootprint[];
  }>;
};
export type SendRequest = {
  requestId: string;
  threadId?: string;
  message: MessageInput;
  context: { selectedComponents: ComponentFootprint[] };
};
export type SavedMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  references: MessageInput['references'];
  context: SendRequest['context'];
  status: 'running' | 'completed' | 'failed';
  error?: string;
  createdAt: string;
};
export type ThreadSummary = {
  id: string;
  title: string;
  updatedAt: string;
};
export type ThreadDetail = ThreadSummary & { messages: SavedMessage[] };

// Product events only. Codex session IDs and raw provider events stay local.
export type ConversationEvent =
  | { type: 'accepted'; threadId: string; messageId: string }
  | { type: 'status'; message: string }
  | { type: 'assistant'; content: string }
  | { type: 'completed' }
  | { type: 'failed'; message: string };
