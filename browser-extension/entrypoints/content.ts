import "../assets/content.css";

type PointBackMessage = { type: "pointback:start-selection" };
type SelectionMode = "initial" | "add" | "replace";

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
            <button class="pb-theme-toggle" type="button" role="switch" aria-label="Dark mode" aria-checked="false" title="Toggle dark mode">
              <span class="pb-theme-toggle-thumb" aria-hidden="true"></span>
            </button>
            <button class="pb-close" type="button" aria-label="Close conversation" title="Close conversation">×</button>
          </div>
        </header>
        <div class="pb-messages" aria-live="polite"></div>
        <form class="pb-composer">
          <textarea class="pb-input" rows="1" placeholder="Ask about these components..." aria-label="Message" disabled></textarea>
          <button class="pb-send" type="submit" aria-label="Send message" title="Send message" disabled>↑</button>
        </form>
      </aside>
    `;
    document.documentElement.append(root);

    const hint = root.querySelector<HTMLElement>(".pb-selection-hint")!;
    const selectionInstruction = root.querySelector<HTMLElement>(".pb-selection-instruction")!;
    const cancelButton = root.querySelector<HTMLButtonElement>(".pb-cancel-selection")!;
    const lasso = root.querySelector<HTMLElement>(".pb-lasso")!;
    const selectedHighlights = root.querySelector<HTMLElement>(".pb-selected-highlights")!;
    const replacementHighlight = root.querySelector<HTMLElement>(".pb-replacement-highlight")!;
    const panel = root.querySelector<HTMLElement>(".pb-panel")!;
    const panelHeader = root.querySelector<HTMLElement>(".pb-header")!;
    const selectComponentsButton = root.querySelector<HTMLButtonElement>(".pb-select-components")!;
    const themeToggle = root.querySelector<HTMLButtonElement>(".pb-theme-toggle")!;
    const closeButton = root.querySelector<HTMLButtonElement>(".pb-close")!;
    const componentName = root.querySelector<HTMLElement>(".pb-component-name")!;
    const componentList = root.querySelector<HTMLElement>(".pb-component-list")!;
    const messages = root.querySelector<HTMLElement>(".pb-messages")!;
    const form = root.querySelector<HTMLFormElement>(".pb-composer")!;
    const input = root.querySelector<HTMLTextAreaElement>(".pb-input")!;
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

    function isPointBackUi(element: Element) {
      return root.contains(element);
    }

    function getComponentName(element: Element): string {
      return (
        element.getAttribute("data-component-name") ||
        element.getAttribute("aria-label") ||
        element.id ||
        element.tagName.toLowerCase()
      );
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
      const elements = [...selectedElements];
      componentName.textContent = `${elements.length} component${elements.length === 1 ? "" : "s"} selected`;
      componentList.replaceChildren(
        ...elements.map((element) => {
          const name = getComponentName(element);
          const tag = document.createElement("span");
          tag.className = "pb-component-tag";

          const chip = document.createElement("button");
          chip.className = "pb-component-chip";
          chip.type = "button";
          chip.textContent = name;
          chip.setAttribute("aria-label", `Replace ${name}`);
          chip.setAttribute("aria-pressed", String(element === replacementElement));
          chip.title = `Replace ${name}`;
          chip.addEventListener("pointerenter", () => {
            removeHighlight();
            highlightedElement = element;
            element.classList.add("pointback-highlight");
          });
          chip.addEventListener("pointerleave", removeHighlight);
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
    }

    function removeComponent(element: Element) {
      element.classList.remove("pointback-selected", "pointback-highlight");
      selectedElements.delete(element);
      renderSelectedHighlights();
      removeHighlight();
      updateSelectionHeader();
      input.disabled = selectedElements.size === 0;
      sendButton.disabled = !input.value.trim() || selectedElements.size === 0;
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
          ? "Select a component to start a conversation"
          : selectedElements.size === 1
            ? "Start a conversation about this component"
            : "Start a conversation about these components";

      const description = document.createElement("p");
      description.className = "pb-empty-description";
      description.textContent =
        selectedElements.size === 0
          ? "Add a component before sending a message."
          : "Ask about their behavior, styling, or implementation.";

      state.append(title, description);
      messages.append(state);
    }

    function refreshEmptyState() {
      if (messages.querySelector(".pb-empty-state")) renderEmptyState();
    }

    function openPanel(resetMessages: boolean) {
      if (selectedElements.size === 0) return;
      updateSelectionHeader();
      if (resetMessages) renderEmptyState();
      else refreshEmptyState();
      panel.hidden = false;
      input.disabled = false;
      input.focus();
    }

    function stopSelecting() {
      isSelecting = false;
      isAddModeActive = false;
      selectComponentsButton.setAttribute("aria-pressed", "false");
      lassoStart = null;
      replacementElement = null;
      hideReplacementHighlight();
      lasso.hidden = true;
      removeHighlight();
      hint.hidden = true;
      document.documentElement.classList.remove("pointback-selecting");
      updateSelectionHeader();
    }

    function startSelecting(mode: SelectionMode = "initial", replacement: Element | null = null) {
      selectionMode = mode;
      replacementElement = replacement;
      if (mode === "initial") {
        panel.hidden = true;
        clearSelection();
      }
      stopSelecting();
      selectionMode = mode;
      replacementElement = replacement;
      isAddModeActive = mode === "add";
      selectComponentsButton.setAttribute("aria-pressed", String(isAddModeActive));
      updateSelectionHeader();
      selectionInstruction.textContent =
        mode === "add"
          ? "Click a component, or drag to add multiple components."
          : mode === "replace"
            ? "Click a component to replace the selected tag."
            : "Click a component, or drag to select multiple.";
      isSelecting = true;
      hint.hidden = false;
      document.documentElement.classList.add("pointback-selecting");
    }

    function cancelSelection() {
      if (selectionMode === "initial") clearSelection();
      stopSelecting();
    }

    function appendMessage(content: string) {
      const bubble = document.createElement("article");
      bubble.className = "pb-message pb-user";

      const body = document.createElement("p");
      body.className = "pb-message-content";
      body.textContent = content;

      const metadata = document.createElement("div");
      metadata.className = "pb-message-metadata";
      const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date());
      metadata.textContent = `You · ${time}`;

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

    cancelButton.addEventListener("click", cancelSelection);
    selectComponentsButton.addEventListener("click", () => {
      if (isSelecting && selectionMode === "add") {
        stopSelecting();
      } else {
        startSelecting("add");
      }
    });
    themeToggle.addEventListener("click", () => {
      const isDark = panel.classList.toggle("pb-dark");
      themeToggle.setAttribute("aria-checked", String(isDark));
    });
    closeButton.addEventListener("click", () => {
      panel.hidden = true;
      clearSelection();
    });

    input.addEventListener("input", () => {
      input.style.height = "auto";
      input.style.height = `${input.scrollHeight}px`;
      sendButton.disabled = !input.value.trim() || selectedElements.size === 0;
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        form.requestSubmit();
      }
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const message = input.value.trim();
      if (!message || selectedElements.size === 0) return;
      appendMessage(message);
      input.value = "";
      input.style.height = "auto";
      sendButton.disabled = true;
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
        if (moved) {
          const lassoedComponents = getLassoedComponents(event.clientX, event.clientY);
          if (mode === "initial") clearSelection();
          if (mode === "replace") {
            if (lassoedComponents[0]) replaceSelection(lassoedComponents[0]);
          } else {
            for (const element of lassoedComponents) addToSelection(element);
          }
        } else if (mode === "replace") {
          replaceSelection(event.target);
        } else {
          if (mode === "initial") clearSelection();
          addToSelection(event.target);
        }

        if (mode === "add") {
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
      if (replacementElement) showReplacementHighlight(replacementElement);
    }, true);
    window.addEventListener("resize", () => {
      renderSelectedHighlights();
      if (replacementElement) showReplacementHighlight(replacementElement);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isSelecting) cancelSelection();
    });

    browser.runtime.onMessage.addListener((message: PointBackMessage) => {
      if (message.type === "pointback:start-selection") startSelecting();
    });
  },
});
