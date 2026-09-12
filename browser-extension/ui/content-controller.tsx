import type { ReactNode } from "react";
import {
  buildReferenceDraft,
  editorSelection,
} from "../../component-lab/src/components/input-field/reference-editor-dom";
import { ComponentTag } from "../../component-lab/src/components/component-tag";
import { DeicticReference as ReferenceToken } from "../../component-lab/src/components/deictic-reference";
import {
  MessageBubble,
  EmptyConversation,
} from "../../component-lab/src/components/message-bubble/message-bubble";
import {
  ComponentDetails,
  Highlights,
} from "../../component-lab/src/components/selection-overlay/selection-overlay";
import type { ReactSlots } from "./react-slots";
import { sendMessageToAgentBridge } from "../agent-bridge/message-client";
import type { ThreadDetail } from "../../shared/conversation.ts";
import { resolveComponent } from "../component-resolution/resolve-component";
import type { ComponentFootprint } from "../component-resolution/types";
import { createHistoryController } from "../history/history-controller";
import { createSettingsController } from "../settings/settings-controller";

type PointBackMessage = {
  type: "pointback:start-selection" | "pointback:open-panel";
};
type SelectionMode = "initial" | "add" | "replace" | "link";

type DeicticReference = {
  id: string;
  term: string;
  start: number;
  end: number;
  targets: Element[];
};

type StructuredMessage = {
  content: string;
  references: Array<
    Omit<DeicticReference, "targets"> & {
      components: ComponentFootprint[];
      targets: Element[];
    }
  >;
};

