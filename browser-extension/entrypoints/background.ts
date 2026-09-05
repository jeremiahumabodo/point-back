import type { AgentBridgeMessage } from "../agent-bridge/message-client";

type PointBackMessage = {
  type: "pointback:send-message";
  message: AgentBridgeMessage;
};

function getLoopbackBridgeUrl(address: string): URL | undefined {
  try {
    const baseUrl = new URL(address);
    // The extension has host permissions and must not turn this configurable
    // address into a general privileged-network request mechanism.
    if (baseUrl.protocol !== "http:" || !["127.0.0.1", "[::1]"].includes(baseUrl.hostname)) return undefined;
    return new URL("/v1/messages", baseUrl);
  } catch {
    return undefined;
  }
}

export default defineBackground(() => {
  browser.action.onClicked.addListener((tab) => {
    if (tab.id === undefined) return;
    void browser.tabs.sendMessage(tab.id, { type: "pointback:open-panel" }).catch(() => undefined);
  });

  browser.runtime.onMessage.addListener(async (message: PointBackMessage) => {
    if (message.type !== "pointback:send-message") return undefined;

    const { agentBridgeAddress, projectDirectory } = await browser.storage.local.get(["agentBridgeAddress", "projectDirectory"]);
    if (typeof agentBridgeAddress !== "string" || typeof projectDirectory !== "string") {
      return { delivered: false, reason: "bridge-not-configured" };
    }

    const url = getLoopbackBridgeUrl(agentBridgeAddress);
    if (!url) return { delivered: false, reason: "bridge-not-configured" };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...message.message, projectDirectory }),
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) return { delivered: false, reason: "bridge-request-failed" };

      const body = await response.json() as { messageId?: unknown };
      return typeof body.messageId === "string"
        ? { delivered: true, messageId: body.messageId }
        : { delivered: false, reason: "bridge-request-failed" };
    } catch {
      return { delivered: false, reason: "bridge-request-failed" };
    }
  });
});
