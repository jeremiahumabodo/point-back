import { test } from "node:test";
import assert from "node:assert/strict";
import { readBridgeEvents } from "../src/bridge/bridge-event-stream.ts";

function body(chunks) {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
}
const encode = (text) => new TextEncoder().encode(text);
async function collect(stream) {
  const events = [];
  for await (const event of readBridgeEvents(stream)) events.push(event);
  return events;
}

test("bridge decoding preserves fragmented UTF-8, blank lines, and event order", async () => {
  const events = [
    { type: "heartbeat" },
    { type: "assistant", content: "Hello 🌍" },
    { type: "completed" },
  ];
  const bytes = encode(
    events.map((event) => JSON.stringify(event)).join("\n\n") + "\n",
  );
  const chunks = [...bytes].map((byte) => new Uint8Array([byte]));
  assert.deepEqual(await collect(body(chunks)), events);
});

test("a malformed line fails without discarding earlier events from the same chunk", async () => {
  const iterator = readBridgeEvents(
    body([encode('{"type":"heartbeat"}\ninvalid\n')]),
  );
  assert.deepEqual((await iterator.next()).value, { type: "heartbeat" });
  await assert.rejects(iterator.next(), SyntaxError);
});

test("oversized buffered events are rejected", async () => {
  await assert.rejects(
    collect(body([encode("x".repeat(1_000_001))])),
    /safety limit/,
  );
});

test("an unterminated trailing line is not emitted as a complete event", async () => {
  assert.deepEqual(await collect(body([encode('{"type":"completed"}')])), []);
});

test("underlying stream errors propagate to the conversation lifetime owner", async () => {
  const stream = new ReadableStream({
    start(controller) {
      controller.error(new Error("Connection lost"));
    },
  });
  await assert.rejects(collect(stream), /Connection lost/);
});
