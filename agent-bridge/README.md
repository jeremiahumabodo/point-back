# PointBack local bridge (Codex first slice)

## Run

Requires Node **22.18+**, Codex CLI on PATH, and an existing Codex login (`codex login`). The adapter was developed against `codex-cli 0.153.4`. No API keys are sent to or managed by the extension.

From `agent-bridge`, install dependencies with `pnpm install`, then in PowerShell:

```powershell
$env:POINTBACK_PROJECT_DIRECTORY = 'C:\path\to\your\repository'
pnpm start
```

Or on macOS/Linux:

```sh
POINTBACK_PROJECT_DIRECTORY=/path/to/repository pnpm start
```

The server binds only to `127.0.0.1:3000`. It prints a pairing token. In PointBack's connection settings, set the bridge address to `http://127.0.0.1:3000` and paste that token. Leaving the token field blank on subsequent saves keeps the existing token.

The repository is configured **locally at bridge startup**, not selected by a webpage or a message payload. Restart the bridge with a different directory to switch projects. History is scoped to that repository. This is intentionally a single-repository prototype, not a workspace permission manager.

If native executable discovery fails, set `POINTBACK_CODEX_PATH` to the absolute native Codex executable path. On Windows, this must be `codex.exe`, not `codex.cmd`; the adapter resolves npm's installed native binary automatically for the usual global npm layout. No prompt or project path is interpolated into a shell command.

## Try the slice

1. Build/reload the extension (`cd browser-extension; pnpm build`) and refresh the inspected page.
2. Start the bridge for a trusted Git repository and save the connection/token settings.
3. Select a UI element; ask a question. You should see activity followed by an assistant message.
4. Send a follow-up: it resumes the saved Codex session ID for that PointBack thread.
5. Close/reopen the panel, or reload the page and open **Chat history**. Open the saved conversation and continue.
6. Try **Stop**, stop the bridge mid-response, or use an unavailable bridge address. Failures should be visible; saved user messages and partial assistant messages remain available.

A reopened thread keeps its saved component footprint as context. It does **not** blindly reattach old selectors to current DOM nodes. To reference another current element, select it again.

## Boundaries and limitations

- `codex exec --json` and `exec resume` are contained in `src/codex/adapter.ts`. Initial and resumed turns explicitly use **read-only** sandbox policy, approvals `never`, and ignore user configuration (authentication still uses the local Codex login). Requests requiring writes are not approved. There is no write/approval UI in this slice.
- A read-only coding agent still has local read/tool capabilities. Pair only with trusted pages and repositories. Browser evidence is untrusted data, not authority to execute commands or read arbitrary paths. The prompt tells the agent to verify it; this is not a complete prompt-injection defense.
- HTTP uses bearer authentication, rejects webpage origins and non-loopback Host headers, exposes no CORS grants, and never redirects requests. The token is stored locally in `data/bridge-token.local` and extension storage. Do not share it. Stop the bridge and remove that file to rotate it. On Windows, protect the data directory with your user-account ACLs.
- `/v1/messages` streams newline-delimited **product events**: accepted, status, assistant, completed, failed, heartbeat. The extension background proxies these via a runtime port; raw Codex events and external session IDs never reach the page.
- Codex `exec` delivers completed assistant items, **not guaranteed token deltas**. Activity and completed items are streamed without fake typewriter animation.
- One turn per thread, at most two concurrent turns, a ten-minute turn timeout. Disconnecting the browser stream cancels that turn. There is no transparent retry; reopen history after uncertain delivery before resending.
- SQLite stores product threads, messages (including context snapshots), and separate internal/external agent-session identities in `data/pointback.db`. No embeddings or component-identity matching are introduced. Running responses become failed after a bridge restart.
- An unavailable Codex session produces an explicit failure, not silent session replacement. Product history remains readable. There is no automatic session recovery yet.
- Source metadata availability still depends on the resolver and the inspected app's React build. This slice does not expand React resolution.

## Verification

```sh
pnpm typecheck
pnpm test
```

Tests use a deterministic subprocess fixture and temporary SQLite databases, never a paid agent call. They cover JSONL parsing, process failure/cancellation, authentication/origin checks, persistence, session resume routing, duplicate requests, concurrent turns, disconnection, and restart recovery. A live Codex + browser smoke test is still required on your target app.
