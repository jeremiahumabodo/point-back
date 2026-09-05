import { resolveDomComponent } from "./dom-resolver";
import {
  REACT_RESOLUTION_ATTRIBUTE,
  REACT_RESOLUTION_REQUEST,
  REACT_RESOLUTION_RESPONSE,
} from "./react-resolution-events";
import type { ComponentFootprint, ReactResolution } from "./types";

let nextRequestId = 0;

function resolveReactComponent(element: Element): ReactResolution | undefined {
  const requestId = `pb-${crypto.randomUUID()}-${nextRequestId++}`;
  const previousValue = element.getAttribute(REACT_RESOLUTION_ATTRIBUTE);
  let resolution: ReactResolution | undefined;

  const onResponse = (event: Event) => {
    try {
      const result = JSON.parse((event as CustomEvent<string>).detail) as {
        requestId?: unknown;
        resolution?: ReactResolution;
      };
      if (result.requestId === requestId) resolution = result.resolution;
    } catch {
      // The main-world resolver is optional; preserve the DOM-only fallback.
    }
  };

  window.addEventListener(REACT_RESOLUTION_RESPONSE, onResponse);
  element.setAttribute(REACT_RESOLUTION_ATTRIBUTE, requestId);
  window.dispatchEvent(
    new CustomEvent(REACT_RESOLUTION_REQUEST, { detail: requestId }),
  );
  window.removeEventListener(REACT_RESOLUTION_RESPONSE, onResponse);
  if (previousValue === null)
    element.removeAttribute(REACT_RESOLUTION_ATTRIBUTE);
  else element.setAttribute(REACT_RESOLUTION_ATTRIBUTE, previousValue);

  return resolution;
}

/**
 * The single component-resolution boundary used by the content script. React
 * data is requested from a separate main-world script because isolated-world
 * content scripts cannot reliably read page-owned Fiber properties.
 */
export function resolveComponent(element: Element): ComponentFootprint {
  const domFootprint = resolveDomComponent(element);
  const react = resolveReactComponent(element);
  return react
    ? { ...domFootprint, name: react.component.name, react }
    : domFootprint;
}
