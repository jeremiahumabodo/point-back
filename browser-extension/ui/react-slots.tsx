import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import type { ReactNode } from "react";

/** A migration boundary for the existing imperative interaction controller.
 * React owns each slot's children; the controller owns slot visibility, position,
 * and empty editable/streaming refs. Never re-render the static shell over slots.
 */
export function createReactSlots(scope: HTMLElement) {
  const roots = new Map<HTMLElement, Root>();
  function clear(container: HTMLElement) {
    for (const [element, root] of roots) {
      if (element === container || container.contains(element)) {
        root.unmount();
        roots.delete(element);
      }
    }
    container.replaceChildren();
  }
  function render(container: HTMLElement, node: ReactNode) {
    let root = roots.get(container);
    if (!root) {
      root = createRoot(container);
      roots.set(container, root);
    }
    // The controller measures rendered nodes and attaches native listeners immediately.
    flushSync(() => root.render(node));
  }
  function append(container: HTMLElement, node: ReactNode) {
    const slot = document.createElement("div");
    slot.className = "pb-react-slot";
    container.append(slot);
    render(slot, node);
    return slot;
  }
  // Also dispose roots if an editable node or external page removes their host.
  const observer = new MutationObserver(() => {
    for (const [element, root] of roots) {
      if (!scope.contains(element)) {
        root.unmount();
        roots.delete(element);
      }
    }
  });
  observer.observe(scope, { childList: true, subtree: true });
  return {
    render,
    append,
    clear,
    dispose() {
      observer.disconnect();
      for (const root of roots.values()) root.unmount();
      roots.clear();
    },
  };
}
export type ReactSlots = ReturnType<typeof createReactSlots>;
