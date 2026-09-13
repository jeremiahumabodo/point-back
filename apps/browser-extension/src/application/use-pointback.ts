import {
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  appReducer,
  initialState,
  type Component,
  type Selection,
} from "./state";
import {
  createBrowserMechanics,
  type ComponentInspection,
} from "../selection/browser-mechanics";
import { createReferenceEditor } from "../conversations/reference-editor";
import { isPluralReference } from "../conversations/conversation-state";
import { streamResponse } from "../conversations/stream-controller";
import { getThread, listThreads } from "../bridge/bridge-client";
import {
  loadBridgeAddress,
  saveBridgeSettings,
} from "../settings/bridge-settings";
import { mountPanelBehavior } from "../conversations/panel-behavior";
import { setupCustomScrollbar } from "../ui/custom-scrollbar";

export type BrowserSurface = {
  root: HTMLElement;
  shadow: ShadowRoot;
  host: HTMLElement;
};
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Bridge unavailable.";

/** React owns application state; adapters report events and consume commands/IDs. */
export function usePointBack(surface: BrowserSurface) {
  const [state, dispatch] = useReducer(appReducer, undefined, initialState);
  const [mechanics] = useState(createBrowserMechanics);
  const [inspection, setInspection] = useState<ComponentInspection | null>(
    null,
  );
  const [tooltip, setTooltip] = useState<{
    text: string;
    left: number;
    top: number;
  } | null>(null);
  const editor = useRef<ReturnType<typeof createReferenceEditor> | null>(null);
  const input = useRef<HTMLElement | null>(null);
  const stream = useRef<ReturnType<typeof streamResponse> | null>(null);
  const settingsGeneration = useRef(0);
  const addressEdited = useRef(false);
  const focus = () => input.current?.focus();
  function hideReferences() {
    mechanics.showReferences([]);
    setTooltip(null);
  }
  function setPane(pane: typeof state.pane) {
    settingsGeneration.current++;
    dispatch({
      type: "patch",
      patch: {
        pane,
        selection: null,
        history: { ...state.history, loadingId: undefined },
        settings: { ...state.settings, token: "", status: "", saving: false },
      },
    });
    hideReferences();
  }
  function start(selection: Selection | null) {
    if (state.sending && selection) return;
    hideReferences();
    dispatch({ type: "start", selection });
  }
  function edit() {
    if (!editor.current || state.sending) return;
    hideReferences();
    dispatch({
      type: "edit",
      text: editor.current.getDraft(),
      rendered: editor.current
        .getRenderedReferences()
        .map((reference) => ({ ...reference, targets: [] })),
      newId: crypto.randomUUID(),
    });
  }
  function send() {
    if (state.sending || !state.composer.text.trim()) return;
    const content = state.composer.text.trim();
    const leading =
      state.composer.text.length - state.composer.text.trimStart().length;
    const references = state.composer.references
      .filter((reference) => reference.targets.length)
      .map((reference) => ({
        ...reference,
        start: reference.start - leading,
        end: reference.end - leading,
        components: mechanics.resolve(reference.targets),
      }))
      .filter((reference) => reference.components.length);
    const components = state.selected.length
      ? mechanics.resolve(state.selected.map(({ id }) => id))
      : state.savedComponents;
    const userId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();
    hideReferences();
    dispatch({
      type: "send",
      user: {
        id: userId,
        role: "user",
        content,
        references,
        metadata: `You · ${new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date())}${references.length ? ` · ${references.length} reference${references.length === 1 ? "" : "s"}` : ""}`,
      },
      assistant: {
        id: assistantId,
        role: "assistant",
        content: "",
        references: [],
        metadata: "Assistant · Waiting for bridge…",
      },
      request: {
        requestId: crypto.randomUUID(),
        ...(state.threadId ? { threadId: state.threadId } : {}),
        message: {
          content,
          references: references.map(
            ({ targets: _targets, ...reference }) => reference,
          ),
        },
        context: { selectedComponents: components },
      },
    });
  }
  async function saveSettings() {
    if (state.settings.saving) return;
    const generation = ++settingsGeneration.current;
    const settings = { ...state.settings, status: "", saving: true };
    dispatch({ type: "patch", patch: { settings } });
    try {
      const address = await saveBridgeSettings(
        settings.address,
        settings.token,
      );
      if (generation === settingsGeneration.current)
        dispatch({
          type: "patch",
          patch: {
            pane: "conversation",
            settings: { address, token: "", status: "", saving: false },
          },
        });
    } catch (error) {
      if (generation === settingsGeneration.current)
        dispatch({
          type: "patch",
          patch: {
            settings: {
              ...settings,
              status: errorMessage(error),
              saving: false,
            },
          },
        });
    }
  }
  function activateReference(id: string) {
    if (state.sending) return;
    dispatch({
      type: "patch",
      patch: {
        composer: { ...state.composer, activeId: id },
        selection: { mode: "link", referenceId: id },
      },
    });
  }
  function hoverReference(id: string, token: HTMLElement) {
    const reference = state.composer.references.find(
      (reference) => reference.id === id,
    );
    if (!reference) return;
    mechanics.showReferences(reference.targets);
    const rect = token.getBoundingClientRect();
    setTooltip({
      text: `Point to a component to link “${reference.term}”.`,
      left: rect.left,
      top: rect.bottom + 6,
    });
  }
  const callbacks = {
    onCommand(command: "open" | "select") {
      if (command === "select") start({ mode: "initial" });
      else {
        dispatch({
          type: "patch",
          patch: {
            open: true,
            dark: window.matchMedia("(prefers-color-scheme: dark)").matches,
            selection: null,
          },
        });
      }
    },
    onPick(components: Component[]) {
      dispatch({ type: "picked", components });
      focus();
    },
    onEscape() {
      start(null);
    },
    hoverReference,
    activateReference,
  };
  // Long-lived native listeners always call the latest committed React handlers.
  const callbacksRef = useRef(callbacks);
  useLayoutEffect(() => {
    callbacksRef.current = callbacks;
  });

  useLayoutEffect(() => {
    const { root, shadow, host } = surface;
    input.current = root.querySelector<HTMLElement>(".pb-input")!;
    editor.current = createReferenceEditor(input.current, shadow);
    const dispose = mechanics.mount(root, host, {
      onCommand: (command) => callbacksRef.current.onCommand(command),
      onPick: (components) => callbacksRef.current.onPick(components),
      onEscape: () => callbacksRef.current.onEscape(),
      onInspect: setInspection,
    });
    const lifetime = new AbortController();
    mountPanelBehavior(
      {
        panel: root.querySelector<HTMLElement>(".pb-panel")!,
        panelHeader: root.querySelector<HTMLElement>(".pb-header")!,
      },
      lifetime.signal,
    );
    const scrollbars = [
      setupCustomScrollbar(
        root.querySelector<HTMLElement>(".pb-messages")!,
        root.querySelector<HTMLElement>(".pb-message-scroll")!,
        lifetime.signal,
      ),
      setupCustomScrollbar(
        input.current,
        root.querySelector<HTMLElement>(".pb-input-scroll")!,
        lifetime.signal,
      ),
    ];
    return () => {
      lifetime.abort();
      scrollbars.forEach((cleanup) => cleanup());
      dispose();
      editor.current = null;
      input.current = null;
      settingsGeneration.current++;
    };
  }, [surface, mechanics]);

  useLayoutEffect(() => {
    const reference = state.composer.references.find(
      (reference) => reference.id === state.selection?.referenceId,
    );
    mechanics.sync(
      state.open || state.selection ? state.selected.map(({ id }) => id) : [],
      state.selection,
      state.selection?.mode === "link" &&
        !!reference &&
        !isPluralReference(reference),
    );
    mechanics.retain(
      new Set([
        ...state.selected.map(({ id }) => id),
        ...state.composer.references.flatMap((reference) => reference.targets),
        ...state.messages.flatMap((message) =>
          message.references.flatMap((reference) => reference.targets),
        ),
      ]),
    );
  }, [
    mechanics,
    state.selected,
    state.selection,
    state.composer.references,
    state.messages,
    state.open,
  ]);

  useLayoutEffect(() => {
    if (!editor.current || !input.current) return;
    const caret =
      surface.shadow.activeElement === input.current
        ? editor.current.getCaretOffset()
        : null;
    editor.current.render(
      caret,
      state.composer.text,
      state.composer.references.map((reference) => ({
        ...reference,
        linked: reference.targets.length > 0,
      })),
      state.composer.activeId,
      {
        onEnter: (id, token) => callbacksRef.current.hoverReference(id, token),
        onLeave: hideReferences,
        onActivate: (id) => callbacksRef.current.activateReference(id),
      },
    );
  }, [state.composer, surface]);

  useLayoutEffect(() => {
    const messages = surface.root.querySelector<HTMLElement>(".pb-messages")!;
    messages.scrollTop = messages.scrollHeight;
  }, [state.messages, surface]);
  useEffect(() => {
    if (!state.open) return;
    if (state.pane === "settings")
      surface.root
        .querySelector<HTMLInputElement>(".pb-agent-bridge-address")
        ?.focus();
    if (state.pane === "conversation") input.current?.focus();
  }, [state.open, state.pane, surface]);

  const activeResponse = state.sending?.assistantId;
  const activeRequest = state.sending?.request;
  useEffect(() => {
    if (!activeResponse || !activeRequest) return;
    const response = streamResponse(activeRequest, (event) =>
      dispatch({
        type: "stream",
        assistantId: activeResponse,
        event,
        components: activeRequest.context.selectedComponents,
      }),
    );
    stream.current = response;
    return () => {
      response.dispose();
      if (stream.current === response) stream.current = null;
    };
    // accepted/status events must not reconnect an active stream.
  }, [activeResponse, activeRequest]);

  useEffect(() => {
    let active = true;
    void loadBridgeAddress()
      .then((address) => {
        if (active && !addressEdited.current)
          dispatch({
            type: "patch",
            patch: { settings: { ...initialState().settings, address } },
          });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (state.pane !== "history") return;
    let active = true;
    dispatch({
      type: "patch",
      patch: { history: { threads: [], status: "Loading conversations…" } },
    });
    void listThreads()
      .then((threads) => {
        if (active)
          dispatch({
            type: "patch",
            patch: { history: { threads, status: "" } },
          });
      })
      .catch((error) => {
        if (active)
          dispatch({
            type: "patch",
            patch: { history: { threads: [], status: errorMessage(error) } },
          });
      });
    return () => {
      active = false;
    };
  }, [state.pane]);
  const loadingThread = state.history.loadingId;
  useEffect(() => {
    if (state.pane !== "history" || !loadingThread) return;
    let active = true;
    void getThread(loadingThread)
      .then((thread) => {
        if (active) dispatch({ type: "thread", thread });
      })
      .catch((error) => {
        if (active)
          dispatch({
            type: "patch",
            patch: {
              history: {
                ...state.history,
                loadingId: undefined,
                status: errorMessage(error),
              },
            },
          });
      });
    return () => {
      active = false;
    };
  }, [state.pane, loadingThread]);

  return {
    state,
    inspection,
    tooltip,
    actions: {
      close() {
        setPane("conversation");
        dispatch({ type: "patch", patch: { open: false, selection: null } });
        mechanics.leaveChip();
      },
      toggleTheme: () =>
        dispatch({ type: "patch", patch: { dark: !state.dark } }),
      select: () =>
        start(state.selection?.mode === "add" ? null : { mode: "add" }),
      cancelSelection: () => start(null),
      replace: (id: string) => start({ mode: "replace", replacement: id }),
      remove(id: string) {
        if (!state.sending) {
          dispatch({ type: "remove", id });
          mechanics.leaveChip();
          hideReferences();
        }
      },
      hoverChip: mechanics.hoverChip,
      leaveChip: mechanics.leaveChip,
      showReferences: mechanics.showReferences,
      hideReferences,
      settings: () => {
        if (!state.sending)
          setPane(state.pane === "settings" ? "conversation" : "settings");
      },
      history: () => {
        if (!state.sending)
          setPane(state.pane === "history" ? "conversation" : "history");
      },
      back: () => setPane("conversation"),
      openThread: (id: string) =>
        dispatch({
          type: "patch",
          patch: { history: { ...state.history, loadingId: id } },
        }),
      newChat() {
        if (!state.sending) {
          hideReferences();
          dispatch({ type: "new-chat" });
          focus();
        }
      },
      stop: () => stream.current?.cancel(),
      send,
      edit,
      saveSettings,
      updateSettings(field: "address" | "token", value: string) {
        addressEdited.current = true;
        dispatch({
          type: "patch",
          patch: { settings: { ...state.settings, [field]: value } },
        });
      },
      toggleReferences() {
        if (!state.sending) {
          setPane("conversation");
          dispatch({ type: "toggle-references", newId: crypto.randomUUID() });
        }
      },
    },
  };
}
export type PointBackApplication = ReturnType<typeof usePointBack>;
