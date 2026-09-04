import type { ComponentFootprint } from "./types";

/**
 * Resolves the deterministic DOM identity signals currently available to the
 * extension. Framework-specific resolution belongs in a separate resolver.
 */
export function resolveDomComponent(element: Element): ComponentFootprint {
  const id = element.getAttribute("id");
  const componentName = element.getAttribute("data-component-name");
  const ariaLabel = element.getAttribute("aria-label");
  const tagName = element.tagName.toLowerCase();

  return {
    name: componentName || ariaLabel || id || tagName,
    tagName,
    ...(id ? { id } : {}),
    ...(componentName ? { componentName } : {}),
    ...(ariaLabel ? { ariaLabel } : {}),
  };
}
