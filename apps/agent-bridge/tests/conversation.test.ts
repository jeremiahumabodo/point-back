import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ConversationStore } from "../src/persistence/conversation-store.ts";
import { createServer } from "../src/server.ts";
import {
  createCodexRunner,
  codexArgs,
  buildPrompt,
} from "../src/agents/codex/codex-adapter.ts";
import type { AgentEvent, RunAgent } from "../src/agents/coding-agent.ts";
import { validSend } from "../src/validation.ts";
import type { SendRequest } from "@pointback/protocol";

const project = process.cwd();
const request = (): SendRequest => ({
  requestId: crypto.randomUUID(),
  message: { content: "Explain this", references: [] },
  context: { selectedComponents: [] },
});
const headers = { host: "127.0.0.1:3000", authorization: "Bearer test-token" };
const externalId = "11111111-1111-4111-8111-111111111111";
const fixture = fileURLToPath(new URL("./fixtures/codex.mjs", import.meta.url));

test("Codex argv is read-only on new and resumed turns; prompts are stdin data", () => {
  for (const id of [undefined, externalId]) {
    const args = codexArgs(id);
    assert.ok(args.includes('sandbox_mode="read-only"'));
    assert.ok(args.includes('approval_policy="never"'));
    assert.equal(args.at(-1), "-");
    assert.equal(args.includes("resume"), !!id);
    assert.ok(!args.includes("--dangerously-bypass-approvals-and-sandbox"));
  }
  assert.throws(() => codexArgs("--last"));
  assert.match(buildPrompt(request()), /untrusted/);
});

test("adapter handles fragmented UTF-8, deduplicates items, and accepts EOF without newline", async () => {
  const events: AgentEvent[] = [];
  await createCodexRunner(process.execPath, [fixture, "success"])(
    { project, request: request(), signal: new AbortController().signal },
    (e) => events.push(e),
  );
  assert.deepEqual(
    events.filter((e) => e.type === "text"),
    [{ type: "text", content: "Hello UI 👋" }],
  );
  assert.ok(events.some((e) => e.type === "session" && e.id === externalId));
});
for (const mode of ["failure", "malformed", "exit"])
  test(`adapter rejects ${mode} without pretending success`, async () => {
    await assert.rejects(
      createCodexRunner(process.execPath, [fixture, mode])(
        { project, request: request(), signal: new AbortController().signal },
        () => {},
      ),
    );
  });
test("adapter cancels, times out, and handles a missing executable", async () => {
  const controller = new AbortController();
  const running = createCodexRunner(process.execPath, [fixture, "hang"])(
    { project, request: request(), signal: controller.signal },
    () => {},
  );
  setTimeout(() => controller.abort(), 100);
  await assert.rejects(running, /cancelled/);
  await assert.rejects(
    createCodexRunner(
      process.execPath,
      [fixture, "hang"],
      50,
    )(
      { project, request: request(), signal: new AbortController().signal },
      () => {},
    ),
    /timed out/,
  );
  await assert.rejects(
    createCodexRunner(join(tmpdir(), "nonexistent-pointback-executable"))(
      { project, request: request(), signal: new AbortController().signal },
      () => {},
    ),
    /start Codex/,
  );
});

test("validation rejects invalid ranges, empty prompts, and malformed component metadata", () => {
  assert.equal(validSend(request()), true);
  assert.equal(validSend({ ...request(), requestId: "bad" }), false);
  const input = request();
  input.message.references = [
    { id: "r", term: "this", start: -1, end: 500, components: [] },
  ];
  assert.equal(validSend(input), false);
  input.message.references = [
    { id: "r", term: "this", start: 8, end: 12, components: [] },
  ];
  assert.equal(validSend(input), true);
  input.message.content = " ";
  assert.equal(validSend(input), false);
});

test("HTTP -> persistence -> agent -> stream -> reopen and resume, including failure history", async () => {
  const dir = mkdtempSync(join(tmpdir(), "pointback-test-"));
  const store = new ConversationStore(join(dir, "test.db"));
  let fail = false;
  const sessions: Array<string | undefined> = [];
  const runAgent: RunAgent = async (run, emit) => {
    sessions.push(run.sessionId);
    emit({ type: "session", id: externalId });
    emit({ type: "text", content: "A source-backed explanation." });
    if (fail) throw new Error("Session unavailable");
  };
  const app = createServer({ project, token: "test-token", store, runAgent });
  try {
    assert.equal(
      (
        await app.inject({
          method: "GET",
          url: "/v1/threads",
          headers: { host: headers.host },
        })
      ).statusCode,
      401,
    );
    assert.equal(
      (
        await app.inject({
          method: "GET",
          url: "/v1/threads",
          headers: { ...headers, origin: "https://evil.example" },
        })
      ).statusCode,
      403,
    );
    assert.equal(
      (
        await app.inject({
          method: "GET",
          url: "/v1/threads",
          headers: { ...headers, host: "evil.example:3000" },
        })
      ).statusCode,
      403,
    );
    const input = request();
    const response = await app.inject({
      method: "POST",
      url: "/v1/messages",
      headers,
      payload: input,
    });
    assert.equal(response.statusCode, 200);
    const events = response.body
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    const threadId = events[0].threadId;
    assert.equal(events.at(-1).type, "completed");
    assert.ok(events.some((e) => e.type === "assistant"));
    assert.ok(!response.body.includes(externalId));
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/v1/messages",
          headers,
          payload: input,
        })
      ).statusCode,
      409,
    );
    fail = true;
    const followup = await app.inject({
      method: "POST",
      url: "/v1/messages",
      headers,
      payload: { ...request(), threadId },
    });
    assert.match(followup.body, /Session unavailable/);
    assert.deepEqual(sessions, [undefined, externalId]);
    const detail = (
      await app.inject({
        method: "GET",
        url: `/v1/threads/${threadId}`,
        headers,
      })
    ).json();
    assert.equal(detail.messages.length, 4);
    assert.equal(detail.messages[3].status, "failed");
    assert.equal(detail.messages[1].content, "A source-backed explanation.");
    assert.equal(store.get(threadId, "different-project"), undefined);
    assert.equal(
      (await app.inject({ method: "GET", url: "/v1/threads", headers })).json()
        .threads.length,
      1,
    );
    await app.close();
    store.close();
    const reopened = new ConversationStore(join(dir, "test.db"));
    assert.equal(reopened.get(threadId, project)?.messages.length, 4);
    assert.equal(reopened.session(threadId), externalId);
    reopened.close();
  } finally {
    await app.close();
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("restart marks interrupted replies failed but preserves messages and context", () => {
  const dir = mkdtempSync(join(tmpdir(), "pointback-restart-"));
  const path = join(dir, "test.db");
  let store = new ConversationStore(path);
  const { threadId, assistantId } = store.start(project, request());
  store.updateAssistant(assistantId, "Partial response", "running");
  store.close();
  store = new ConversationStore(path);
  assert.equal(
    store.get(threadId, project)?.messages[1].content,
    "Partial response",
  );
  assert.equal(store.get(threadId, project)?.messages[1].status, "failed");
  store.close();
  rmSync(dir, { recursive: true, force: true });
});