export function mountContentController(
  root: HTMLElement,
  shadow: ShadowRoot,
  host: HTMLElement,
  slots: ReactSlots,
) {
  const lifetime = new AbortController();
  let disposed = false;
  function listenWindow<K extends keyof WindowEventMap>(
    type: K,
    listener: (event: WindowEventMap[K]) => void,
    capture = false,
  ) {
    window.addEventListener(type, listener, {
      capture,
      signal: lifetime.signal,
    });
  }
  function listenDocument<K extends keyof DocumentEventMap>(
    type: K,
    listener: (event: DocumentEventMap[K]) => void,
    capture = false,
  ) {
    document.addEventListener(type, listener, {
      capture,
      signal: lifetime.signal,
    });
  }
  const hint = root.querySelector<HTMLElement>(".pb-selection-hint")!;
  const selectionInstruction = root.querySelector<HTMLElement>(
    ".pb-selection-instruction",
  )!;
  const cancelButton = root.querySelector<HTMLButtonElement>(
    ".pb-cancel-selection",
  )!;
  const lasso = root.querySelector<HTMLElement>(".pb-lasso")!;
  const selectedHighlights = root.querySelector<HTMLElement>(
    ".pb-selected-highlights",
  )!;
  const replacementHighlight = root.querySelector<HTMLElement>(
    ".pb-replacement-highlight",
  )!;
  const deicticTargetHighlights = root.querySelector<HTMLElement>(
    ".pb-deictic-target-highlights",
  )!;
  const panel = root.querySelector<HTMLElement>(".pb-panel")!;
  const panelHeader = root.querySelector<HTMLElement>(".pb-header")!;
  const selectComponentsButton = root.querySelector<HTMLButtonElement>(
    ".pb-select-components",
  )!;
  const themeToggle =
    root.querySelector<HTMLButtonElement>(".pb-theme-toggle")!;
  const closeButton = root.querySelector<HTMLButtonElement>(".pb-close")!;
  const componentName = root.querySelector<HTMLElement>(".pb-component-name")!;
  const componentList = root.querySelector<HTMLElement>(".pb-component-list")!;
  const messages = root.querySelector<HTMLElement>(".pb-messages")!;
  const messageScroll = root.querySelector<HTMLElement>(".pb-message-scroll")!;
  const inputScroll = root.querySelector<HTMLElement>(".pb-input-scroll")!;
  const form = root.querySelector<HTMLFormElement>(".pb-composer")!;
  const settingsButton = root.querySelector<HTMLButtonElement>(".pb-settings")!;
  const settingsPane = root.querySelector<HTMLElement>(".pb-settings-pane")!;
  const settingsForm =
    root.querySelector<HTMLFormElement>(".pb-settings-form")!;
  const settingsCloseButton =
    root.querySelector<HTMLButtonElement>(".pb-settings-close")!;
  const settingsCancelButton = root.querySelector<HTMLButtonElement>(
    ".pb-settings-cancel",
  )!;
  const historyButton = root.querySelector<HTMLButtonElement>(".pb-history")!;
  const historyPane = root.querySelector<HTMLElement>(".pb-history-pane")!;
  const historyCloseButton =
    root.querySelector<HTMLButtonElement>(".pb-history-close")!;
  const newChatButtons = [
    ...root.querySelectorAll<HTMLButtonElement>(".pb-new-chat"),
  ]!;
  const bridgeAddressInput = root.querySelector<HTMLInputElement>(
    ".pb-agent-bridge-address",
  )!;
  const bridgeTokenInput =
    root.querySelector<HTMLInputElement>(".pb-bridge-token")!;
  const input = root.querySelector<HTMLElement>(".pb-input")!;
  const deicticToggle =
    root.querySelector<HTMLButtonElement>(".pb-deictic-toggle")!;
  const deicticTooltip = root.querySelector<HTMLElement>(
    ".pb-deictic-tooltip",
  )!;
  const componentDetailsPopover = root.querySelector<HTMLElement>(
    ".pb-component-details-popover",
  )!;
  const sendButton = root.querySelector<HTMLButtonElement>(".pb-send")!;
  const stopButton = root.querySelector<HTMLButtonElement>(".pb-stop")!;
  let threadId: string | undefined;
  let isSending = false;
  let cancelResponse: (() => void) | undefined;
  function setupCustomScrollbar(scrollElement: HTMLElement, scrollShell: HTMLElement) {
    const scrollbar = scrollShell.querySelector<HTMLElement>(".pb-scrollbar")!;
    const scrollbarTrack = scrollShell.querySelector<HTMLElement>(".pb-scrollbar-track")!;
    const scrollbarThumb = scrollShell.querySelector<HTMLElement>(".pb-scrollbar-thumb")!;
    let dragStart: { y: number; scrollTop: number } | null = null;
    const update = () => {
      const trackHeight = scrollbarTrack.clientHeight;
      const viewportHeight = scrollElement.clientHeight;
      const scrollHeight = scrollElement.scrollHeight;
      if (!trackHeight || !scrollHeight || scrollHeight <= viewportHeight + 1) {
        scrollShell.classList.add("pb-scrollbar-no-scroll");
        return;
      }
      scrollShell.classList.remove("pb-scrollbar-no-scroll");
      const thumbHeight = Math.max(18, (viewportHeight / scrollHeight) * trackHeight);
      const maxTop = trackHeight - thumbHeight;
      const maxScrollTop = scrollHeight - viewportHeight;
      scrollbarThumb.style.height = `${thumbHeight}px`;
      scrollbarThumb.style.top = `${maxScrollTop ? (scrollElement.scrollTop / maxScrollTop) * maxTop : 0}px`;
    };
    const show = () => {
      scrollbar.classList.add("is-active");
      window.setTimeout(() => {
        if (!dragStart && !scrollShell.matches(":hover")) scrollbar.classList.remove("is-active");
      }, 900);
    };
    const updatePointerProximity = (event: PointerEvent) => {
      const rect = scrollShell.getBoundingClientRect();
      const nearScrollbar =
        event.clientX >= rect.right - 50 &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      scrollbar.classList.toggle("is-near", nearScrollbar);
    };
    const stopDrag = () => {
      dragStart = null;
      scrollbarThumb.classList.remove("is-dragging");
      show();
    };
    scrollShell.addEventListener("pointermove", updatePointerProximity, { signal: lifetime.signal });
    scrollShell.addEventListener("pointerleave", () => {
      scrollbar.classList.remove("is-near");
    }, { signal: lifetime.signal });
    scrollElement.addEventListener("scroll", () => { update(); show(); }, { signal: lifetime.signal });
    scrollbarThumb.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      dragStart = { y: event.clientY, scrollTop: scrollElement.scrollTop };
      scrollbarThumb.classList.add("is-dragging");
      scrollbar.classList.add("is-active");
      scrollbarThumb.setPointerCapture(event.pointerId);
    }, { signal: lifetime.signal });
    scrollbarThumb.addEventListener("pointermove", (event) => {
      if (!dragStart) return;
      const maxScrollTop = scrollElement.scrollHeight - scrollElement.clientHeight;
      const maxThumbTop = scrollbarTrack.clientHeight - scrollbarThumb.offsetHeight;
      if (maxThumbTop > 0) scrollElement.scrollTop = dragStart.scrollTop + ((event.clientY - dragStart.y) / maxThumbTop) * maxScrollTop;
    }, { signal: lifetime.signal });
    scrollbarThumb.addEventListener("pointerup", stopDrag, { signal: lifetime.signal });
    scrollbarThumb.addEventListener("pointercancel", stopDrag, { signal: lifetime.signal });
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(scrollElement);
    const mutationObserver = new MutationObserver(update);
    mutationObserver.observe(scrollElement, { childList: true, subtree: true, characterData: true });
    update();
    return () => { resizeObserver.disconnect(); mutationObserver.disconnect(); };
  }
  const messageScrollbarCleanup = setupCustomScrollbar(messages, messageScroll);
  const inputScrollbarCleanup = setupCustomScrollbar(input, inputScroll);
  let savedComponents: ComponentFootprint[] = [];
  stopButton.addEventListener("click", () => cancelResponse?.());

  const selectedElements = new Set<Element>();
  let highlightedElement: Element | null = null;
  let isSelecting = false;
  let lassoStart: { x: number; y: number } | null = null;
  let suppressNextClick = false;
  let panelDrag: { offsetX: number; offsetY: number } | null = null;
  let selectionMode: SelectionMode = "initial";
  let replacementElement: Element | null = null;
  let isAddModeActive = false;
  let deicticMode = true;
  let deicticReferences: DeicticReference[] = [];
  let activeDeicticReferenceId: string | null = null;
  let highlightedDeicticReferenceId: string | null = null;
  let linkReferenceId: string | null = null;
  let nextDeicticReferenceId = 1;
  const componentByChip = new WeakMap<HTMLElement, Element>();
  let inspectedComponent: { element: Element; anchor: HTMLElement } | null =
    null;
  let hoveredComponent: { element: Element; anchor: HTMLElement } | null = null;
  let isInspectModifierHeld = false;
  const deicticWords = new Set(["this", "that", "these", "those", "here"]);

  function isPointBackUi(element: Element) {
    return element === host || root.contains(element);
  }

  function getComponentName(element: Element): string {
    return resolveComponent(element).name;
  }

  function getComponentTagName(element: Element): string {
    return `<${resolveComponent(element).tagName}>`;
  }

  function hideComponentDetails() {
    inspectedComponent = null;
    componentDetailsPopover.hidden = true;
    slots.clear(componentDetailsPopover);
  }

  function positionComponentDetails(anchor: HTMLElement) {
    const anchorRect = anchor.getBoundingClientRect();
    const margin = 8;
    const popoverRect = componentDetailsPopover.getBoundingClientRect();
    const left = Math.min(
      Math.max(margin, anchorRect.left),
      window.innerWidth - popoverRect.width - margin,
    );
    const top = anchorRect.bottom + margin;
    const pointerLeft = Math.min(
      Math.max(12, anchorRect.left + anchorRect.width / 2 - left),
      popoverRect.width - 12,
    );

    componentDetailsPopover.style.left = `${left}px`;
    componentDetailsPopover.style.top = `${top}px`;
    componentDetailsPopover.style.setProperty(
      "--pb-popover-pointer-left",
      `${pointerLeft}px`,
    );
  }

  function showComponentDetails(element: Element, anchor: HTMLElement) {
    const footprint = resolveComponent(element);
    const source = footprint.react?.component.source;
    const sourceLocation = source
      ? `${source.fileName}${source.lineNumber ? `:${source.lineNumber}${source.columnNumber ? `:${source.columnNumber}` : ""}` : ""}`
      : undefined;
    const attributes: Array<[string, string]> = [
      ["tagName", `<${footprint.tagName}>`],
      ["name", footprint.name],
      ["page", `${footprint.page.origin}${footprint.page.path}`],
      ["selector", footprint.selector],
      ["DOM path", footprint.domPath.join(" > ")],
      ...(footprint.react
        ? [
            ["React component", footprint.react.component.name] as [
              string,
              string,
            ],
          ]
        : []),
      ...(sourceLocation
        ? [["source", sourceLocation] as [string, string]]
        : []),
      ...(footprint.react?.ancestry.length
        ? [
            [
              "React ancestry",
              footprint.react.ancestry
                .map((component) => component.name)
                .join(" ← "),
            ] as [string, string],
          ]
        : []),
      ...(footprint.id ? [["id", footprint.id] as [string, string]] : []),
      ...(footprint.componentName
        ? [["data-component-name", footprint.componentName] as [string, string]]
        : []),
      ...(footprint.testId
        ? [["data-testid", footprint.testId] as [string, string]]
        : []),
      ...(footprint.ariaLabel
        ? [["aria-label", footprint.ariaLabel] as [string, string]]
        : []),
      ...(footprint.role ? [["role", footprint.role] as [string, string]] : []),
      ...(footprint.textExcerpt
        ? [["text", footprint.textExcerpt] as [string, string]]
        : []),
    ];
    slots.render(
      componentDetailsPopover,
      <ComponentDetails attributes={attributes} />,
    );
    componentDetailsPopover.hidden = false;
    inspectedComponent = { element, anchor };
    positionComponentDetails(anchor);
  }

  function removeHighlight() {
    highlightedElement?.classList.remove("pointback-highlight");
    highlightedElement = null;
  }

  function showReplacementHighlight(element: Element) {
    const rect = element.getBoundingClientRect();
    replacementHighlight.style.left = `${rect.left}px`;
    replacementHighlight.style.top = `${rect.top}px`;
    replacementHighlight.style.width = `${rect.width}px`;
    replacementHighlight.style.height = `${rect.height}px`;
    replacementHighlight.hidden = false;
  }

  function hideReplacementHighlight() {
    replacementHighlight.hidden = true;
  }

  function showDeicticTargetHighlights(targets: readonly Element[]) {
    slots.render(
      deicticTargetHighlights,
      <Highlights
        className="pb-deictic-target-highlight"
        rectangles={rectanglesFor(targets)}
      />,
    );
  }

  function hideDeicticTargetHighlights() {
    highlightedDeicticReferenceId = null;
    slots.clear(deicticTargetHighlights);
  }

  function refreshDeicticTargetHighlights() {
    const reference = deicticReferences.find(
      (item) => item.id === highlightedDeicticReferenceId,
    );
    if (reference) showDeicticTargetHighlights(reference.targets);
    else hideDeicticTargetHighlights();
  }

  function rectanglesFor(elements: readonly Element[]) {
    return elements.flatMap((element) => {
      const { left, top, width, height } = element.getBoundingClientRect();
      return width && height ? [{ left, top, width, height }] : [];
    });
  }

  function renderSelectedHighlights() {
    slots.render(
      selectedHighlights,
      <Highlights
        className="pb-selected-component-highlight"
        rectangles={rectanglesFor([...selectedElements])}
      />,
    );
  }

  function clearSelection() {
    for (const element of selectedElements) {
      element.classList.remove("pointback-selected");
    }
    selectedElements.clear();
    renderSelectedHighlights();
  }

  function addToSelection(element: Element) {
    selectedElements.add(element);
    element.classList.add("pointback-selected");
    renderSelectedHighlights();
  }

  function updateSelectionHeader() {
    hideComponentDetails();
    hoveredComponent = null;
    const elements = [...selectedElements];
    componentName.textContent = `${elements.length} Component${elements.length === 1 ? "" : "s"} selected`;
    slots.render(
      componentList,
      <>
        {elements.map((element, index) => {
          const tagName = getComponentTagName(element);
          return (
            <ComponentTag
              key={index}
              name={tagName}
              removeLabel={getComponentName(element)}
              selected={element === replacementElement}
              disabled={isSending}
              chipRef={(chip) => {
                if (chip) componentByChip.set(chip, element);
              }}
              title={`Replace ${tagName}. Hold Ctrl or ⌘ to inspect resolved attributes.`}
              onPointerEnter={(event) => {
                const chip = event.currentTarget;
                hoveredComponent = { element, anchor: chip };
                removeHighlight();
                highlightedElement = element;
                element.classList.add("pointback-highlight");
                if (isInspectModifierHeld || event.ctrlKey || event.metaKey)
                  showComponentDetails(element, chip);
              }}
              onPointerLeave={() => {
                hoveredComponent = null;
                hideComponentDetails();
                removeHighlight();
              }}
              onFocus={(event) => {
                if (isInspectModifierHeld)
                  showComponentDetails(element, event.currentTarget);
              }}
              onBlur={hideComponentDetails}
              onClick={() => {
                startSelecting("replace", element);
                highlightedElement = element;
                element.classList.add("pointback-highlight");
                showReplacementHighlight(element);
              }}
              onKeyDown={(event) => {
                if (event.key === "Delete") {
                  event.preventDefault();
                  removeComponent(element);
                }
              }}
              onRemove={() => removeComponent(element)}
            />
          );
        })}
      </>,
    );
    updateDeicticAvailability();
  }

  function getDraft() {
    return input.innerText.replace(/\r/g, "");
  }

  function getDeicticReferenceCandidates(text: string) {
    const references: Array<Pick<DeicticReference, "term" | "start" | "end">> =
      [];
    for (const match of text.matchAll(/[a-z]+/gi)) {
      const term = match[0].toLowerCase();
      const start = match.index ?? 0;
      if (deicticWords.has(term))
        references.push({ term, start, end: start + match[0].length });
    }
    return references;
  }

  function getRenderedDeicticReferences() {
    return [
      ...input.querySelectorAll<HTMLElement>(".pb-deictic-reference"),
    ].map((token) => {
      const range = document.createRange();
      range.selectNodeContents(input);
      range.setEndBefore(token);
      const before = document.createElement("div");
      before.append(range.cloneContents());
      const start = (before.textContent ?? "").replace(/\r/g, "").length;
      const term = token.dataset.term ?? "";
      return {
        id: token.dataset.referenceId ?? "",
        term,
        start,
        end: start + term.length,
      };
    });
  }

  function syncDeicticReferences(text: string) {
    const referencesById = new Map(
      deicticReferences.map((reference) => [reference.id, reference]),
    );
    const renderedReferences = getRenderedDeicticReferences();
    const matchedReferenceIds = new Set<string>();
    let newestReferenceId: string | null = null;
    deicticReferences = getDeicticReferenceCandidates(text).map((candidate) => {
      const renderedReference = renderedReferences.find(
        (reference) =>
          !matchedReferenceIds.has(reference.id) &&
          reference.term === candidate.term &&
          reference.start === candidate.start &&
          reference.end === candidate.end,
      );
      const existing = renderedReference
        ? referencesById.get(renderedReference.id)
        : undefined;
      if (existing && renderedReference) {
        matchedReferenceIds.add(renderedReference.id);
        return { ...existing, ...candidate };
      }

      const reference = {
        ...candidate,
        id: `reference-${nextDeicticReferenceId++}`,
        targets: [],
      };
      newestReferenceId = reference.id;
      return reference;
    });

    const removedReferences = [...referencesById.values()].filter(
      (reference) => !matchedReferenceIds.has(reference.id),
    );
    if (removedReferences.length > 0) {
      const targetsStillReferenced = new Set(
        deicticReferences.flatMap((reference) => reference.targets),
      );
      for (const removedReference of removedReferences) {
        for (const target of removedReference.targets) {
          if (targetsStillReferenced.has(target)) continue;
          target.classList.remove("pointback-selected", "pointback-highlight");
          selectedElements.delete(target);
        }
      }
      renderSelectedHighlights();
      updateSelectionHeader();
    }

    if (newestReferenceId) activeDeicticReferenceId = newestReferenceId;
    if (
      !deicticReferences.some(
        (reference) => reference.id === activeDeicticReferenceId,
      )
    ) {
      activeDeicticReferenceId = deicticReferences.at(-1)?.id ?? null;
    }
    return newestReferenceId;
  }

  function createComponentFootprint(element: Element): ComponentFootprint {
    return resolveComponent(element);
  }

  function hideDeicticTooltip() {
    deicticTooltip.hidden = true;
  }

  function showDeicticTooltip(reference: HTMLElement) {
    const rect = reference.getBoundingClientRect();
    deicticTooltip.textContent = `Point to a component to link “${reference.dataset.term}”.`;
    deicticTooltip.style.left = `${rect.left}px`;
    deicticTooltip.style.top = `${rect.bottom + 6}px`;
    deicticTooltip.hidden = false;
  }

  function getCaretOffset() {
    const selection = editorSelection(shadow);
    if (!selection?.rangeCount) return null;
    const range = selection.getRangeAt(0);
    if (!input.contains(range.endContainer)) return null;

    const beforeCaret = range.cloneRange();
    beforeCaret.selectNodeContents(input);
    beforeCaret.setEnd(range.endContainer, range.endOffset);
    return beforeCaret.toString().length;
  }

  function restoreCaret(
    offset: number,
    textNodes: Array<{ node: Text; start: number; end: number }>,
    tokens: Array<{
      element: HTMLElement;
      reference: { start: number; end: number };
    }>,
  ) {
    const range = document.createRange();
    const textNode = textNodes.find(
      ({ start, end }) => offset >= start && offset <= end,
    );
    if (textNode) {
      range.setStart(textNode.node, offset - textNode.start);
    } else {
      const token = tokens.find(
        ({ reference }) => offset >= reference.start && offset <= reference.end,
      );
      if (token && offset <= token.reference.start)
        range.setStartBefore(token.element);
      else if (token) range.setStartAfter(token.element);
      else range.selectNodeContents(input);
    }
    range.collapse(true);
    const selection = editorSelection(shadow);
    input.focus({ preventScroll: true });
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  function setActiveDeicticReference(reference: DeicticReference) {
    activeDeicticReferenceId = reference.id;
    input
      .querySelectorAll<HTMLElement>(".pb-deictic-reference")
      .forEach((token) => {
        token.classList.toggle(
          "pb-deictic-reference-active",
          token.dataset.referenceId === reference.id,
        );
      });
  }

  function isPluralDeictic(reference: DeicticReference) {
    return reference.term === "these" || reference.term === "those";
  }

  function linkComponentToReference(
    reference: DeicticReference,
    component: Element,
  ) {
    if (!selectedElements.has(component)) addToSelection(component);
    if (isPluralDeictic(reference)) {
      if (!reference.targets.includes(component))
        reference.targets.push(component);
    } else {
      reference.targets = [component];
    }
    input
      .querySelector<HTMLElement>(`[data-reference-id="${reference.id}"]`)
      ?.classList.add("pb-deictic-reference-linked");
    updateSelectionHeader();
    updateSendButton();
  }

  function decorateDeicticReferences() {
    if (!deicticMode) return;

    const caretOffset =
      shadow.activeElement === input ? getCaretOffset() : null;
    const text = getDraft();
    const newestReferenceId = syncDeicticReferences(text);
    const { fragment, textNodes, tokens } = buildReferenceDraft(
      text,
      deicticReferences.map((reference) => ({
        ...reference,
        linked: reference.targets.length > 0,
      })),
      activeDeicticReferenceId,
      {
        onEnter(id, token) {
          const reference = deicticReferences.find((item) => item.id === id);
          if (!reference) return;
          setActiveDeicticReference(reference);
          highlightedDeicticReferenceId = id;
          showDeicticTooltip(token);
          showDeicticTargetHighlights(reference.targets);
        },
        onLeave() {
          hideDeicticTooltip();
          hideDeicticTargetHighlights();
          if (!replacementElement) hideReplacementHighlight();
        },
        onActivate(id) {
          const reference = deicticReferences.find((item) => item.id === id);
          if (!reference) return;
          setActiveDeicticReference(reference);
          highlightedDeicticReferenceId = id;
          showDeicticTargetHighlights(reference.targets);
          startSelecting("link", null, id);
        },
      },
    );
    input.replaceChildren(fragment);
    if (caretOffset !== null) restoreCaret(caretOffset, textNodes, tokens);
    if (newestReferenceId) startSelecting("link", null, newestReferenceId);
  }

  function updateSendButton() {
    sendButton.disabled = isSending || !getDraft().trim();
    stopButton.hidden = !isSending;
    for (const button of newChatButtons) button.hidden = isSending;
    historyButton.disabled = isSending;
    settingsButton.disabled = isSending;
    selectComponentsButton.disabled = isSending;
    deicticToggle.disabled = isSending;
    for (const button of componentList.querySelectorAll<HTMLButtonElement>(
      "button",
    ))
      button.disabled = isSending;
    for (const button of newChatButtons) button.disabled = isSending;
  }

  function updateDeicticAvailability() {
    const currentSelections = new Set(selectedElements);
    deicticReferences.forEach((reference) => {
      reference.targets = reference.targets.filter((target) =>
        currentSelections.has(target),
      );
    });
    updateSendButton();
  }

  function removeComponent(element: Element) {
    element.classList.remove("pointback-selected", "pointback-highlight");
    selectedElements.delete(element);
    renderSelectedHighlights();
    removeHighlight();
    updateSelectionHeader();
    input.contentEditable = "plaintext-only";
    updateSendButton();
    refreshEmptyState();
  }

  function renderEmptyState() {
    slots.clear(messages);
    slots.append(
      messages,
      <EmptyConversation selectedCount={selectedElements.size} />,
    );
  }

  function refreshEmptyState() {
    if (messages.querySelector(".pb-empty-state")) renderEmptyState();
  }

  function setTheme(isDark: boolean) {
    panel.classList.toggle("pb-dark", isDark);
    themeToggle.setAttribute("aria-checked", String(isDark));
  }

  function applySystemTheme() {
    setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches);
  }

  function openEmptyPanel() {
    applySystemTheme();
    stopSelecting();
    clearSelection();
    updateSelectionHeader();
    if (!messages.children.length) renderEmptyState();
    panel.hidden = false;
    input.contentEditable = isSending ? "false" : "plaintext-only";
    updateSendButton();
  }

  function openPanel(resetMessages: boolean) {
    if (selectedElements.size === 0) return;
    updateSelectionHeader();
    if (resetMessages && !threadId && !isSending) renderEmptyState();
    else refreshEmptyState();
    panel.hidden = false;
    input.contentEditable = "plaintext-only";
    input.focus();
  }

  function stopSelecting() {
    isSelecting = false;
    isAddModeActive = false;
    selectComponentsButton.setAttribute("aria-pressed", "false");
    lassoStart = null;
    replacementElement = null;
    linkReferenceId = null;
    hideReplacementHighlight();
    hideDeicticTargetHighlights();
    lasso.hidden = true;
    removeHighlight();
    hint.hidden = true;
    hint.classList.remove("pb-cursor-hint");
    cancelButton.hidden = false;
    document.documentElement.classList.remove(
      "pointback-selecting",
      "pointback-link-singular",
    );
    updateSelectionHeader();
  }

  function startSelecting(
    mode: SelectionMode = "initial",
    replacement: Element | null = null,
    linkReference: string | null = null,
  ) {
    selectionMode = mode;
    replacementElement = replacement;
    linkReferenceId = linkReference;
    if (mode === "initial") {
      panel.hidden = true;
      clearSelection();
    }
    stopSelecting();
    selectionMode = mode;
    replacementElement = replacement;
    linkReferenceId = linkReference;
    isAddModeActive = mode === "add";
    selectComponentsButton.setAttribute(
      "aria-pressed",
      String(isAddModeActive),
    );
    updateSelectionHeader();
    const isLinkSelection = mode === "link";
    const linkedReference = deicticReferences.find(
      (reference) => reference.id === linkReferenceId,
    );
    const isSingularLink =
      isLinkSelection && !!linkedReference && !isPluralDeictic(linkedReference);
    hint.classList.toggle("pb-cursor-hint", isLinkSelection);
    cancelButton.hidden = isLinkSelection;
    selectionInstruction.textContent =
      mode === "add"
        ? "Click a component, or drag to add multiple components."
        : mode === "replace"
          ? "Click a component to replace the selected tag."
          : mode === "link"
            ? "Point to Component"
            : "Click a component, or drag to select multiple.";
    isSelecting = true;
    hint.hidden = false;
    document.documentElement.classList.add("pointback-selecting");
    document.documentElement.classList.toggle(
      "pointback-link-singular",
      isSingularLink,
    );
  }

  function cancelSelection() {
    if (selectionMode === "initial") clearSelection();
    stopSelecting();
  }

  function appendMessage(message: StructuredMessage, createdAt?: string) {
    const content: ReactNode[] = [];
    let cursor = 0;
    for (const reference of [...message.references].sort(
      (left, right) => left.start - right.start,
    )) {
      content.push(message.content.slice(cursor, reference.start));
      content.push(
        <ReferenceToken
          key={reference.id}
          linked
          term={message.content.slice(reference.start, reference.end)}
          onPointerEnter={() => showDeicticTargetHighlights(reference.targets)}
          onPointerLeave={hideDeicticTargetHighlights}
        />,
      );
      cursor = reference.end;
    }
    content.push(message.content.slice(cursor));
    const time = new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(createdAt ? new Date(createdAt) : new Date());
    let metadata!: HTMLDivElement;
    if (messages.querySelector(".pb-empty-state")) slots.clear(messages);
    slots.append(
      messages,
      <MessageBubble
        messageRole="user"
        metadataRef={(node) => {
          if (node) metadata = node;
        }}
        metadata={`You · ${time}${message.references.length ? ` · ${message.references.length} reference${message.references.length === 1 ? "" : "s"}` : ""}`}
      >
        {content}
      </MessageBubble>,
    );
    messages.scrollTop = messages.scrollHeight;
    return metadata;
  }

  function appendAssistant() {
    let body!: HTMLParagraphElement;
    let status!: HTMLDivElement;
    slots.append(
      messages,
      <MessageBubble
        messageRole="assistant"
        metadata="Assistant · Waiting for bridge…"
        bodyRef={(node) => {
          if (node) body = node;
        }}
        metadataRef={(node) => {
          if (node) status = node;
        }}
      />,
    );
    // These streaming refs are explicitly controller-owned and never reconciled.
    return { body, status };
  }

  function openSavedThread(thread: ThreadDetail) {
    stopSelecting();
    clearSelection();
    threadId = thread.id;
    savedComponents =
      thread.messages.find((message) => message.role === "user")?.context
        .selectedComponents ?? [];
    deicticReferences = [];
    activeDeicticReferenceId = null;
    input.replaceChildren();
    hideDeicticTooltip();
    updateSelectionHeader();
    componentName.textContent = thread.title;
    slots.clear(messages);
    for (const message of thread.messages) {
      if (message.role === "user") {
        // Saved references remain evidence, not live DOM identities after reload.
        appendMessage(
          { content: message.content, references: [] },
          message.createdAt,
        );
      } else {
        const assistant = appendAssistant();
        assistant.body.textContent = message.content;
        assistant.status.textContent =
          message.error ||
          (message.status === "running"
            ? "Response is active in another tab. Reopen history to refresh."
            : "Assistant");
      }
    }
    updateSendButton();
  }

  function updateLasso(x: number, y: number) {
    if (!lassoStart) return;
    const left = Math.min(lassoStart.x, x);
    const top = Math.min(lassoStart.y, y);
    lasso.style.left = `${left}px`;
    lasso.style.top = `${top}px`;
    lasso.style.width = `${Math.abs(x - lassoStart.x)}px`;
    lasso.style.height = `${Math.abs(y - lassoStart.y)}px`;
  }

  function getLassoedComponents(x: number, y: number): Element[] {
    if (!lassoStart) return [];
    const left = Math.min(lassoStart.x, x);
    const right = Math.max(lassoStart.x, x);
    const top = Math.min(lassoStart.y, y);
    const bottom = Math.max(lassoStart.y, y);
    const candidates = document.querySelectorAll(
      "[data-component-name], [aria-label], button, input, textarea, select, a, article, section, main, nav, header, footer, form, li, h1, h2, h3, h4, h5, h6",
    );

    return [...candidates].filter((element) => {
      if (isPointBackUi(element)) return false;
      const rect = element.getBoundingClientRect();
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        rect.left < right &&
        rect.right > left &&
        rect.top < bottom &&
        rect.bottom > top
      );
    });
  }

  function replaceSelection(replacement: Element) {
    if (!replacementElement) return;
    replacementElement.classList.remove("pointback-selected");
    selectedElements.delete(replacementElement);
    addToSelection(replacement);
  }

  panelHeader.addEventListener("pointerdown", (event) => {
    if (
      event.button !== 0 ||
      (event.target instanceof Element && event.target.closest("button"))
    )
      return;

    const rect = panel.getBoundingClientRect();
    panelDrag = {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    panelHeader.setPointerCapture(event.pointerId);
    panel.classList.add("pb-panel-dragging");
  });

  panelHeader.addEventListener("pointermove", (event) => {
    if (!panelDrag) return;

    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    const left = Math.min(
      Math.max(0, event.clientX - panelDrag.offsetX),
      window.innerWidth - width,
    );
    const top = Math.min(
      Math.max(0, event.clientY - panelDrag.offsetY),
      window.innerHeight - height,
    );
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  });

  function stopPanelDrag() {
    panelDrag = null;
    panel.classList.remove("pb-panel-dragging");
  }

  panelHeader.addEventListener("pointerup", stopPanelDrag);
  panelHeader.addEventListener("pointercancel", stopPanelDrag);

  const settings = createSettingsController({
    composer: form,
    messages,
    settingsButton,
    settingsPane,
    settingsForm,
    closeButton: settingsCloseButton,
    cancelButton: settingsCancelButton,
    bridgeAddressInput,
    bridgeTokenInput,
  });

  const history = createHistoryController(
    slots,
    {
      composer: form,
      messages,
      historyButton,
      historyPane,
      closeButton: historyCloseButton,
      newChatButtons,
    },
    {
      isBusy: () => isSending,
      onOpenThread: openSavedThread,
      onNewChat: () => {
        threadId = undefined;
        savedComponents = [];
        stopSelecting();
        clearSelection();
        updateSelectionHeader();
        deicticReferences = [];
        activeDeicticReferenceId = null;
        input.replaceChildren();
        hideDeicticTooltip();
        renderEmptyState();
        updateSendButton();
        input.focus();
      },
    },
  );

  cancelButton.addEventListener("click", cancelSelection);
  selectComponentsButton.addEventListener("click", () => {
    if (isSelecting && selectionMode === "add") {
      stopSelecting();
    } else {
      startSelecting("add");
    }
  });
  themeToggle.addEventListener("click", () => {
    setTheme(!panel.classList.contains("pb-dark"));
  });
  closeButton.addEventListener("click", () => {
    stopSelecting();
    settings.close();
    history.close();
    panel.hidden = true;
    clearSelection();
  });

  deicticToggle.addEventListener("click", () => {
    settings.close();
    deicticMode = !deicticMode;
    deicticToggle.setAttribute("aria-pressed", String(deicticMode));
    if (deicticMode) {
      input.focus();
      decorateDeicticReferences();
    } else {
      if (isSelecting && selectionMode === "link") stopSelecting();
      deicticReferences = [];
      input.textContent = getDraft();
      hideDeicticTooltip();
    }
    updateSendButton();
  });

  input.addEventListener("input", (event) => {
    if (event instanceof InputEvent && event.isComposing) return;
    decorateDeicticReferences();
    updateSendButton();
  });
  input.addEventListener("compositionend", () => {
    decorateDeicticReferences();
    updateSendButton();
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const draft = getDraft();
    const content = draft.trim();
    const leadingWhitespaceLength = draft.length - draft.trimStart().length;
    if (!content || isSending) return;

    const message: StructuredMessage = {
      content,
      references: deicticMode
        ? deicticReferences
            .filter((reference) => reference.targets.length > 0)
            .map((reference) => ({
              id: reference.id,
              term: reference.term,
              start: reference.start - leadingWhitespaceLength,
              end: reference.end - leadingWhitespaceLength,
              components: reference.targets.map(createComponentFootprint),
              targets: reference.targets,
            }))
        : [],
    };
    const metadata = appendMessage(message);
    const assistant = appendAssistant();
    const components = selectedElements.size
      ? [...selectedElements].map(createComponentFootprint)
      : savedComponents;
    let accepted = false;
    isSending = true;
    stopSelecting();
    input.contentEditable = "false";
    updateSendButton();
    const finish = () => {
      isSending = false;
      cancelResponse = undefined;
      input.contentEditable = "plaintext-only";
      updateSendButton();
    };
    try {
      const stream = sendMessageToAgentBridge(
        {
          requestId: crypto.randomUUID(),
          ...(threadId ? { threadId } : {}),
          message: {
            content: message.content,
            references: message.references.map(
              ({ targets: _targets, ...reference }) => reference,
            ),
          },
          context: { selectedComponents: components },
        },
        (event) => {
          if (disposed) return;
          if (event.type === "accepted") {
            accepted = true;
            threadId = event.threadId;
            savedComponents = components;
            deicticReferences = [];
            input.replaceChildren();
            hideDeicticTooltip();
            activeDeicticReferenceId = null;
          }
          if (event.type === "status")
            assistant.status.textContent = event.message;
          if (event.type === "assistant")
            assistant.body.textContent = event.content;
          if (event.type === "completed") {
            assistant.status.textContent = "Assistant";
            finish();
          }
          if (event.type === "failed") {
            assistant.status.textContent = event.message;
            if (!accepted)
              metadata.textContent +=
                " · Delivery unconfirmed — draft retained";
            finish();
          }
          messages.scrollTop = messages.scrollHeight;
        },
      );
      cancelResponse = stream.cancel;
    } catch (error) {
      assistant.status.textContent =
        error instanceof Error ? error.message : "Could not connect to bridge.";
      metadata.textContent += " · Not sent";
      finish();
    }
  });

  listenDocument(
    "pointerdown",
    (event) => {
      if (
        !isSelecting ||
        !(event.target instanceof Element) ||
        isPointBackUi(event.target)
      )
        return;
      lassoStart = { x: event.clientX, y: event.clientY };
      lasso.hidden = false;
      updateLasso(event.clientX, event.clientY);
    },
    true,
  );

  listenDocument(
    "pointermove",
    (event) => {
      if (
        !isSelecting ||
        !(event.target instanceof Element) ||
        isPointBackUi(event.target)
      )
        return;
      if (selectionMode === "link") {
        hint.style.left = `${event.clientX + 14}px`;
        hint.style.top = `${event.clientY + 14}px`;
      }
      if (lassoStart) updateLasso(event.clientX, event.clientY);
      if (highlightedElement === event.target) return;
      removeHighlight();
      highlightedElement = event.target;
      highlightedElement.classList.add("pointback-highlight");
    },
    true,
  );

  listenDocument(
    "pointerup",
    (event) => {
      if (
        !isSelecting ||
        !(event.target instanceof Element) ||
        isPointBackUi(event.target) ||
        !lassoStart
      )
        return;
      const moved =
        Math.hypot(event.clientX - lassoStart.x, event.clientY - lassoStart.y) >
        6;
      event.preventDefault();
      event.stopPropagation();
      suppressNextClick = true;

      const mode = selectionMode;
      const linkReference =
        mode === "link"
          ? deicticReferences.find(
              (reference) => reference.id === linkReferenceId,
            )
          : undefined;
      const pickedComponents = moved
        ? getLassoedComponents(event.clientX, event.clientY)
        : [event.target];

      if (mode === "link" && linkReference) {
        const componentsToLink = isPluralDeictic(linkReference)
          ? pickedComponents
          : pickedComponents.slice(0, 1);
        for (const component of componentsToLink)
          linkComponentToReference(linkReference, component);
      } else if (mode === "replace") {
        if (pickedComponents[0]) replaceSelection(pickedComponents[0]);
      } else {
        if (mode === "initial") clearSelection();
        for (const component of pickedComponents) addToSelection(component);
      }

      const keepSelecting =
        mode === "add" ||
        (mode === "link" && !!linkReference && isPluralDeictic(linkReference));
      if (keepSelecting) {
        lassoStart = null;
        lasso.hidden = true;
        removeHighlight();
      } else {
        stopSelecting();
      }
      if (selectedElements.size > 0) openPanel(mode === "initial");
    },
    true,
  );

  listenDocument(
    "click",
    (event) => {
      if (!suppressNextClick) return;
      suppressNextClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true,
  );

  listenWindow(
    "scroll",
    () => {
      renderSelectedHighlights();
      refreshDeicticTargetHighlights();
      if (replacementElement) showReplacementHighlight(replacementElement);
      if (inspectedComponent)
        positionComponentDetails(inspectedComponent.anchor);
    },
    true,
  );
  listenWindow("resize", () => {
    renderSelectedHighlights();
    refreshDeicticTargetHighlights();
    if (replacementElement) showReplacementHighlight(replacementElement);
    if (inspectedComponent) positionComponentDetails(inspectedComponent.anchor);
  });

  listenWindow(
    "keydown",
    (event) => {
      if (event.key === "Control" || event.key === "Meta") {
        isInspectModifierHeld = true;
        if (hoveredComponent) {
          showComponentDetails(
            hoveredComponent.element,
            hoveredComponent.anchor,
          );
        } else {
          const activeElement = shadow.activeElement;
          const focusedChip =
            activeElement instanceof HTMLElement &&
            activeElement.classList.contains("pb-component-chip")
              ? activeElement
              : null;
          const component = focusedChip
            ? componentByChip.get(focusedChip)
            : undefined;
          if (component && focusedChip) {
            showComponentDetails(component, focusedChip);
          } else if (selectedElements.size === 1) {
            const chip =
              componentList.querySelector<HTMLElement>(".pb-component-chip");
            const selectedComponent = chip
              ? componentByChip.get(chip)
              : undefined;
            if (chip && selectedComponent)
              showComponentDetails(selectedComponent, chip);
          }
        }
      }
      if (event.key === "Escape" && isSelecting) cancelSelection();
    },
    true,
  );

  listenWindow(
    "keyup",
    (event) => {
      if (event.key !== "Control" && event.key !== "Meta") return;
      isInspectModifierHeld = false;
      hideComponentDetails();
    },
    true,
  );

  listenDocument(
    "pointermove",
    (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      const target = event.composedPath()[0];
      const chip =
        target instanceof Element
          ? target.closest<HTMLElement>(".pb-component-chip")
          : null;
      const component = chip ? componentByChip.get(chip) : undefined;
      if (chip && component) showComponentDetails(component, chip);
    },
    true,
  );

  listenWindow("blur", () => {
    isInspectModifierHeld = false;
    hideComponentDetails();
  });

  const onMessage = (message: PointBackMessage) => {
    if (message.type === "pointback:open-panel") openEmptyPanel();
    if (message.type === "pointback:start-selection") startSelecting();
  };
  browser.runtime.onMessage.addListener(onMessage);
  return () => {
    disposed = true;
    lifetime.abort();
    messageScrollbarCleanup();
    inputScrollbarCleanup();
    browser.runtime.onMessage.removeListener(onMessage);
    history.dispose();
    cancelResponse?.();
    removeHighlight();
    for (const element of selectedElements)
      element.classList.remove("pointback-selected");
    document.documentElement.classList.remove(
      "pointback-selecting",
      "pointback-link-singular",
    );
  };
}
