import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import uiCss from "@pointback/ui/styles/main.css?inline";
import { PointBackApp } from "../application/PointBackApp";

export function mountShadowRoot() {
  const host = document.createElement("div");
  host.id = "pointback-host";
  // Shadow DOM is style encapsulation, not a security boundary against the page.
  host.style.setProperty("all", "initial", "important");
  host.style.setProperty("display", "block", "important");
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = uiCss;
  const root = document.createElement("div");
  root.id = "pointback-root";
  shadow.append(style, root);
  document.documentElement.append(host);
  const shell = createRoot(root);
  const surface = { root, shadow, host };
  flushSync(() => shell.render(<PointBackApp surface={surface} />));
  return {
    root,
    shadow,
    host,
    dispose() {
      shell.unmount();
      host.remove();
    },
  };
}
