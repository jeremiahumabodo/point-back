import {
  REACT_RESOLUTION_ATTRIBUTE,
  REACT_RESOLUTION_REQUEST,
  REACT_RESOLUTION_RESPONSE,
} from "../component-resolution/react-resolution-events";
import type { ReactComponent, ReactResolution, SourceLocation } from "../component-resolution/types";

type Fiber = {
  return?: Fiber | null;
  type?: unknown;
  elementType?: unknown;
  _debugSource?: unknown;
};

function getFiber(element: Element): Fiber | undefined {
  const key = Object.getOwnPropertyNames(element).find((property) =>
    property.startsWith("__reactFiber$") || property.startsWith("__reactInternalInstance$"),
  );
  return key ? (element as unknown as Record<string, Fiber | undefined>)[key] : undefined;
}

function getComponentName(fiber: Fiber): string | undefined {
  const type = fiber.type ?? fiber.elementType;
  if (typeof type === "string") return undefined;
  if (typeof type === "function") {
    const component = type as { displayName?: unknown; name?: unknown };
    if (typeof component.displayName === "string") return component.displayName;
    if (typeof component.name === "string") return component.name;
    return undefined;
  }
  if (type && typeof type === "object") {
    const component = type as { displayName?: unknown; render?: { displayName?: unknown; name?: unknown } };
    if (typeof component.displayName === "string") return component.displayName;
    if (typeof component.render?.displayName === "string") return component.render.displayName;
    if (typeof component.render?.name === "string") return component.render.name;
  }
  return undefined;
}

function getSourceLocation(value: unknown): SourceLocation | undefined {
  if (!value || typeof value !== "object") return undefined;
  const source = value as { fileName?: unknown; lineNumber?: unknown; columnNumber?: unknown };
  if (typeof source.fileName !== "string") return undefined;

  return {
    fileName: source.fileName,
    ...(typeof source.lineNumber === "number" ? { lineNumber: source.lineNumber } : {}),
    ...(typeof source.columnNumber === "number" ? { columnNumber: source.columnNumber } : {}),
  };
}

function resolveReactComponent(element: Element): ReactResolution | undefined {
  const components: ReactComponent[] = [];
  const seen = new Set<string>();
  let fiber = getFiber(element);

  // Fiber is intentionally contained in this main-world resolver. Its shape is
  // undocumented, so a failure here must leave the DOM fallback fully usable.
  while (fiber) {
    const name = getComponentName(fiber);
    if (name && !seen.has(name)) {
      seen.add(name);
      components.push({ name, ...(getSourceLocation(fiber._debugSource) ? { source: getSourceLocation(fiber._debugSource) } : {}) });
    }
    fiber = fiber.return;
  }

  if (components.length === 0) return undefined;
  const [component, ...ancestry] = components;
  return { component, ancestry };
}

window.addEventListener(REACT_RESOLUTION_REQUEST, (event) => {
  const requestId = (event as CustomEvent<unknown>).detail;
  if (typeof requestId !== "string") return;

  const element = document.querySelector(`[${REACT_RESOLUTION_ATTRIBUTE}="${requestId}"]`);
  const resolution = element ? resolveReactComponent(element) : undefined;
  window.dispatchEvent(new CustomEvent(REACT_RESOLUTION_RESPONSE, {
    detail: JSON.stringify({ requestId, resolution }),
  }));
});

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_start",
  world: "MAIN",
  main() {},
});
