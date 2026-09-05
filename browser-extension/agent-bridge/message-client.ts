import type { ComponentFootprint } from "../component-resolution/types";

export type AgentBridgeMessage = {
  message: {
    content: string;
    references: Array<{
      id: string;
      term: string;
      start: number;
      end: number;
      components: ComponentFootprint[];
    }>;
  };
  context: {
    selectedComponents: ComponentFootprint[];
  };
};

type SendMessageResponse =
  | { delivered: false; reason: "bridge-not-configured" | "bridge-request-failed" }
  | { delivered: true; messageId: string };

export async function sendMessageToAgentBridge(message: AgentBridgeMessage): Promise<SendMessageResponse> {
  return browser.runtime.sendMessage({ type: "pointback:send-message", message }) as Promise<SendMessageResponse>;
}
