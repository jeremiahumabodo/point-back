import { startReactResolver } from "../src/component-resolution/react/react-resolver";

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_start",
  world: "MAIN",
  main() {
    startReactResolver();
  },
});
