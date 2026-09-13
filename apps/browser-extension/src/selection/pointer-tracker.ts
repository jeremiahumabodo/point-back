export type Point = { x: number; y: number };

/** Capture page gestures without swallowing pointer events on PointBack itself. */
export function trackSelectionPointer(options: {
  signal: AbortSignal;
  isEnabled: () => boolean;
  isPointBackUi: (element: Element) => boolean;
  onMove: (element: Element, point: Point) => void;
  onDrag: (start: Point, point: Point) => void;
  onPick: (
    element: Element,
    start: Point,
    point: Point,
    moved: boolean,
  ) => void;
}) {
  let start: Point | null = null;
  let suppressNextClick = false;
  const point = (event: PointerEvent) => ({
    x: event.clientX,
    y: event.clientY,
  });
  const target = (event: PointerEvent) =>
    options.isEnabled() &&
    event.target instanceof Element &&
    !options.isPointBackUi(event.target)
      ? event.target
      : null;
  const listenerOptions = { capture: true, signal: options.signal };
  document.addEventListener(
    "pointerdown",
    (event) => {
      if (!target(event)) return;
      start = point(event);
      options.onDrag(start, start);
    },
    listenerOptions,
  );
  document.addEventListener(
    "pointermove",
    (event) => {
      const element = target(event);
      if (!element) return;
      if (start) options.onDrag(start, point(event));
      options.onMove(element, point(event));
    },
    listenerOptions,
  );
  document.addEventListener(
    "pointerup",
    (event) => {
      const element = target(event);
      if (!element || !start) return;
      const end = point(event);
      const moved = Math.hypot(end.x - start.x, end.y - start.y) > 6;
      event.preventDefault();
      event.stopPropagation();
      suppressNextClick = true;
      options.onPick(element, start, end, moved);
      start = null;
    },
    listenerOptions,
  );
  document.addEventListener(
    "click",
    (event) => {
      if (!suppressNextClick) return;
      suppressNextClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    listenerOptions,
  );
  return {
    reset() {
      start = null;
    },
  };
}
