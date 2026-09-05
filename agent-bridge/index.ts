import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, join } from "node:path";
import { randomBytes } from "node:crypto";
import { ConversationStore } from "./src/store.ts";
import { createServer } from "./src/server.ts";
import { createCodexRunner, findCodex } from "./src/codex/adapter.ts";

const configuredProject = process.env.POINTBACK_PROJECT_DIRECTORY;
if (!configuredProject)
  throw new Error(
    "Set POINTBACK_PROJECT_DIRECTORY to the repository you want Codex to inspect.",
  );
const project = realpathSync(resolve(configuredProject));
if (!statSync(project).isDirectory())
  throw new Error("The configured project is not a directory.");
const executable = findCodex();
const data = fileURLToPath(new URL("./data/", import.meta.url));
mkdirSync(data, { recursive: true, mode: 0o700 });
const tokenPath = join(data, "bridge-token.local");
try {
  writeFileSync(tokenPath, randomBytes(32).toString("hex"), {
    flag: "wx",
    mode: 0o600,
  });
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
}
const token = readFileSync(tokenPath, "utf8").trim();
if (!/^[0-9a-f]{64}$/.test(token))
  throw new Error(
    "Invalid bridge-token.local. Remove it and restart to generate a new token.",
  );
const store = new ConversationStore(join(data, "pointback.db"));
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
