import type { FastifyInstance } from "fastify";
import type { ConversationService } from "../conversations/conversation-service.ts";
import { uuid } from "../validation.ts";

export function registerThreadRoutes(
  app: FastifyInstance,
  conversations: ConversationService,
) {
  app.get("/v1/threads", async () => ({ threads: conversations.list() }));
  app.get<{ Params: { id: string } }>(
    "/v1/threads/:id",
    async (request, reply) => {
      if (!uuid(request.params.id))
        return reply.code(400).send({ error: "Invalid thread ID." });
      return (
        conversations.get(request.params.id) ??
        reply.code(404).send({ error: "Thread not found for this project." })
      );
    },
  );
}
