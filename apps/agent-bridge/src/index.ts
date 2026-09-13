import { loadConfig } from "./config.ts";
import { ConversationStore } from "./persistence/conversation-store.ts";
import { createServer } from "./server.ts";
import { createCodexRunner, findCodex } from "./agents/codex/codex-adapter.ts";

const { project, token, databasePath } = loadConfig();
const executable = findCodex();
const store = new ConversationStore(databasePath);
const app = createServer({
  project,
  token,
  store,
  runAgent: createCodexRunner(executable),
});
await app.listen({ host: "127.0.0.1", port: 3000 });
console.log(
  `PointBack bridge: http://127.0.0.1:3000\nRead-only repository: ${project}\nBridge token (paste in extension settings): ${token}`,
);
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await app.close();
  store.close();
}
process.on("SIGINT", () => void stop());
process.on("SIGTERM", () => void stop());
