import { startPointBack } from "../src/bootstrap/start-pointback";
import "../assets/content.css";

export default defineContentScript({
  matches: ["<all_urls>"],
  main(ctx) {
    ctx.onInvalidated(startPointBack());
  },
});
