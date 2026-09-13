import { mountShadowRoot } from "../ui/mount-shadow-root";

export function startPointBack() {
  const ui = mountShadowRoot();
  return () => ui.dispose();
}
