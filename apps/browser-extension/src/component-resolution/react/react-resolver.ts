import {
  REACT_RESOLUTION_ATTRIBUTE,
  REACT_RESOLUTION_REQUEST,
  REACT_RESOLUTION_RESPONSE,
} from "./react-resolution-events";
import { resolveReactComponent } from "./ancestry";

/** Installed only by the MAIN-world entrypoint, never by the isolated UI. */
export function startReactResolver() {
  window.addEventListener(REACT_RESOLUTION_REQUEST, (event) => {
    const requestId = (event as CustomEvent<unknown>).detail;
    if (typeof requestId !== "string") return;
    const element = document.querySelector(
      `[${REACT_RESOLUTION_ATTRIBUTE}="${requestId}"]`,
    );
    const resolution = element ? resolveReactComponent(element) : undefined;
    window.dispatchEvent(
      new CustomEvent(REACT_RESOLUTION_RESPONSE, {
        detail: JSON.stringify({ requestId, resolution }),
      }),
    );
  });
}
