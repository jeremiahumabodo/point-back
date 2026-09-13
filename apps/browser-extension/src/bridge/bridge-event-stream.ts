import type { ConversationEvent } from "@pointback/protocol";

export type BridgeEvent = ConversationEvent | { type: "heartbeat" };

function* parseLines(buffer: string): Generator<BridgeEvent, string> {
  if (buffer.length > 1_000_000)
    throw new Error("Bridge event exceeded the safety limit.");
  const lines = buffer.split("\n");
  const remaining = lines.pop() ?? "";
  for (const line of lines) {
    if (line.trim()) yield JSON.parse(line) as BridgeEvent;
  }
  return remaining;
}

/** Decode the bridge's newline-delimited stream independently of port lifetime. */
export async function* readBridgeEvents(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<BridgeEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) return;
      buffer = yield* parseLines(
        buffer + decoder.decode(value, { stream: true }),
      );
    }
  } finally {
    reader.releaseLock();
  }
}
