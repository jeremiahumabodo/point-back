import type { SendRequest } from "@pointback/protocol";

export type AgentEvent =
  | { type: "session"; id: string }
  | { type: "text"; content: string }
  | { type: "status"; message: string };

export type AgentRun = {
  project: string;
  sessionId?: string;
  request: SendRequest;
  signal: AbortSignal;
};

// One turn, optionally resuming an external session. Cancellation uses signal.
export type RunAgent = (
  run: AgentRun,
  emit: (event: AgentEvent) => void,
) => Promise<void>;
