# PointBack

A browser-native conversational client for local coding agents. Select a running UI element, ask about it, and continue or reopen the conversation in the browser.

## Workspace

```text
apps/
  browser-extension/   WXT extension: selection, context resolution, conversations
  agent-bridge/        Loopback HTTP API, Codex adapter, local SQLite history
  component-lab/       Storybook stories and browser integration tests
packages/
  protocol/            Product-level context, conversation and event types
  ui/                  Shared React components and canonical styles
```

Applications depend on workspace packages, not each other's source. `protocol` has no runtime dependencies. `ui` has no extension, bridge, or coding-agent dependencies. Both packages export TypeScript source for workspace consumers; there is no separate package build step.

The extension's `entrypoints/` only configure WXT and start the relevant runtime. `src/bootstrap/` owns setup/teardown; `selection/` owns pointer/lasso targeting, live page Element handles, and geometry; `component-resolution/` isolates DOM and private React metadata; `conversations/` contains native editing, reference reconciliation, and stream transport; `bridge/` contains content-to-background messaging and the authenticated HTTP proxy. `application/` owns React application state and event/effect coordination. `ui/` mounts one Shadow DOM React tree: application state → `PointBackRoot` → shared UI props.

The bridge's `server.ts` composes authentication and routes. `conversations/` owns turn lifecycle and persistence coordination; `agents/` owns agent execution and normalized local events. The public API remains `/health`, `/v1/threads`, `/v1/threads/:id`, and `/v1/messages` (NDJSON). Agent discovery/session endpoints and discussion markers are not added by this refactor.

## Setup

Use Node **22.18+** and **pnpm 11.1.2**. Install once at this repository root:

```sh
pnpm install
pnpm --filter component-lab exec playwright install chromium
pnpm build
```

Load `apps/browser-extension/.output/chrome-mv3` as an unpacked Chrome extension. If you previously loaded `browser-extension/.output/chrome-mv3`, remove that old entry and load the new path.

For the bridge, install and log into Codex locally. In PowerShell:

```powershell
$env:POINTBACK_PROJECT_DIRECTORY = 'C:\path\to\your\repository'
pnpm dev:bridge
```

Or on macOS/Linux:

```sh
POINTBACK_PROJECT_DIRECTORY=/path/to/repository pnpm dev:bridge
```

Copy the terminal's pairing token into PointBack connection settings. The bridge remains read-only and loopback-only. See [bridge setup and security notes](apps/agent-bridge/README.md).

```sh
pnpm dev:extension
pnpm storybook
```

Stop/restart any development servers that were started from the old directories. Existing bridge data belongs in `apps/agent-bridge/data/`; keep the database, WAL/SHM files (if present), and token together when migrating a separate checkout. Stop the bridge before moving data. No schema changes or history reset are required.

## Verification

```sh
pnpm typecheck
pnpm build
pnpm test
pnpm build-storybook
pnpm --filter component-lab lint
pnpm --filter component-lab exec vitest run
```

`pnpm test` covers bridge validation, authentication, persistence, resume, subprocess handling and cancellation, then loads the real extension in Chromium. Browser coverage includes style isolation, DOM/React resolution, selection/lasso, replacement, reference editing, settings, streaming, cancellation, retained drafts and history. Tests use fixtures, not a paid agent. A live Codex smoke test remains a separate manual check.

## Styling and UI ownership

Existing shared component implementations and CSS are preserved. `packages/ui/src/styles/main.css` is the canonical PointBack stylesheet, used both in the extension's Shadow DOM and Storybook. `tokens.css` and component CSS modules remain in the UI package; the lab retains its Tailwind preview setup. Page cursor/outline effects remain in the extension's `assets/content.css`.

See [UI ownership rules](apps/browser-extension/src/ui/README.md) before changing rendering or native editor/geometry islands.
