import type { SendRequest } from "@pointback/protocol";
import { readBridgeEvents, type BridgeEvent } from "./bridge-event-stream.ts";

async function connection() {
  const settings = await browser.storage.local.get([
    "agentBridgeAddress",
    "bridgeToken",
  ]);
  const url = new URL(
    typeof settings.agentBridgeAddress === "string"
      ? settings.agentBridgeAddress
      : "http://127.0.0.1:3000",
  );
  if (
    url.protocol !== "http:" ||
    !["127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.username ||
    url.password
  ) {
    throw new Error(
      "Use a loopback bridge address such as http://127.0.0.1:3000.",
    );
  }
  if (typeof settings.bridgeToken !== "string" || !settings.bridgeToken)
    throw new Error("Save the bridge token in connection settings first.");
  return {
    url,
    headers: {
      authorization: `Bearer ${settings.bridgeToken}`,
      "content-type": "application/json",
    },
  };
}
async function bridgeFetch(path: string, init: RequestInit = {}) {
  const { url, headers } = await connection();
  const response = await fetch(new URL(path, url), {
    ...init,
    headers,
    redirect: "error",
    credentials: "omit",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(
      body.error || `Bridge request failed (${response.status}).`,
    );
  }
  return response;
}

async function forwardConversation(
  request: SendRequest,
  signal: AbortSignal,
  post: (event: BridgeEvent) => void,
) {
  const response = await bridgeFetch("/v1/messages", {
    method: "POST",
    body: JSON.stringify(request),
    signal,
  });
  if (!response.body) throw new Error("Bridge returned no response stream.");
  let terminal = false;
  for await (const event of readBridgeEvents(response.body)) {
    terminal ||= event.type === "completed" || event.type === "failed";
    // Heartbeats also keep the MV3 worker alive while the agent is busy.
    post(event);
  }
  if (!terminal)
    throw new Error(
      "Connection ended before completion. Reopen history to check saved messages.",
    );
}

function streamFailureMessage(error: unknown, wasCancelled: boolean): string {
  if (wasCancelled)
    return "Response stopped or connection lost. Reopen history to check saved messages.";
  return error instanceof Error ? error.message : "Bridge unavailable.";
}

export function startBackgroundBridge() {
  browser.action.onClicked.addListener((tab) => {
    if (tab.id !== undefined)
      void browser.tabs
        .sendMessage(tab.id, { type: "pointback:open-panel" })
        .catch(() => undefined);
  });
  browser.runtime.onMessage.addListener(async (message, sender) => {
    if (sender.id !== browser.runtime.id) return;
    try {
      if (message.type === "pointback:save-token") {
        if (
          typeof message.token !== "string" ||
          !/^[0-9a-f]{64}$/.test(message.token)
        )
          throw new Error(
            "Paste the 64-character token printed by the bridge.",
          );
        await browser.storage.local.set({ bridgeToken: message.token });
        return { ok: true };
      }
      if (message.type === "pointback:list-threads") {
        const response = await bridgeFetch("/v1/threads", {
          signal: AbortSignal.timeout(5000),
        });
        return { ok: true, data: await response.json() };
      }
      if (message.type === "pointback:get-thread") {
        if (
          typeof message.id !== "string" ||
          !/^[0-9a-f-]{36}$/i.test(message.id)
        )
          throw new Error("Invalid thread ID.");
        const response = await bridgeFetch(`/v1/threads/${message.id}`, {
          signal: AbortSignal.timeout(5000),
        });
        return { ok: true, data: await response.json() };
      }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Bridge unavailable.",
      };
    }
  });

  browser.runtime.onConnect.addListener((port) => {
    if (
      port.name !== "pointback:conversation" ||
      port.sender?.id !== browser.runtime.id
    )
      return;
    const controller = new AbortController();
    let started = false;
    let connected = true;
    const post = (event: BridgeEvent) => {
      if (connected) port.postMessage(event);
    };
    port.onDisconnect.addListener(() => {
      connected = false;
      controller.abort();
    });
    port.onMessage.addListener(
      async (message: { type: string; request: SendRequest }) => {
        if (message.type === "cancel") {
          controller.abort();
          return;
        }
        if (message.type !== "send" || started) return;
        started = true;
        try {
          await forwardConversation(message.request, controller.signal, post);
        } catch (error) {
          const wasCancelled = controller.signal.aborted;
          controller.abort();
          post({
            type: "failed",
            message: streamFailureMessage(error, wasCancelled),
          });
        } finally {
          if (connected) port.disconnect();
        }
      },
    );
  });
}
