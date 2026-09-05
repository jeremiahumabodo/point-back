import "../assets/content.css";
import { sendMessageToAgentBridge } from "../agent-bridge/message-client";
import { resolveComponent } from "../component-resolution/resolve-component";
import type { ComponentFootprint } from "../component-resolution/types";
import { createHistoryController } from "../history/history-controller";
import { createSettingsController } from "../settings/settings-controller";

type PointBackMessage = { type: "pointback:start-selection" | "pointback:open-panel" };
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
  references: Array<Omit<DeicticReference, "targets"> & {
    components: ComponentFootprint[];
    targets: Element[];
  }>;
};

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    const root = document.createElement("div");
    root.id = "pointback-root";
    root.innerHTML = `
      <div class="pb-selection-hint" hidden>
        <span class="pb-selection-instruction">Click a component, or drag to select multiple.</span>
        <button class="pb-cancel-selection" type="button" title="Cancel selection">Cancel</button>
      </div>
      <div class="pb-lasso" hidden></div>
      <div class="pb-selected-highlights"></div>
      <div class="pb-replacement-highlight" hidden></div>
      <div class="pb-deictic-target-highlights"></div>
      <div class="pb-deictic-tooltip" role="tooltip" hidden></div>
      <aside class="pb-panel" aria-label="PointBack conversation" hidden>
        <header class="pb-header">
          <div>
            <h2 class="pb-component-name"></h2>
            <div class="pb-component-list" aria-label="Selected components"></div>
          </div>
          <div class="pb-header-actions">
            <button class="pb-select-components" type="button" aria-label="Add components" aria-pressed="false" title="Add components">
              <svg aria-hidden="true" viewBox="0 0 16 16">
                <rect x="2" y="2" width="12" height="12" rx="1"></rect>
                <path d="m7 6 3 3-1.5.25L8 11z"></path>
              </svg>
              <span class="pb-add-indicator" aria-hidden="true">+</span>
            </button>
            <button class="pb-settings" type="button" aria-label="Conversation settings" aria-expanded="false" aria-controls="pb-settings-pane" title="Conversation settings">
              <svg aria-hidden="true" viewBox="0 0 16 16">
                <path d="M6.7 1.2h2.6l.4 1.6c.4.2.8.4 1.1.7l1.6-.5 1.3 2.3-1.2 1.1c.1.4.1.8 0 1.3l1.2 1.1-1.3 2.3-1.6-.5c-.3.3-.7.5-1.1.7l-.4 1.6H6.7l-.4-1.6c-.4-.2-.8-.4-1.1-.7l-1.6.5-1.3-2.3 1.2-1.1a4.5 4.5 0 0 1 0-1.3L2.3 5.3 3.6 3l1.6.5c.3-.3.7-.5 1.1-.7l.4-1.6Z"></path>
                <circle cx="8" cy="7" r="2"></circle>
              </svg>
            </button>
            <button class="pb-theme-toggle" type="button" role="switch" aria-label="Dark mode" aria-checked="false" title="Toggle dark mode">
              <svg class="pb-theme-toggle-moon" aria-hidden="true" viewBox="0 0 16 16">
                <path d="M10.8 2.2a5.6 5.6 0 1 0 3 10.1A5.8 5.8 0 0 1 10.8 2.2Z"></path>
              </svg>
              <svg class="pb-theme-toggle-sun" aria-hidden="true" viewBox="0 0 16 16">
                <circle cx="8" cy="8" r="2.5"></circle>
                <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M12.6 3.4l-1 1M4.4 11.6l-1 1"></path>
              </svg>
              <span class="pb-theme-toggle-thumb" aria-hidden="true"></span>
            </button>
            <button class="pb-close" type="button" aria-label="Close conversation" title="Close conversation">
              <svg aria-hidden="true" viewBox="0 0 16 16">
                <path d="m4 4 8 8M12 4l-8 8"></path>
              </svg>
            </button>
          </div>
        </header>
        <div class="pb-messages" aria-live="polite"></div>
        <section id="pb-settings-pane" class="pb-settings-pane" aria-labelledby="pb-settings-title" hidden>
          <div class="pb-settings-pane-header">
            <button class="pb-settings-close" type="button" aria-label="Back to conversation" title="Back to conversation">
              <svg class="pb-direction-arrow" aria-hidden="true" viewBox="0 0 16 16"><path d="M8 13V3M4.5 6.5 8 3l3.5 3.5"></path></svg>
            </button>
            <h3 id="pb-settings-title">Connection Settings</h3>
          </div>
          <form class="pb-settings-form">
            <label class="pb-settings-field">
              <span>Agent bridge address</span>
              <input class="pb-agent-bridge-address" type="url" inputmode="url" placeholder="http://127.0.0.1:3000" autocomplete="off" required>
            </label>
            <label class="pb-settings-field">
              <span>Project directory</span>
              <input class="pb-project-directory" type="text" placeholder="C:\\path\\to\\project" autocomplete="off" required>
            </label>
            <button class="pb-deictic-toggle pb-deictic-settings-toggle" type="button" aria-pressed="true" aria-label="Toggle component references" title="Toggle component references">
              <span>Reference UI components</span>
              <svg aria-hidden="true" viewBox="0 0 16 16">
                <path d="m6.4 9.6 3.2-3.2M5.1 11.9l-1 1a2.5 2.5 0 0 1-3.5-3.5l3-3a2.5 2.5 0 0 1 3.5 0M10.9 4.1l1-1a2.5 2.5 0 0 1 3.5 3.5l-3 3a2.5 2.5 0 0 1-3.5 0"></path>
              </svg>
            </button>
            <div class="pb-settings-actions">
              <button class="pb-settings-cancel" type="button">Cancel</button>
              <button class="pb-settings-save" type="submit">Save</button>
            </div>
          </form>
        </section>
        <section id="pb-history-pane" class="pb-history-pane" aria-labelledby="pb-history-title" hidden>
          <div class="pb-settings-pane-header">
            <button class="pb-history-close" type="button" aria-label="Back to conversation" title="Back to conversation">
              <svg class="pb-direction-arrow" aria-hidden="true" viewBox="0 0 16 16"><path d="M8 13V3M4.5 6.5 8 3l3.5 3.5"></path></svg>
            </button>
            <h3 id="pb-history-title">Chat History</h3>
          </div>
          <div class="pb-history-list">
            <p>No saved chats yet.</p>
          </div>
        </section>
        <form class="pb-composer">
          <div class="pb-composer-row">
            <button class="pb-history" type="button" aria-label="Chat history" aria-expanded="false" aria-controls="pb-history-pane" title="Chat history">
              <svg aria-hidden="true" viewBox="0 0 16 16">
                <path d="M2.5 3.5v3h3"></path>
                <path d="M3 7a5.5 5.5 0 1 0 1.1-3.3L2.5 5"></path>
                <path d="M8 4.5V8l2.5 1.5"></path>
              </svg>
            </button>
            <div class="pb-input" contenteditable="plaintext-only" role="textbox" aria-multiline="true" aria-label="Message" data-placeholder="Type your message here..."></div>
            <button class="pb-new-chat pb-composer-new-chat" type="button" aria-label="New chat" title="New chat">
              <svg aria-hidden="true" viewBox="0 0 16 16">
                <path d="m10.8 2.2 3 3-7.6 7.6-3.8.8.8-3.8 7.6-7.6ZM9.2 3.8l3 3M2.5 2.5v3M1 4h3"></path>
              </svg>
            </button>
            <button class="pb-send" type="submit" aria-label="Send message" title="Send message" disabled>
              <svg class="pb-direction-arrow" aria-hidden="true" viewBox="0 0 16 16"><path d="M8 13V3M4.5 6.5 8 3l3.5 3.5"></path></svg>
            </button>
          </div>
        </form>
      </aside>
      <div class="pb-component-details-popover" role="tooltip" hidden></div>
    `;
    document.documentElement.append(root);

    const hint = root.querySelector<HTMLElement>(".pb-selection-hint")!;
    const selectionInstruction = root.querySelector<HTMLElement>(".pb-selection-instruction")!;
    const cancelButton = root.querySelector<HTMLButtonElement>(".pb-cancel-selection")!;
    const lasso = root.querySelector<HTMLElement>(".pb-lasso")!;
    const selectedHighlights = root.querySelector<HTMLElement>(".pb-selected-highlights")!;
    const replacementHighlight = root.querySelector<HTMLElement>(".pb-replacement-highlight")!;
    const deicticTargetHighlights = root.querySelector<HTMLElement>(".pb-deictic-target-highlights")!;
    const panel = root.querySelector<HTMLElement>(".pb-panel")!;
    const panelHeader = root.querySelector<HTMLElement>(".pb-header")!;
    const selectComponentsButton = root.querySelector<HTMLButtonElement>(".pb-select-components")!;
    const themeToggle = root.querySelector<HTMLButtonElement>(".pb-theme-toggle")!;
    const closeButton = root.querySelector<HTMLButtonElement>(".pb-close")!;
    const componentName = root.querySelector<HTMLElement>(".pb-component-name")!;
    const componentList = root.querySelector<HTMLElement>(".pb-component-list")!;
    const messages = root.querySelector<HTMLElement>(".pb-messages")!;
    const form = root.querySelector<HTMLFormElement>(".pb-composer")!;
    const settingsButton = root.querySelector<HTMLButtonElement>(".pb-settings")!;
    const settingsPane = root.querySelector<HTMLElement>(".pb-settings-pane")!;
    const settingsForm = root.querySelector<HTMLFormElement>(".pb-settings-form")!;
    const settingsCloseButton = root.querySelector<HTMLButtonElement>(".pb-settings-close")!;
    const settingsCancelButton = root.querySelector<HTMLButtonElement>(".pb-settings-cancel")!;
    const historyButton = root.querySelector<HTMLButtonElement>(".pb-history")!;
    const historyPane = root.querySelector<HTMLElement>(".pb-history-pane")!;
    const historyCloseButton = root.querySelector<HTMLButtonElement>(".pb-history-close")!;
    const newChatButtons = [...root.querySelectorAll<HTMLButtonElement>(".pb-new-chat")]!
    const bridgeAddressInput = root.querySelector<HTMLInputElement>(".pb-agent-bridge-address")!;
    const projectDirectoryInput = root.querySelector<HTMLInputElement>(".pb-project-directory")!;
    const input = root.querySelector<HTMLElement>(".pb-input")!;
    const deicticToggle = root.querySelector<HTMLButtonElement>(".pb-deictic-toggle")!;
    const deicticTooltip = root.querySelector<HTMLElement>(".pb-deictic-tooltip")!;
    const componentDetailsPopover = root.querySelector<HTMLElement>(".pb-component-details-popover")!;
    const sendButton = root.querySelector<HTMLButtonElement>(".pb-send")!;

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
    let inspectedComponent: { element: Element; anchor: HTMLElement } | null = null;
    let hoveredComponent: { element: Element; anchor: HTMLElement } | null = null;
    let isInspectModifierHeld = false;
    const deicticWords = new Set(["this", "that", "these", "those", "here"]);

    function isPointBackUi(element: Element) {
      return root.contains(element);
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
      componentDetailsPopover.replaceChildren();
    }

    function positionComponentDetails(anchor: HTMLElement) {
      const anchorRect = anchor.getBoundingClientRect();
      const margin = 8;
      const popoverRect = componentDetailsPopover.getBoundingClientRect();
      const left = Math.min(Math.max(margin, anchorRect.left), window.innerWidth - popoverRect.width - margin);
      const top = anchorRect.bottom + margin;
      const pointerLeft = Math.min(
        Math.max(12, anchorRect.left + anchorRect.width / 2 - left),
        popoverRect.width - 12,
      );

      componentDetailsPopover.style.left = `${left}px`;
      componentDetailsPopover.style.top = `${top}px`;
      componentDetailsPopover.style.setProperty("--pb-popover-pointer-left", `${pointerLeft}px`);
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
        ...(footprint.react ? [["React component", footprint.react.component.name] as [string, string]] : []),
        ...(sourceLocation ? [["source", sourceLocation] as [string, string]] : []),
        ...(footprint.react?.ancestry.length ? [["React ancestry", footprint.react.ancestry.map((component) => component.name).join(" ← ")] as [string, string]] : []),
        ...(footprint.id ? [["id", footprint.id] as [string, string]] : []),
        ...(footprint.componentName ? [["data-component-name", footprint.componentName] as [string, string]] : []),
        ...(footprint.testId ? [["data-testid", footprint.testId] as [string, string]] : []),
        ...(footprint.ariaLabel ? [["aria-label", footprint.ariaLabel] as [string, string]] : []),
        ...(footprint.role ? [["role", footprint.role] as [string, string]] : []),
        ...(footprint.textExcerpt ? [["text", footprint.textExcerpt] as [string, string]] : []),
      ];
      const title = document.createElement("strong");
      title.className = "pb-component-details-title";
      title.textContent = "Resolved attributes";
      const list = document.createElement("dl");
      list.className = "pb-component-details-list";
      list.replaceChildren(
        ...attributes.map(([name, value]) => {
          const row = document.createElement("div");
          const label = document.createElement("dt");
          label.textContent = name;
          const content = document.createElement("dd");
          content.textContent = value;
          row.append(label, content);
          return row;
        }),
      );
      componentDetailsPopover.replaceChildren(title, list);
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
      deicticTargetHighlights.replaceChildren(
        ...targets.flatMap((target) => {
          const rect = target.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return [];
          const highlight = document.createElement("div");
          highlight.className = "pb-deictic-target-highlight";
          highlight.style.left = `${rect.left}px`;
          highlight.style.top = `${rect.top}px`;
          highlight.style.width = `${rect.width}px`;
          highlight.style.height = `${rect.height}px`;
          return [highlight];
        }),
      );
    }

    function hideDeicticTargetHighlights() {
      highlightedDeicticReferenceId = null;
      deicticTargetHighlights.replaceChildren();
    }

    function refreshDeicticTargetHighlights() {
      const reference = deicticReferences.find((item) => item.id === highlightedDeicticReferenceId);
      if (reference) showDeicticTargetHighlights(reference.targets);
      else hideDeicticTargetHighlights();
    }

    function renderSelectedHighlights() {
      selectedHighlights.replaceChildren(
        ...[...selectedElements].flatMap((element) => {
          const rect = element.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return [];
          const highlight = document.createElement("div");
          highlight.className = "pb-selected-component-highlight";
          highlight.style.left = `${rect.left}px`;
          highlight.style.top = `${rect.top}px`;
          highlight.style.width = `${rect.width}px`;
          highlight.style.height = `${rect.height}px`;
          return [highlight];
        }),
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
      componentList.replaceChildren(
        ...elements.map((element) => {
          const name = getComponentName(element);
          const tagName = getComponentTagName(element);
          const tag = document.createElement("span");
          tag.className = "pb-component-tag";

          const chip = document.createElement("button");
          chip.className = "pb-component-chip";
          chip.type = "button";
          componentByChip.set(chip, element);
          chip.textContent = tagName;
          chip.setAttribute("aria-label", `Replace ${tagName}`);
          chip.setAttribute("aria-pressed", String(element === replacementElement));
          chip.title = `Replace ${tagName}. Hold Ctrl or ⌘ to inspect resolved attributes.`;
          chip.addEventListener("pointerenter", (event) => {
            hoveredComponent = { element, anchor: chip };
            removeHighlight();
            highlightedElement = element;
            element.classList.add("pointback-highlight");
            if (isInspectModifierHeld || event.ctrlKey || event.metaKey) showComponentDetails(element, chip);
          });
          chip.addEventListener("pointerleave", () => {
            if (hoveredComponent?.anchor === chip) hoveredComponent = null;
            if (inspectedComponent?.anchor === chip) hideComponentDetails();
            removeHighlight();
          });
          chip.addEventListener("focus", () => {
            if (isInspectModifierHeld) showComponentDetails(element, chip);
          });
          chip.addEventListener("blur", () => {
            if (inspectedComponent?.anchor === chip) hideComponentDetails();
          });
          chip.addEventListener("click", () => {
            startSelecting("replace", element);
            highlightedElement = element;
            element.classList.add("pointback-highlight");
            showReplacementHighlight(element);
          });
          chip.addEventListener("keydown", (event) => {
            if (event.key !== "Delete") return;
            event.preventDefault();
            removeComponent(element);
          });

          const removeButton = document.createElement("button");
          removeButton.className = "pb-remove-component";
          removeButton.type = "button";
          removeButton.textContent = "−";
          removeButton.setAttribute("aria-label", `Remove ${name}`);
          removeButton.title = `Remove ${name}`;
          removeButton.addEventListener("click", () => removeComponent(element));

          tag.append(chip, removeButton);
          return tag;
        }),
      );
      updateDeicticAvailability();
    }

    function getDraft() {
      return input.innerText.replace(/\r/g, "");
    }

    function getDeicticReferenceCandidates(text: string) {
      const references: Array<Pick<DeicticReference, "term" | "start" | "end">> = [];
      for (const match of text.matchAll(/[a-z]+/gi)) {
        const term = match[0].toLowerCase();
        const start = match.index ?? 0;
        if (deicticWords.has(term)) references.push({ term, start, end: start + match[0].length });
      }
      return references;
    }

    function getRenderedDeicticReferences() {
      return [...input.querySelectorAll<HTMLElement>(".pb-deictic-reference")].map((token) => {
        const range = document.createRange();
        range.selectNodeContents(input);
        range.setEndBefore(token);
        const before = document.createElement("div");
        before.append(range.cloneContents());
        const start = (before.textContent ?? "").replace(/\r/g, "").length;
        const term = token.dataset.term ?? "";
        return { id: token.dataset.referenceId ?? "", term, start, end: start + term.length };
      });
    }

    function syncDeicticReferences(text: string) {
      const referencesById = new Map(deicticReferences.map((reference) => [reference.id, reference]));
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
        const existing = renderedReference ? referencesById.get(renderedReference.id) : undefined;
        if (existing && renderedReference) {
          matchedReferenceIds.add(renderedReference.id);
          return { ...existing, ...candidate };
        }

        const reference = { ...candidate, id: `reference-${nextDeicticReferenceId++}`, targets: [] };
        newestReferenceId = reference.id;
        return reference;
      });

      const removedReferences = [...referencesById.values()].filter(
        (reference) => !matchedReferenceIds.has(reference.id),
      );
      if (removedReferences.length > 0) {
        const targetsStillReferenced = new Set(deicticReferences.flatMap((reference) => reference.targets));
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
      if (!deicticReferences.some((reference) => reference.id === activeDeicticReferenceId)) {
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
      const selection = window.getSelection();
      if (!selection?.rangeCount) return null;
      const range = selection.getRangeAt(0);
      if (!input.contains(range.endContainer)) return null;

      const beforeCaret = range.cloneRange();
      beforeCaret.selectNodeContents(input);
      beforeCaret.setEnd(range.endContainer, range.endOffset);
      return beforeCaret.toString().length;
    }

    function restoreCaret(offset: number, textNodes: Array<{ node: Text; start: number; end: number }>, tokens: Array<{ element: HTMLElement; reference: DeicticReference }>) {
      const range = document.createRange();
      const textNode = textNodes.find(({ start, end }) => offset >= start && offset <= end);
      if (textNode) {
        range.setStart(textNode.node, offset - textNode.start);
      } else {
        const token = tokens.find(({ reference }) => offset >= reference.start && offset <= reference.end);
        if (token && offset <= token.reference.start) range.setStartBefore(token.element);
        else if (token) range.setStartAfter(token.element);
        else range.selectNodeContents(input);
      }
      range.collapse(true);
      const selection = window.getSelection();
      input.focus({ preventScroll: true });
      selection?.removeAllRanges();
      selection?.addRange(range);
    }

    function setActiveDeicticReference(reference: DeicticReference) {
      activeDeicticReferenceId = reference.id;
      input.querySelectorAll<HTMLElement>(".pb-deictic-reference").forEach((token) => {
        token.classList.toggle("pb-deictic-reference-active", token.dataset.referenceId === reference.id);
      });
    }

    function isPluralDeictic(reference: DeicticReference) {
      return reference.term === "these" || reference.term === "those";
    }

    function linkComponentToReference(reference: DeicticReference, component: Element) {
      if (!selectedElements.has(component)) addToSelection(component);
      if (isPluralDeictic(reference)) {
        if (!reference.targets.includes(component)) reference.targets.push(component);
      } else {
        reference.targets = [component];
      }
      input.querySelector<HTMLElement>(`[data-reference-id="${reference.id}"]`)?.classList.add("pb-deictic-reference-linked");
      updateSelectionHeader();
      updateSendButton();
    }

    function decorateDeicticReferences() {
      if (!deicticMode) return;

      const caretOffset = document.activeElement === input ? getCaretOffset() : null;
      const text = getDraft();
      const newestReferenceId = syncDeicticReferences(text);
      const fragment = document.createDocumentFragment();
      const textNodes: Array<{ node: Text; start: number; end: number }> = [];
      const tokens: Array<{ element: HTMLElement; reference: DeicticReference }> = [];
      let cursor = 0;
      for (const reference of deicticReferences) {
        const before = text.slice(cursor, reference.start);
        if (before) {
          const node = document.createTextNode(before);
          textNodes.push({ node, start: cursor, end: reference.start });
          fragment.append(node);
        }
        const token = document.createElement("span");
        token.className = "pb-deictic-reference";
        token.classList.toggle("pb-deictic-reference-active", reference.id === activeDeicticReferenceId);
        token.classList.toggle("pb-deictic-reference-linked", reference.targets.length > 0);
        token.contentEditable = "false";
        token.dataset.term = reference.term;
        token.dataset.referenceId = reference.id;
        token.title = `Point to a component to link “${reference.term}”.`;
        token.textContent = text.slice(reference.start, reference.end);
        token.addEventListener("pointerover", () => {
          setActiveDeicticReference(reference);
          highlightedDeicticReferenceId = reference.id;
          showDeicticTooltip(token);
          showDeicticTargetHighlights(reference.targets);
        });
        token.addEventListener("pointerout", () => {
          hideDeicticTooltip();
          hideDeicticTargetHighlights();
          if (!replacementElement) hideReplacementHighlight();
        });
        token.addEventListener("click", () => {
          setActiveDeicticReference(reference);
          highlightedDeicticReferenceId = reference.id;
          showDeicticTargetHighlights(reference.targets);
          startSelecting("link", null, reference.id);
        });
        tokens.push({ element: token, reference });
        fragment.append(token);
        cursor = reference.end;
      }
      const after = text.slice(cursor);
      if (after) {
        const node = document.createTextNode(after);
        textNodes.push({ node, start: cursor, end: text.length });
        fragment.append(node);
      }
      input.replaceChildren(fragment);
      if (caretOffset !== null) restoreCaret(caretOffset, textNodes, tokens);
      if (newestReferenceId) startSelecting("link", null, newestReferenceId);
    }

    function updateSendButton() {
      sendButton.disabled = !getDraft().trim();
    }

    function updateDeicticAvailability() {
      const currentSelections = new Set(selectedElements);
      deicticReferences.forEach((reference) => {
        reference.targets = reference.targets.filter((target) => currentSelections.has(target));
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
      messages.replaceChildren();
      const state = document.createElement("div");
      state.className = "pb-empty-state";

      const title = document.createElement("p");
      title.className = "pb-empty-title";
      title.textContent =
        selectedElements.size === 0
          ? "Start a conversation about this page"
          : selectedElements.size === 1
            ? "Start a conversation about this component"
            : "Start a conversation about these components";

      const description = document.createElement("p");
      description.className = "pb-empty-description";
      description.textContent =
        selectedElements.size === 0
          ? "Type a message and point to components as you refer to them."
          : "Ask about their behavior, styling, or implementation.";

      state.append(title, description);
      messages.append(state);
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
      renderEmptyState();
      panel.hidden = false;
      input.contentEditable = "plaintext-only";
      updateSendButton();
    }

    function openPanel(resetMessages: boolean) {
      if (selectedElements.size === 0) return;
      updateSelectionHeader();
      if (resetMessages) renderEmptyState();
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
      document.documentElement.classList.remove("pointback-selecting", "pointback-link-singular");
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
      selectComponentsButton.setAttribute("aria-pressed", String(isAddModeActive));
      updateSelectionHeader();
      const isLinkSelection = mode === "link";
      const linkedReference = deicticReferences.find((reference) => reference.id === linkReferenceId);
      const isSingularLink = isLinkSelection && !!linkedReference && !isPluralDeictic(linkedReference);
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
      document.documentElement.classList.toggle("pointback-link-singular", isSingularLink);
    }

    function cancelSelection() {
      if (selectionMode === "initial") clearSelection();
      stopSelecting();
    }

    function appendMessage(message: StructuredMessage) {
      const bubble = document.createElement("article");
      bubble.className = "pb-message pb-user";

      const body = document.createElement("p");
      body.className = "pb-message-content";
      let cursor = 0;
      for (const reference of [...message.references].sort((left, right) => left.start - right.start)) {
        body.append(message.content.slice(cursor, reference.start));

        const token = document.createElement("span");
        token.className = "pb-deictic-reference pb-deictic-reference-linked";
        token.textContent = message.content.slice(reference.start, reference.end);
        token.title = "Hover to highlight linked component(s)";
        token.addEventListener("pointerenter", () => showDeicticTargetHighlights(reference.targets));
        token.addEventListener("pointerleave", hideDeicticTargetHighlights);
        body.append(token);
        cursor = reference.end;
      }
      body.append(message.content.slice(cursor));

      const metadata = document.createElement("div");
      metadata.className = "pb-message-metadata";
      const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date());
      metadata.textContent = `You · ${time}${message.references.length ? ` · ${message.references.length} reference${message.references.length === 1 ? "" : "s"}` : ""}`;

      bubble.append(body, metadata);
      messages.querySelector(".pb-empty-state")?.remove();
      messages.append(bubble);
      messages.scrollTop = messages.scrollHeight;
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
        return rect.width > 0 && rect.height > 0 && rect.left < right && rect.right > left && rect.top < bottom && rect.bottom > top;
      });
    }

    function replaceSelection(replacement: Element) {
      if (!replacementElement) return;
      replacementElement.classList.remove("pointback-selected");
      selectedElements.delete(replacementElement);
      addToSelection(replacement);
    }

    panelHeader.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || event.target instanceof Element && event.target.closest("button")) return;

      const rect = panel.getBoundingClientRect();
      panelDrag = { offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top };
      panelHeader.setPointerCapture(event.pointerId);
      panel.classList.add("pb-panel-dragging");
    });

    panelHeader.addEventListener("pointermove", (event) => {
      if (!panelDrag) return;

      const width = panel.offsetWidth;
      const height = panel.offsetHeight;
      const left = Math.min(Math.max(0, event.clientX - panelDrag.offsetX), window.innerWidth - width);
      const top = Math.min(Math.max(0, event.clientY - panelDrag.offsetY), window.innerHeight - height);
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
      projectDirectoryInput,
    });

    const history = createHistoryController(
      {
        composer: form,
        messages,
        historyButton,
        historyPane,
        closeButton: historyCloseButton,
        newChatButtons,
      },
      {
        onNewChat: () => {
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

    input.addEventListener("input", () => {
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
      if (!content) return;

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
      appendMessage(message);
      void sendMessageToAgentBridge({
        message: {
          content: message.content,
          references: message.references.map(({ targets: _targets, ...reference }) => reference),
        },
        context: {
          selectedComponents: [...selectedElements].map(createComponentFootprint),
        },
      });
      stopSelecting();
      deicticReferences = [];
      input.replaceChildren();
      hideDeicticTooltip();
      activeDeicticReferenceId = null;
      updateSendButton();
    });

    document.addEventListener(
      "pointerdown",
      (event) => {
        if (!isSelecting || !(event.target instanceof Element) || isPointBackUi(event.target)) return;
        lassoStart = { x: event.clientX, y: event.clientY };
        lasso.hidden = false;
        updateLasso(event.clientX, event.clientY);
      },
      true,
    );

    document.addEventListener(
      "pointermove",
      (event) => {
        if (!isSelecting || !(event.target instanceof Element) || isPointBackUi(event.target)) return;
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

    document.addEventListener(
      "pointerup",
      (event) => {
        if (!isSelecting || !(event.target instanceof Element) || isPointBackUi(event.target) || !lassoStart) return;
        const moved = Math.hypot(event.clientX - lassoStart.x, event.clientY - lassoStart.y) > 6;
        event.preventDefault();
        event.stopPropagation();
        suppressNextClick = true;

        const mode = selectionMode;
        const linkReference = mode === "link"
          ? deicticReferences.find((reference) => reference.id === linkReferenceId)
          : undefined;
        const pickedComponents = moved ? getLassoedComponents(event.clientX, event.clientY) : [event.target];

        if (mode === "link" && linkReference) {
          const componentsToLink = isPluralDeictic(linkReference) ? pickedComponents : pickedComponents.slice(0, 1);
          for (const component of componentsToLink) linkComponentToReference(linkReference, component);
        } else if (mode === "replace") {
          if (pickedComponents[0]) replaceSelection(pickedComponents[0]);
        } else {
          if (mode === "initial") clearSelection();
          for (const component of pickedComponents) addToSelection(component);
        }

        const keepSelecting = mode === "add" || (mode === "link" && !!linkReference && isPluralDeictic(linkReference));
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

    document.addEventListener(
      "click",
      (event) => {
        if (!suppressNextClick) return;
        suppressNextClick = false;
        event.preventDefault();
        event.stopImmediatePropagation();
      },
      true,
    );

    window.addEventListener("scroll", () => {
      renderSelectedHighlights();
      refreshDeicticTargetHighlights();
      if (replacementElement) showReplacementHighlight(replacementElement);
      if (inspectedComponent) positionComponentDetails(inspectedComponent.anchor);
    }, true);
    window.addEventListener("resize", () => {
      renderSelectedHighlights();
      refreshDeicticTargetHighlights();
      if (replacementElement) showReplacementHighlight(replacementElement);
      if (inspectedComponent) positionComponentDetails(inspectedComponent.anchor);
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Control" || event.key === "Meta") {
        isInspectModifierHeld = true;
        if (hoveredComponent) {
          showComponentDetails(hoveredComponent.element, hoveredComponent.anchor);
        } else {
          const activeElement = document.activeElement;
          const focusedChip = activeElement instanceof HTMLElement && activeElement.classList.contains("pb-component-chip")
            ? activeElement
            : null;
          const component = focusedChip ? componentByChip.get(focusedChip) : undefined;
          if (component && focusedChip) {
            showComponentDetails(component, focusedChip);
          } else if (selectedElements.size === 1) {
            const chip = componentList.querySelector<HTMLElement>(".pb-component-chip");
            const selectedComponent = chip ? componentByChip.get(chip) : undefined;
            if (chip && selectedComponent) showComponentDetails(selectedComponent, chip);
          }
        }
      }
      if (event.key === "Escape" && isSelecting) cancelSelection();
    }, true);

    window.addEventListener("keyup", (event) => {
      if (event.key !== "Control" && event.key !== "Meta") return;
      isInspectModifierHeld = false;
      hideComponentDetails();
    }, true);

    document.addEventListener(
      "pointermove",
      (event) => {
        if (!event.ctrlKey && !event.metaKey) return;
        const chip = event.target instanceof Element
          ? event.target.closest<HTMLElement>(".pb-component-chip")
          : null;
        const component = chip ? componentByChip.get(chip) : undefined;
        if (chip && component) showComponentDetails(component, chip);
      },
      true,
    );

    window.addEventListener("blur", () => {
      isInspectModifierHeld = false;
      hideComponentDetails();
    });

    browser.runtime.onMessage.addListener((message: PointBackMessage) => {
      if (message.type === "pointback:open-panel") openEmptyPanel();
      if (message.type === "pointback:start-selection") startSelecting();
    });
  },
});
