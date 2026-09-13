import type { ComponentFootprint } from "@pointback/protocol";
import { resolveComponent } from "../component-resolution/component-resolver";
import {
  createSelectionController,
  type SelectionMode,
} from "./selection-controller";

export type PageComponent = { id: string; footprint: ComponentFootprint };
export type ComponentInspection = {
  footprint: ComponentFootprint;
  left: number;
  top: number;
};
type SelectionConfig = {
  mode: SelectionMode;
  replacement?: string;
  referenceId?: string;
} | null;

/** Owns page identities and geometry. React only receives opaque IDs and snapshots.
 * These handles are session-local; saved footprints must not be treated as live anchors.
 */
export function createBrowserMechanics() {
  let ids = new WeakMap<Element, string>();
  const targets = new Map<string, Element>();
  let selected: string[] = [];
  let referenceTargets: readonly string[] = [];
  let selection: SelectionConfig = null;
  let hovered: Element | null = null;
  let chip: { id: string; anchor: HTMLElement } | null = null;
  let modifier = false;
  let refresh = () => {};
  let inspect = (_value: ComponentInspection | null) => {};
  let resetPointer = () => {};

  function observe(element: Element): PageComponent {
    let id = ids.get(element);
    if (!id) {
      id = crypto.randomUUID();
      ids.set(element, id);
    }
    targets.set(id, element);
    return { id, footprint: resolveComponent(element) };
  }
  function highlight(element: Element | null) {
    hovered?.classList.remove("pointback-highlight");
    hovered = element;
    hovered?.classList.add("pointback-highlight");
  }
  function showInspection() {
    const element = chip && targets.get(chip.id);
    if (!modifier || !chip || !element) {
      inspect(null);
      return;
    }
    const rect = chip.anchor.getBoundingClientRect();
    inspect({
      footprint: resolveComponent(element),
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 330)),
      top: rect.bottom + 8,
    });
  }
  function rectangles(
    container: HTMLElement,
    targetIds: readonly string[],
    className: string,
  ) {
    container.replaceChildren(
      ...targetIds.flatMap((id) => {
        const element = targets.get(id);
        if (!element?.isConnected) return [];
        const { left, top, width, height } = element.getBoundingClientRect();
        if (!width || !height) return [];
        const rectangle = document.createElement("div");
        rectangle.className = className;
        Object.assign(rectangle.style, {
          left: `${left}px`,
          top: `${top}px`,
          width: `${width}px`,
          height: `${height}px`,
        });
        return [rectangle];
      }),
    );
  }
  return {
    resolve(targetIds: readonly string[]) {
      return targetIds.flatMap((id) => {
        const element = targets.get(id);
        return element?.isConnected ? [resolveComponent(element)] : [];
      });
    },
    sync(
      nextSelected: readonly string[],
      nextSelection: SelectionConfig,
      singularLink: boolean,
    ) {
      for (const id of selected)
        targets.get(id)?.classList.remove("pointback-selected");
      selected = [...nextSelected];
      for (const id of selected)
        targets.get(id)?.classList.add("pointback-selected");
      if (selection !== nextSelection) {
        resetPointer();
        highlight(null);
      }
      selection = nextSelection;
      document.documentElement.classList.toggle(
        "pointback-selecting",
        selection !== null,
      );
      document.documentElement.classList.toggle(
        "pointback-link-singular",
        singularLink,
      );
      refresh();
    },
    showReferences(targetIds: readonly string[]) {
      referenceTargets = targetIds;
      refresh();
    },
    hoverChip(id: string, anchor: HTMLElement, inspectModifier = false) {
      chip = { id, anchor };
      modifier = inspectModifier || modifier;
      highlight(targets.get(id) ?? null);
      showInspection();
    },
    leaveChip() {
      chip = null;
      highlight(null);
      inspect(null);
    },
    /** Release strong page references when the conversation no longer uses them. */
    retain(retained: ReadonlySet<string>) {
      for (const [id, element] of targets)
        if (!retained.has(id)) {
          element.classList.remove("pointback-selected", "pointback-highlight");
          targets.delete(id);
        }
    },
    mount(
      root: HTMLElement,
      host: HTMLElement,
      callbacks: {
        onPick: (components: PageComponent[]) => void;
        onEscape: () => void;
        onCommand: (command: "open" | "select") => void;
        onInspect: (inspection: ComponentInspection | null) => void;
      },
    ) {
      const lifetime = new AbortController();
      const { signal } = lifetime;
      // Only geometry islands are mutated here, never panel/composer/message state.
      const lasso = root.querySelector<HTMLElement>(".pb-lasso")!;
      const hint = root.querySelector<HTMLElement>(".pb-selection-hint")!;
      const selectedLayer = root.querySelector<HTMLElement>(
        ".pb-selected-highlights",
      )!;
      const referenceLayer = root.querySelector<HTMLElement>(
        ".pb-deictic-target-highlights",
      )!;
      const replacementLayer = root.querySelector<HTMLElement>(
        ".pb-replacement-highlights",
      )!;
      inspect = callbacks.onInspect;
      refresh = () => {
        rectangles(selectedLayer, selected, "pb-selected-component-highlight");
        rectangles(
          referenceLayer,
          referenceTargets,
          "pb-deictic-target-highlight",
        );
        rectangles(
          replacementLayer,
          selection?.replacement ? [selection.replacement] : [],
          "pb-replacement-highlight",
        );
        showInspection();
      };
      const pointer = createSelectionController({
        signal,
        lasso,
        hint,
        isSelecting: () => selection !== null,
        mode: () => selection?.mode ?? "initial",
        isPointBackUi: (element) => element === host || root.contains(element),
        onHover: (element) => highlight(element),
        onPick(elements) {
          highlight(null);
          callbacks.onPick(elements.map(observe));
        },
      });
      resetPointer = pointer.reset;
      window.addEventListener("scroll", refresh, { capture: true, signal });
      window.addEventListener("resize", refresh, { signal });
      window.addEventListener(
        "keydown",
        (event) => {
          if (event.key === "Escape") callbacks.onEscape();
          if (event.key === "Control" || event.key === "Meta") {
            modifier = true;
            showInspection();
          }
        },
        { capture: true, signal },
      );
      window.addEventListener(
        "keyup",
        (event) => {
          if (event.key === "Control" || event.key === "Meta") {
            modifier = false;
            showInspection();
          }
        },
        { capture: true, signal },
      );
      window.addEventListener(
        "blur",
        () => {
          modifier = false;
          showInspection();
        },
        { signal },
      );
      const onMessage = (message: { type?: string }) => {
        if (message.type === "pointback:open-panel")
          callbacks.onCommand("open");
        if (message.type === "pointback:start-selection")
          callbacks.onCommand("select");
      };
      browser.runtime.onMessage.addListener(onMessage);
      refresh();
      return () => {
        lifetime.abort();
        browser.runtime.onMessage.removeListener(onMessage);
        pointer.reset();
        highlight(null);
        for (const element of targets.values())
          element.classList.remove("pointback-selected");
        targets.clear();
        ids = new WeakMap();
        selected = [];
        referenceTargets = [];
        chip = null;
        selection = null;
        selectedLayer.replaceChildren();
        referenceLayer.replaceChildren();
        replacementLayer.replaceChildren();
        refresh = () => {};
        inspect = () => {};
        resetPointer = () => {};
        document.documentElement.classList.remove(
          "pointback-selecting",
          "pointback-link-singular",
        );
      };
    },
  };
}
export type BrowserMechanics = ReturnType<typeof createBrowserMechanics>;
