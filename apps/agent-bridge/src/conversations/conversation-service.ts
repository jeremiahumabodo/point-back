import type { ConversationEvent, SendRequest } from "@pointback/protocol";
import type { RunAgent } from "../agents/coding-agent.ts";
import type { ConversationStore } from "../persistence/conversation-store.ts";

export class ConversationError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export type ConversationTurn = {
  threadId: string;
  assistantId: string;
  input: SendRequest;
  controller: AbortController;
};

/** Product lifecycle and durability; no HTTP or vendor protocol details. */
export class ConversationService {
  private readonly active = new Map<string, AbortController>();
  private readonly project: string;
  private readonly store: ConversationStore;
  private readonly runAgent: RunAgent;
  constructor(project: string, store: ConversationStore, runAgent: RunAgent) {
    this.project = project;
    this.store = store;
    this.runAgent = runAgent;
  }

  list() {
    return this.store.list(this.project);
  }
  get(id: string) {
    return this.store.get(id, this.project);
  }

  start(input: SendRequest): ConversationTurn {
    if (input.threadId && !this.get(input.threadId))
      throw new ConversationError(404, "Thread not found for this project.");
    if (input.threadId && this.active.has(input.threadId))
      throw new ConversationError(
        409,
        "This conversation already has an active response.",
      );
    if (this.active.size >= 2)
      throw new ConversationError(
        429,
        "Bridge is busy. Wait for an active response to finish.",
      );
    if (this.store.hasRequest(input.requestId))
      throw new ConversationError(
        409,
        "Message already saved. Reopen the conversation instead of resending.",
      );
    const ids = this.store.start(this.project, input);
    const controller = new AbortController();
    this.active.set(ids.threadId, controller);
    return { ...ids, input, controller };
  }

  async run(turn: ConversationTurn, emit: (event: ConversationEvent) => void) {
    const { threadId, assistantId, input, controller } = turn;
    let content = "";
    try {
      await this.runAgent(
        {
          project: this.project,
          sessionId: this.store.session(threadId),
          request: input,
          signal: controller.signal,
        },
        (event) => {
          if (event.type === "session")
            this.store.saveSession(threadId, event.id);
          if (event.type === "text") {
            content += (content ? "\n\n" : "") + event.content;
            if (content.length > 200_000)
              throw new Error("Assistant response exceeded the safety limit.");
            this.store.updateAssistant(assistantId, content, "running");
            emit({ type: "assistant", content });
          }
          if (event.type === "status") emit(event);
        },
      );
      controller.signal.throwIfAborted();
      this.store.updateAssistant(assistantId, content, "completed");
      emit({ type: "completed" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Agent response failed.";
      this.store.updateAssistant(assistantId, content, "failed", message);
      emit({ type: "failed", message });
    } finally {
      this.active.delete(threadId);
    }
  }

  cancelAll() {
    for (const controller of this.active.values()) controller.abort();
  }
}
