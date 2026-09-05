import type { ComponentFootprint } from "./types";

const MAX_TEXT_LENGTH = 160;
const MAX_DOM_PATH_DEPTH = 6;

function selectorPart(element: Element): string {
  const tagName = element.tagName.toLowerCase();
  const id = element.getAttribute("id");
  if (id) return `${tagName}#${CSS.escape(id)}`;

  const testId = element.getAttribute("data-testid");
  if (testId) return `${tagName}[data-testid="${CSS.escape(testId)}"]`;

  const componentName = element.getAttribute("data-component-name");
  if (componentName)
    return `${tagName}[data-component-name="${CSS.escape(componentName)}"]`;

  const siblings = Array.from(element.parentElement?.children ?? []).filter(
    (sibling) => sibling.tagName === element.tagName,
  );
  const position = siblings.indexOf(element) + 1;
  return siblings.length > 1 ? `${tagName}:nth-of-type(${position})` : tagName;
}

function getDomPath(element: Element): Element[] {
  const path: Element[] = [];
  let current: Element | null = element;
  while (current && path.length < MAX_DOM_PATH_DEPTH) {
    path.push(current);
    current = current.parentElement;
  }
  return path;
}

function getTextExcerpt(element: Element): string | undefined {
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    return undefined;
  }

  const text = (
    element instanceof HTMLElement
      ? element.innerText
      : (element.textContent ?? "")
  )
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.slice(0, MAX_TEXT_LENGTH) : undefined;
}

/**
 * Resolves deterministic DOM identity signals. This is the fallback for pages
 * without usable framework metadata.
 */
export function resolveDomComponent(element: Element): ComponentFootprint {
  const id = element.getAttribute("id");
  const componentName = element.getAttribute("data-component-name");
  const ariaLabel = element.getAttribute("aria-label");
  const role = element.getAttribute("role");
  const testId = element.getAttribute("data-testid");
  const tagName = element.tagName.toLowerCase();
  const domPath = getDomPath(element);
  const textExcerpt = getTextExcerpt(element);

  return {
    name: componentName || ariaLabel || id || testId || tagName,
    tagName,
    domPath: domPath.map(selectorPart),
    selector: domPath.reverse().map(selectorPart).join(" > "),
    page: {
      origin: window.location.origin,
      // Query parameters and fragments commonly contain tokens or transient UI state.
      path: window.location.pathname,
      ...(document.title ? { title: document.title } : {}),
    },
    ...(id ? { id } : {}),
    ...(componentName ? { componentName } : {}),
    ...(ariaLabel ? { ariaLabel } : {}),
    ...(role ? { role } : {}),
    ...(testId ? { testId } : {}),
    ...(textExcerpt ? { textExcerpt } : {}),
  };
}
