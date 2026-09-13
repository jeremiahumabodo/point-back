import type { FastifyInstance } from "fastify";
import type { ConversationEvent } from "@pointback/protocol";
import {
  ConversationError,
  type ConversationService,
  type ConversationTurn,
} from "../conversations/conversation-service.ts";
import { validSend } from "../validation.ts";

export function registerMessageRoute(
  app: FastifyInstance,
  conversations: ConversationService,
) {
  app.post("/v1/messages", async (request, reply) => {
    if (!validSend(request.body))
      return reply
        .code(400)
        .send({ error: "Invalid message or component context." });
    let turn: ConversationTurn;
    try {
      turn = conversations.start(request.body);
    } catch (error) {
      if (error instanceof ConversationError)
        return reply.code(error.statusCode).send({ error: error.message });
      throw error;
    }
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
        turn.controller.abort();
        reply.raw.destroy();
        return;
      }
      reply.raw.write(JSON.stringify(event) + "\n");
    };
    reply.raw.on("close", () => {
      if (!finished) turn.controller.abort();
    });
    const heartbeat = setInterval(() => write({ type: "heartbeat" }), 10_000);
    write({
      type: "accepted",
      threadId: turn.threadId,
      messageId: turn.input.requestId,
    });
    write({ type: "status", message: "Starting coding agent…" });
    try {
      await conversations.run(turn, write);
    } finally {
      finished = true;
      clearInterval(heartbeat);
      reply.raw.end();
    }
  });
}
