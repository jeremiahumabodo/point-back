import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "../src/server.ts";
import { ConversationStore } from "../src/store.ts";
import type { SendRequest } from "../../shared/conversation.ts";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test(
  "real HTTP streams reject overlapping turns and preserve partial text after disconnect",
  { timeout: 10000 },
  async () => {
    const store = new ConversationStore(":memory:");
    let agentStopped = false;
    const app = createServer({
      project: "fixture-project",
      token: "token",
      store,
      runAgent: async (run, emit) => {
        emit({ type: "text", content: "Partial explanation" });
        await new Promise<void>((resolve) => {
          if (run.signal.aborted) resolve();
          else
            run.signal.addEventListener("abort", () => resolve(), {
              once: true,
            });
        });
        agentStopped = true;
        throw new Error("Response cancelled.");
      },
    });
    const address = await app.listen({ host: "127.0.0.1", port: 0 });
    const headers = {
      authorization: "Bearer token",
      "content-type": "application/json",
    };
    const input: SendRequest = {
      requestId: crypto.randomUUID(),
      message: { content: "Explain", references: [] },
      context: { selectedComponents: [] },
    };
    const controller = new AbortController();
    try {
      const response = await fetch(`${address}/v1/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify(input),
        signal: controller.signal,
      });
      const reader = response.body!.getReader();
      let text = "";
      while (!text.includes("\n"))
        text += new TextDecoder().decode((await reader.read()).value);
      const threadId = JSON.parse(text.split("\n")[0]).threadId;
      const concurrent = await fetch(`${address}/v1/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...input,
          requestId: crypto.randomUUID(),
          threadId,
        }),
      });
      assert.equal(concurrent.status, 409);
      await concurrent.text();
      controller.abort();
      await reader.cancel().catch(() => {});
      for (let tries = 0; tries < 100 && !agentStopped; tries++)
        await delay(20);
      assert.equal(agentStopped, true);
      const detail = store.get(threadId, "fixture-project");
      assert.equal(detail?.messages[1].content, "Partial explanation");
      assert.equal(detail?.messages[1].status, "failed");
    } finally {
      controller.abort();
      await app.close();
      store.close();
    }
  },
);
