import { test } from "node:test";
import assert from "node:assert/strict";
import { streamResponse } from "../src/conversations/stream-controller.ts";

function mockBridge() {
  const messages = [];
  let receive;
  let disconnect;
  let disconnected = false;
  globalThis.browser = {
    runtime: {
      connect: () => ({
        onMessage: {
          addListener: (fn) => {
            receive = fn;
          },
        },
        onDisconnect: {
          addListener: (fn) => {
            disconnect = fn;
          },
        },
        postMessage: (message) => messages.push(message),
        disconnect() {
          disconnected = true;
          disconnect();
        },
      }),
    },
  };
  return {
    messages,
    emit: (event) => receive(event),
    disconnect: () => disconnect(),
    get disconnected() {
      return disconnected;
    },
  };
}
const request = {
  requestId: "request",
  message: { content: "Hi", references: [] },
  context: { selectedComponents: [] },
};

test("transport forwards product events, ignores heartbeats and terminates once", () => {
  const bridge = mockBridge();
  const events = [];
  const stream = streamResponse(request, (event) => events.push(event));
  assert.deepEqual(bridge.messages, [{ type: "send", request }]);
  bridge.emit({ type: "heartbeat" });
  bridge.emit({ type: "assistant", content: "Hello" });
  bridge.emit({ type: "completed" });
  bridge.emit({ type: "failed", message: "late" });
  bridge.disconnect();
  assert.deepEqual(events, [
    { type: "assistant", content: "Hello" },
    { type: "completed" },
  ]);
  stream.dispose();
  assert.equal(bridge.disconnected, true);
  assert.equal(
    bridge.messages.length,
    1,
    "completed responses are not cancelled",
  );
});

test("cancel delegates to transport; disposal disconnects and suppresses late events", () => {
  const bridge = mockBridge();
  const events = [];
  const stream = streamResponse(request, (event) => events.push(event));
  stream.cancel();
  assert.deepEqual(bridge.messages[1], { type: "cancel" });
  stream.dispose();
  bridge.emit({ type: "assistant", content: "late" });
  assert.equal(bridge.disconnected, true);
  assert.deepEqual(events, []);
});

test("connection startup failures become failed events, not a stuck sending state", () => {
  globalThis.browser = {
    runtime: {
      connect() {
        throw new Error("Offline");
      },
    },
  };
  const events = [];
  const stream = streamResponse(request, (event) => events.push(event));
  assert.deepEqual(events, [{ type: "failed", message: "Offline" }]);
  stream.cancel();
  stream.dispose();
});
