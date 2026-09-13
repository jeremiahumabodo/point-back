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

export function loadConfig() {
  const configuredProject = process.env.POINTBACK_PROJECT_DIRECTORY;
  if (!configuredProject)
    throw new Error(
      "Set POINTBACK_PROJECT_DIRECTORY to the repository you want Codex to inspect.",
    );
  const project = realpathSync(resolve(configuredProject));
  if (!statSync(project).isDirectory())
    throw new Error("The configured project is not a directory.");
  // Remain at the app root after moving the entrypoint under src/.
  const data = fileURLToPath(new URL("../data/", import.meta.url));
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
  return { project, token, databasePath: join(data, "pointback.db") };
}
