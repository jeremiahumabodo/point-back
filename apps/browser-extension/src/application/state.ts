import type {
  ComponentFootprint,
  ConversationEvent,
  MessageInput,
  SendRequest,
  ThreadDetail,
  ThreadSummary,
} from "@pointback/protocol";
import { reconcileReferences } from "../conversations/reconcile-references.ts";
import {
  isPluralReference,
  type DeicticReference,
} from "../conversations/conversation-state.ts";

/** Opaque page handles, never live Elements or Fiber objects. */
export type Component = { id: string; footprint: ComponentFootprint };
export type Reference = DeicticReference<string>;
export type Selection = {
  mode: "initial" | "add" | "replace" | "link";
  replacement?: string;
  referenceId?: string;
};
export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  references: Array<MessageInput["references"][number] & { targets: string[] }>;
  metadata: string;
};
export type AppState = {
  open: boolean;
  dark: boolean;
  pane: "conversation" | "settings" | "history";
  selected: Component[];
  selection: Selection | null;
  threadId?: string;
  title?: string;
  savedComponents: ComponentFootprint[];
  messages: Message[];
  sending: {
    userId: string;
    assistantId: string;
    accepted: boolean;
    request: SendRequest;
  } | null;
  composer: { text: string; references: Reference[]; activeId: string | null };
  deicticMode: boolean;
  history: { threads: ThreadSummary[]; status: string; loadingId?: string };
  settings: { address: string; token: string; status: string; saving: boolean };
};
export function initialState(): AppState {
  return {
    open: false,
    dark: false,
    pane: "conversation",
    selected: [],
    selection: null,
    savedComponents: [],
    messages: [],
    sending: null,
    composer: { text: "", references: [], activeId: null },
    deicticMode: true,
    history: { threads: [], status: "" },
    settings: {
      address: "http://127.0.0.1:3000",
      token: "",
      status: "",
      saving: false,
    },
  };
}
export type Action =
  | { type: "patch"; patch: Partial<AppState> }
  | { type: "start"; selection: Selection | null }
  | { type: "picked"; components: Component[] }
  | { type: "remove"; id: string }
  | { type: "edit"; text: string; rendered: Reference[]; newId: string }
  | { type: "toggle-references"; newId: string }
  | { type: "new-chat" }
  | { type: "thread"; thread: ThreadDetail }
  | { type: "send"; user: Message; assistant: Message; request: SendRequest }
  | {
      type: "stream";
      assistantId: string;
      event: ConversationEvent;
      components: ComponentFootprint[];
    };

