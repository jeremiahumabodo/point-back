import Fastify from "fastify";
import { timingSafeEqual } from "node:crypto";
import type { ConversationEvent } from "../../shared/conversation.ts";
import type { RunAgent } from "./codex/adapter.ts";
import { ConversationStore } from "./store.ts";
import { validSend, uuid } from "./validation.ts";

export function createServer(options: {
  project: string;
  token: string;
  store: ConversationStore;
  runAgent: RunAgent;
}) {
  const { project, token, store, runAgent } = options;
  const app = Fastify({ bodyLimit: 250_000, logger: false });
  const active = new Map<string, AbortController>();
  app.addHook("onRequest", async (request, reply) => {
    // No CORS grants. Reject web origins even if a token is accidentally exposed.
    const origin = request.headers.origin;
    const host = request.headers.host ?? "";
    if (
      !/^(127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host) ||
      (origin &&
        !/^(chrome-extension|moz-extension):\/\/[a-zA-Z0-9-]+$/.test(origin))
    ) {
      return reply.code(403).send({ error: "Forbidden origin or host." });
    }
    const actual = Buffer.from(request.headers.authorization ?? "");
    const expected = Buffer.from(`Bearer ${token}`);
    if (
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected)
    ) {
      return reply
        .code(401)
        .send({
          error:
            "Invalid bridge token. Copy the token from the bridge terminal into connection settings.",
        });
    }
  });
  app.get("/health", async () => ({ status: "ok" }));
  app.get("/v1/threads", async () => ({ threads: store.list(project) }));
  app.get<{ Params: { id: string } }>(
    "/v1/threads/:id",
    async (request, reply) => {
      if (!uuid(request.params.id))
        return reply.code(400).send({ error: "Invalid thread ID." });
      const thread = store.get(request.params.id, project);
      return (
        thread ??
        reply.code(404).send({ error: "Thread not found for this project." })
      );
    },
  );
  app.post("/v1/messages", async (request, reply) => {
    if (!validSend(request.body))
      return reply
        .code(400)
        .send({ error: "Invalid message or component context." });
    const input = request.body;
    if (input.threadId && !store.get(input.threadId, project))
      return reply
        .code(404)
        .send({ error: "Thread not found for this project." });
    if (input.threadId && active.has(input.threadId))
      return reply
        .code(409)
        .send({ error: "This conversation already has an active response." });
    if (active.size >= 2)
      return reply
        .code(429)
        .send({
          error: "Bridge is busy. Wait for an active response to finish.",
        });
    if (store.hasRequest(input.requestId))
      return reply
        .code(409)
        .send({
          error:
            "Message already saved. Reopen the conversation instead of resending.",
        });
    const { threadId, assistantId } = store.start(project, input);
    const controller = new AbortController();
    active.set(threadId, controller);
    let content = "";
    let finished = false;
    reply.hijack();
    reply.raw.writeHead(200, {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    });
    const write = (event: ConversationEvent | { type: "heartbeat" }) => {
      if (reply.raw.destroyed) return;
      if (reply.raw.writableLength > 1_000_000) {
        controller.abort();
        reply.raw.destroy();
        return;
      }
      reply.raw.write(JSON.stringify(event) + "\n");
    };
    reply.raw.on("close", () => {
      if (!finished) controller.abort();
    });
    const heartbeat = setInterval(() => write({ type: "heartbeat" }), 10_000);
    write({ type: "accepted", threadId, messageId: input.requestId });
    write({ type: "status", message: "Starting coding agent…" });
    try {
      await runAgent(
        {
          project,
          sessionId: store.session(threadId),
          request: input,
          signal: controller.signal,
        },
        (event) => {
          if (event.type === "session") store.saveSession(threadId, event.id);
          if (event.type === "text") {
            content += (content ? "\n\n" : "") + event.content;
            if (content.length > 200_000)
              throw new Error("Assistant response exceeded the safety limit.");
            store.updateAssistant(assistantId, content, "running");
            write({ type: "assistant", content });
          }
          if (event.type === "status") write(event);
        },
      );
      controller.signal.throwIfAborted();
      store.updateAssistant(assistantId, content, "completed");
      write({ type: "completed" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Agent response failed.";
      store.updateAssistant(assistantId, content, "failed", message);
      write({ type: "failed", message });
    } finally {
      finished = true;
      clearInterval(heartbeat);
      active.delete(threadId);
      reply.raw.end();
    }
  });
  // Closing live HTTP streams cancels their agent process; history stays durable.
  app.addHook("preClose", async () => {
    for (const controller of active.values()) controller.abort();
  });
  return app;
}
