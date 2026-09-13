/** Keep PointBack editing out of the page's bubbling shortcut/input handlers.
 * Listen outside the React root so React and native editor handlers run first.
 * Do not preventDefault: typing, IME, clipboard actions and Tab remain native.
 * This is not a security boundary: earlier window/document capture listeners
 * can still observe events before they reach this ShadowRoot.
 */
export function isolateEditingEvents(shadow: ShadowRoot): () => void {
  const lifetime = new AbortController();
  const stopBubbling = (event: Event) => event.stopPropagation();
  const eventTypes = [
    "keydown",
    "keypress",
    "keyup",
    "beforeinput",
    "input",
    "compositionstart",
    "compositionupdate",
    "compositionend",
    "copy",
    "cut",
    "paste",
  ];
  for (const type of eventTypes) {
    shadow.addEventListener(type, stopBubbling, { signal: lifetime.signal });
  }
  return () => lifetime.abort();
}
