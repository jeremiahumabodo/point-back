import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import uiCss from "../../component-lab/src/components/styles/extension.css?inline";
import { PointBackPanel } from "../../component-lab/src/components/pointback-panel";
import { SelectionOverlay } from "../../component-lab/src/components/selection-overlay/selection-overlay";
import { mountContentController } from "../ui/content-controller";
import { createReactSlots } from "../ui/react-slots";
import "../assets/content.css";

export default defineContentScript({
  matches: ["<all_urls>"],
  main(ctx) {
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
    flushSync(() =>
      shell.render(
        <>
          <SelectionOverlay />
          <PointBackPanel hidden>{null}</PointBackPanel>
        </>,
      ),
    );
    const slots = createReactSlots(root);
    const disposeController = mountContentController(root, shadow, host, slots);
    ctx.onInvalidated(() => {
      disposeController();
      slots.dispose();
      shell.unmount();
      host.remove();
    });
  },
});
