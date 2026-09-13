import { test } from "node:test";
import assert from "node:assert/strict";
import { appReducer, initialState } from "../src/application/state.ts";

const component = (id) => ({ id, footprint: { name: id, tagName: "button" } });
const edit = (state, text, rendered = []) =>
  appReducer(state, { type: "edit", text, rendered, newId: "ref" });
const pick = (state, ...ids) =>
  appReducer(state, { type: "picked", components: ids.map(component) });
function begin(state = edit(initialState(), "Explain")) {
  return appReducer(state, {
    type: "send",
    user: {
      id: "user",
      role: "user",
      content: state.composer.text,
      references: [],
      metadata: "You",
    },
    assistant: {
      id: "assistant",
      role: "assistant",
      content: "",
      references: [],
      metadata: "Waiting",
    },
    request: {
      requestId: "request",
      message: { content: state.composer.text, references: [] },
      context: { selectedComponents: [] },
    },
  });
}
const event = (state, event, assistantId = "assistant") =>
  appReducer(state, {
    type: "stream",
    assistantId,
    event,
    components: [component("saved").footprint],
  });

test("selection events update React descriptors and singular/plural links without Elements", () => {
  let state = edit(initialState(), "this");
  const original = state;
  state = pick(state, "first", "second");
  assert.equal(state.open, true);
  assert.equal(state.selection, null);
  assert.deepEqual(state.selected, [component("first")]);
  assert.deepEqual(state.composer.references[0].targets, ["first"]);
  assert.deepEqual(
    original.composer.references[0].targets,
    [],
    "previous state is immutable",
  );

  state = edit(initialState(), "these");
  state = pick(state, "first", "second");
  state = pick(state, "second", "third");
  assert.equal(state.selection.mode, "link");
  assert.deepEqual(state.composer.references[0].targets, [
    "first",
    "second",
    "third",
  ]);
  state = appReducer(state, { type: "remove", id: "second" });
  assert.deepEqual(state.composer.references[0].targets, ["first", "third"]);
});

test("removing a token releases selection and cancels its linking mode", () => {
  let state = pick(edit(initialState(), "these"), "first", "second");
  state = edit(state, "");
  assert.deepEqual(state.selected, []);
  assert.deepEqual(state.composer.references, []);
  assert.equal(state.selection, null);
});

test("reference mode toggles preserve draft and rebuild tokens when enabled", () => {
  let state = edit(initialState(), "Explain this");
  state = appReducer(state, { type: "toggle-references", newId: "off" });
  assert.equal(state.composer.text, "Explain this");
  assert.deepEqual(state.composer.references, []);
  assert.equal(state.selection, null);
  state = appReducer(state, { type: "toggle-references", newId: "on" });
  assert.equal(state.composer.references[0].term, "this");
  assert.equal(state.selection.referenceId, state.composer.references[0].id);
});

test("unconfirmed delivery retains the draft; accepted delivery clears it", () => {
  const sending = begin();
  const failed = event(sending, { type: "failed", message: "Connection lost" });
  assert.equal(failed.sending, null);
  assert.equal(failed.composer.text, "Explain");
  assert.match(failed.messages[0].metadata, /draft retained/);
  assert.equal(failed.messages[1].metadata, "Connection lost");

  let accepted = event(sending, {
    type: "accepted",
    threadId: "thread",
    messageId: "message",
  });
  assert.equal(accepted.threadId, "thread");
  assert.equal(accepted.composer.text, "");
  assert.deepEqual(accepted.savedComponents, [component("saved").footprint]);
  accepted = event(accepted, { type: "failed", message: "Stopped" });
  assert.doesNotMatch(accepted.messages[0].metadata, /draft retained/);
});

test("stream content is state, and late/duplicate terminal events are ignored", () => {
  let state = begin();
  state = event(state, { type: "assistant", content: "First" });
  state = event(state, { type: "assistant", content: "Full response" });
  assert.equal(state.messages[1].content, "Full response");
  assert.strictEqual(
    event(state, { type: "failed", message: "Old stream" }, "old"),
    state,
  );
  state = event(state, { type: "completed" });
  assert.equal(state.messages[1].metadata, "Assistant");
  assert.strictEqual(
    event(state, { type: "failed", message: "Late failure" }),
    state,
  );
});

test("sending prevents new chat, editing, and additional selection", () => {
  const state = begin();
  assert.strictEqual(appReducer(state, { type: "new-chat" }), state);
  assert.strictEqual(edit(state, "replacement"), state);
  assert.strictEqual(
    appReducer(state, { type: "start", selection: { mode: "initial" } }),
    state,
  );
  assert.strictEqual(begin(state), state);
});

test("history restores product messages without claiming saved references are live anchors", () => {
  let state = pick(edit(initialState(), "this"), "target");
  state = appReducer(state, {
    type: "thread",
    thread: {
      id: "thread",
      title: "Saved",
      messages: [
        {
          id: "old",
          role: "user",
          content: "this",
          references: [{ id: "ref", targets: ["stale"] }],
          context: { selectedComponents: [component("saved").footprint] },
          createdAt: "2026-01-01T00:00:00Z",
          status: "completed",
        },
      ],
    },
  });
  assert.equal(state.title, "Saved");
  assert.deepEqual(state.selected, []);
  assert.deepEqual(state.messages[0].references, []);
  assert.equal(state.composer.text, "");
  state = appReducer(state, { type: "new-chat" });
  assert.equal(state.threadId, undefined);
  assert.deepEqual(state.messages, []);
});
