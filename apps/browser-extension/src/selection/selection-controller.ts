import { trackSelectionPointer, type Point } from "./pointer-tracker";

export type SelectionMode = "initial" | "add" | "replace" | "link";

function lassoedComponents(
  start: Point,
  end: Point,
  isPointBackUi: (element: Element) => boolean,
) {
  const left = Math.min(start.x, end.x);
  const right = Math.max(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const bottom = Math.max(start.y, end.y);
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

/** Page targeting only. Conversation/reference policy receives the picked elements. */
export function createSelectionController(options: {
  signal: AbortSignal;
  lasso: HTMLElement;
  hint: HTMLElement;
  isSelecting: () => boolean;
  mode: () => SelectionMode;
  isPointBackUi: (element: Element) => boolean;
  onHover: (element: Element) => void;
  onPick: (elements: Element[]) => void;
}) {
  const { lasso, hint } = options;
  const pointer = trackSelectionPointer({
    signal: options.signal,
    isEnabled: options.isSelecting,
    isPointBackUi: options.isPointBackUi,
    onMove(element, point) {
      if (options.mode() === "link") {
        hint.style.left = `${point.x + 14}px`;
        hint.style.top = `${point.y + 14}px`;
      }
      options.onHover(element);
    },
    onDrag(start, point) {
      lasso.hidden = false;
      lasso.style.left = `${Math.min(start.x, point.x)}px`;
      lasso.style.top = `${Math.min(start.y, point.y)}px`;
      lasso.style.width = `${Math.abs(point.x - start.x)}px`;
      lasso.style.height = `${Math.abs(point.y - start.y)}px`;
    },
    onPick(element, start, point, moved) {
      options.onPick(
        moved
          ? lassoedComponents(start, point, options.isPointBackUi)
          : [element],
      );
      lasso.hidden = true;
    },
  });
  return {
    reset() {
      pointer.reset();
      lasso.hidden = true;
    },
  };
}
