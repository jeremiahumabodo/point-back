import type {
  ConversationEvent,
  SendRequest,
  ThreadDetail,
  ThreadSummary,
} from "../../shared/conversation.ts";

export function sendMessageToAgentBridge(
  request: SendRequest,
  onEvent: (event: ConversationEvent) => void,
) {
  const port = browser.runtime.connect({ name: "pointback:conversation" });
  let terminal = false;
  port.onMessage.addListener(
    (event: ConversationEvent | { type: "heartbeat" }) => {
      if (event.type === "heartbeat") return;
      terminal ||= event.type === "completed" || event.type === "failed";
      onEvent(event);
    },
  );
  port.onDisconnect.addListener(() => {
    if (!terminal)
      onEvent({
        type: "failed",
        message: "Bridge connection lost. Reopen history before resending.",
      });
  });
  port.postMessage({ type: "send", request });
  return {
    cancel: () => {
      if (!terminal) port.postMessage({ type: "cancel" });
    },
  };
}

export async function listThreads(): Promise<ThreadSummary[]> {
  const response = await browser.runtime.sendMessage({
    type: "pointback:list-threads",
  });
  if (!response?.ok) throw new Error(response?.error || "Bridge unavailable.");
  return response.data.threads;
}
export async function getThread(id: string): Promise<ThreadDetail> {
  const response = await browser.runtime.sendMessage({
    type: "pointback:get-thread",
    id,
  });
  if (!response?.ok) throw new Error(response?.error || "Bridge unavailable.");
  return response.data;
}
