import type { ConversationEvent, SendRequest } from "@pointback/protocol";
import { sendMessageToAgentBridge } from "../bridge/bridge-client.ts";

/** Transport lifetime only: no message nodes, UI state, or rendering. */
export function streamResponse(
  request: SendRequest,
  onEvent: (event: ConversationEvent) => void,
) {
  let disposed = false;
  let terminal = false;
  let connection: ReturnType<typeof sendMessageToAgentBridge> | undefined;
  function receive(event: ConversationEvent) {
    if (disposed || terminal) return;
    terminal = event.type === "completed" || event.type === "failed";
    onEvent(event);
  }
  try {
    connection = sendMessageToAgentBridge(request, receive);
  } catch (error) {
    receive({
      type: "failed",
      message:
        error instanceof Error ? error.message : "Could not connect to bridge.",
    });
  }
  return {
    cancel() {
      if (!terminal && !disposed) connection?.cancel();
    },
    dispose() {
      disposed = true;
      if (!terminal) connection?.cancel();
      connection?.dispose();
    },
  };
}
