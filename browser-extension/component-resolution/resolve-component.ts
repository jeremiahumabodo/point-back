import { resolveDomComponent } from "./dom-resolver";
import type { ComponentFootprint } from "./types";

/**
 * The single component-resolution boundary used by the content script.
 *
 * It currently uses DOM metadata only. A future React resolver can be tried
 * here and fall back to resolveDomComponent without exposing Fiber details to
 * the rest of the extension.
 */
export function resolveComponent(element: Element): ComponentFootprint {
  return resolveDomComponent(element);
}
