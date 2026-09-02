import "../assets/content.css";

type PointBackMessage = { type: "pointback:start-selection" };

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    const root = document.createElement("div");
    root.id = "pointback-root";
    root.innerHTML = `
      <div class="pb-selection-hint" hidden>
        <span>Click a component, or drag to select multiple.</span>
        <button class="pb-cancel-selection" type="button">Cancel</button>
      </div>
      <div class="pb-lasso" hidden></div>
      <aside class="pb-panel" aria-label="PointBack conversation" hidden>
        <header class="pb-header">
          <div>
            <p class="pb-eyebrow">Components</p>
            <h2 class="pb-component-name"></h2>
            <div class="pb-component-list" aria-label="Selected components"></div>
          </div>
          <button class="pb-close" type="button" aria-label="Close conversation">×</button>
        </header>
        <div class="pb-messages" aria-live="polite"></div>
        <form class="pb-composer">
          <textarea class="pb-input" rows="1" placeholder="Ask about these components..." aria-label="Message" disabled></textarea>
          <button class="pb-send" type="submit" aria-label="Send message" disabled>↑</button>
        </form>
      </aside>
    `;
    document.documentElement.append(root);

    const hint = root.querySelector<HTMLElement>(".pb-selection-hint")!;
    const cancelButton = root.querySelector<HTMLButtonElement>(".pb-cancel-selection")!;
    const lasso = root.querySelector<HTMLElement>(".pb-lasso")!;
    const panel = root.querySelector<HTMLElement>(".pb-panel")!;
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

    function clearSelection() {
      for (const element of selectedElements) {
        element.classList.remove("pointback-selected");
      }
      selectedElements.clear();
    }

    function addToSelection(element: Element) {
      selectedElements.add(element);
      element.classList.add("pointback-selected");
    }

    function updateSelectionHeader() {
      const names = [...selectedElements].map(getComponentName);
      componentName.textContent = names.length === 1 ? names[0] : `${names.length} components selected`;
      componentList.replaceChildren(
        ...names.map((name) => {
          const chip = document.createElement("span");
          chip.className = "pb-component-chip";
          chip.textContent = name;
          return chip;
        }),
      );
    }

    function renderEmptyState() {
      messages.replaceChildren();
      const state = document.createElement("div");
      state.className = "pb-empty-state";

      const title = document.createElement("p");
      title.className = "pb-empty-title";
      title.textContent =
        selectedElements.size === 1
          ? `Start a conversation about ${componentName.textContent}`
          : "Start a conversation about these components";

      const description = document.createElement("p");
      description.className = "pb-empty-description";
      description.textContent = "Ask about their behavior, styling, or implementation.";

      state.append(title, description);
      messages.append(state);
    }

    function openPanel() {
      if (selectedElements.size === 0) return;
      updateSelectionHeader();
      renderEmptyState();
      panel.hidden = false;
      input.disabled = false;
      input.focus();
    }

    function stopSelecting() {
      isSelecting = false;
      lassoStart = null;
      lasso.hidden = true;
      removeHighlight();
      hint.hidden = true;
      document.documentElement.classList.remove("pointback-selecting");
    }

    function startSelecting() {
      panel.hidden = true;
      clearSelection();
      stopSelecting();
      isSelecting = true;
      hint.hidden = false;
      document.documentElement.classList.add("pointback-selecting");
    }

    function cancelSelection() {
      clearSelection();
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

    function selectLassoedComponents(x: number, y: number) {
      if (!lassoStart) return;
      const left = Math.min(lassoStart.x, x);
      const right = Math.max(lassoStart.x, x);
      const top = Math.min(lassoStart.y, y);
      const bottom = Math.max(lassoStart.y, y);
      const candidates = document.querySelectorAll(
        "[data-component-name], [aria-label], button, input, textarea, select, a, article, section, main, nav, header, footer, form, li, h1, h2, h3, h4, h5, h6",
      );

      clearSelection();
      for (const element of candidates) {
        if (isPointBackUi(element)) continue;
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.left < right && rect.right > left && rect.top < bottom && rect.bottom > top) {
          addToSelection(element);
        }
      }
    }

    cancelButton.addEventListener("click", cancelSelection);
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

        if (moved) {
          selectLassoedComponents(event.clientX, event.clientY);
        } else {
          clearSelection();
          addToSelection(event.target);
        }

        stopSelecting();
        if (selectedElements.size > 0) openPanel();
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

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isSelecting) cancelSelection();
    });

    browser.runtime.onMessage.addListener((message: PointBackMessage) => {
      if (message.type === "pointback:start-selection") startSelecting();
    });
  },
});