function withSelected(state: AppState, selected: Component[]): AppState {
  const ids = new Set(selected.map(({ id }) => id));
  return {
    ...state,
    selected,
    composer: {
      ...state.composer,
      references: state.composer.references.map((reference) => ({
        ...reference,
        targets: reference.targets.filter((id) => ids.has(id)),
      })),
    },
  };
}
function merge(left: Component[], right: Component[]) {
  return [
    ...new Map(
      [...left, ...right].map((component) => [component.id, component]),
    ).values(),
  ];
}
/** Pure application transitions. Browser and stream callbacks only dispatch events. */
export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "patch":
      return { ...state, ...action.patch };
    case "start":
      if (state.sending && action.selection) return state;
      return action.selection?.mode === "initial"
        ? withSelected(
            { ...state, open: false, selection: action.selection },
            [],
          )
        : { ...state, selection: action.selection };
    case "remove":
      return withSelected(
        state,
        state.selected.filter(({ id }) => id !== action.id),
      );
    case "picked": {
      const selection = state.selection;
      if (!selection || state.sending) return state;
      const reference = state.composer.references.find(
        ({ id }) => id === selection.referenceId,
      );
      const picked =
        selection.mode === "replace" ||
        (selection.mode === "link" &&
          reference &&
          !isPluralReference(reference))
          ? action.components.slice(0, 1)
          : action.components;
      let selected = state.selected;
      if (selection.mode === "initial") selected = [];
      if (selection.mode === "replace")
        selected = selected.filter(({ id }) => id !== selection.replacement);
      let next = withSelected(state, merge(selected, picked));
      if (selection.mode === "link" && reference) {
        next = {
          ...next,
          composer: {
            ...next.composer,
            references: next.composer.references.map((item) =>
              item.id === reference.id
                ? {
                    ...item,
                    targets: isPluralReference(item)
                      ? [
                          ...new Set([
                            ...item.targets,
                            ...picked.map(({ id }) => id),
                          ]),
                        ]
                      : picked.map(({ id }) => id),
                  }
                : item,
            ),
          },
        };
      }
      return {
        ...next,
        open: true,
        selection:
          selection.mode === "add" ||
          (selection.mode === "link" &&
            reference &&
            isPluralReference(reference))
            ? selection
            : null,
      };
    }
    case "edit": {
      if (state.sending) return state;
      let index = 0;
      const result = reconcileReferences<string>(
        action.text,
        state.composer.references,
        action.rendered,
        () => `${action.newId}-${index++}`,
      );
      const references = state.deicticMode ? result.references : [];
      const activeId =
        result.newestId ??
        (references.some(({ id }) => id === state.composer.activeId)
          ? state.composer.activeId
          : (references.at(-1)?.id ?? null));
      return {
        ...state,
        selected: state.selected.filter(
          ({ id }) => !result.releasedTargets.has(id),
        ),
        composer: { text: action.text, references, activeId },
        selection:
          state.deicticMode && result.newestId
            ? { mode: "link", referenceId: result.newestId }
            : state.selection?.mode === "link" &&
                !references.some(
                  ({ id }) => id === state.selection?.referenceId,
                )
              ? null
              : state.selection,
      };
    }
    case "toggle-references":
      if (!state.deicticMode)
        return appReducer(
          { ...state, deicticMode: true },
          {
            type: "edit",
            text: state.composer.text,
            rendered: [],
            newId: action.newId,
          },
        );
      return {
        ...state,
        deicticMode: false,
        selection: state.selection?.mode === "link" ? null : state.selection,
        composer: { ...state.composer, references: [], activeId: null },
      };
    case "new-chat":
      if (state.sending) return state;
      return {
        ...state,
        pane: "conversation",
        selected: [],
        selection: null,
        threadId: undefined,
        history: { ...state.history, loadingId: undefined },
        title: undefined,
        savedComponents: [],
        messages: [],
        composer: initialState().composer,
      };
    case "thread": {
      if (state.sending) return state;
      const thread = action.thread;
      return {
        ...state,
        pane: "conversation",
        selected: [],
        selection: null,
        threadId: thread.id,
        history: { ...state.history, loadingId: undefined },
        title: thread.title,
        savedComponents:
          thread.messages.find((message) => message.role === "user")?.context
            .selectedComponents ?? [],
        composer: initialState().composer,
        // Persisted footprints are evidence, not live page anchors after reload.
        messages: thread.messages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          references: [],
          metadata:
            message.role === "user"
              ? `You · ${new Date(message.createdAt).toLocaleTimeString()}`
              : message.error ||
                (message.status === "running"
                  ? "Response is active in another tab. Reopen history to refresh."
                  : "Assistant"),
        })),
      };
    }
    case "send":
      if (state.sending) return state;
      return {
        ...state,
        selection: null,
        messages: [...state.messages, action.user, action.assistant],
        sending: {
          userId: action.user.id,
          assistantId: action.assistant.id,
          accepted: false,
          request: action.request,
        },
      };
    case "stream": {
      const sending = state.sending;
      if (!sending || sending.assistantId !== action.assistantId) return state;
      const event = action.event;
      if (event.type === "accepted")
        return {
          ...state,
          threadId: event.threadId,
          savedComponents: action.components,
          sending: { ...sending, accepted: true },
          composer: initialState().composer,
        };
      const terminal = event.type === "completed" || event.type === "failed";
      return {
        ...state,
        sending: terminal ? null : sending,
        messages: state.messages.map((message) => {
          if (message.id === sending.assistantId)
            return {
              ...message,
              content:
                event.type === "assistant" ? event.content : message.content,
              metadata:
                event.type === "completed"
                  ? "Assistant"
                  : event.type === "status" || event.type === "failed"
                    ? event.message
                    : message.metadata,
            };
          if (
            message.id === sending.userId &&
            event.type === "failed" &&
            !sending.accepted
          )
            return {
              ...message,
              metadata: `${message.metadata} · Delivery unconfirmed — draft retained`,
            };
          return message;
        }),
      };
    }
  }
}
