import Fastify from "fastify";
import type { RunAgent } from "./agents/coding-agent.ts";
import type { ConversationStore } from "./persistence/conversation-store.ts";
import { ConversationService } from "./conversations/conversation-service.ts";
import { authenticateRequests } from "./security/authenticate-request.ts";
import { registerHealthRoute } from "./routes/health.ts";
import { registerThreadRoutes } from "./routes/threads.ts";
import { registerMessageRoute } from "./routes/messages.ts";

export function createServer(options: {
  project: string;
  token: string;
  store: ConversationStore;
  runAgent: RunAgent;
}) {
  const app = Fastify({ bodyLimit: 250_000, logger: false });
  const conversations = new ConversationService(
    options.project,
    options.store,
    options.runAgent,
  );
  authenticateRequests(app, options.token);
  registerHealthRoute(app);
  registerThreadRoutes(app, conversations);
  registerMessageRoute(app, conversations);
  // Closing live HTTP streams cancels their agent process; history stays durable.
  app.addHook("preClose", async () => conversations.cancelAll());
  return app;
}
