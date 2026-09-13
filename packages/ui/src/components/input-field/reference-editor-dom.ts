import { referenceClassName } from "../deictic-reference/reference-class-name";

/** Native editor presentation; no browser-target or bridge knowledge. */
export type EditorReference = {
  id: string;
  term: string;
  start: number;
  end: number;
  linked: boolean;
};
export function buildReferenceDraft(
  text: string,
  references: readonly EditorReference[],
  activeId: string | null,
  handlers: {
    onEnter: (id: string, token: HTMLElement) => void;
    onLeave: () => void;
    onActivate: (id: string) => void;
  },
) {
  const fragment = document.createDocumentFragment();
  const textNodes: Array<{ node: Text; start: number; end: number }> = [];
  const tokens: Array<{ element: HTMLElement; reference: EditorReference }> =
    [];
  let cursor = 0;
  function appendText(start: number, end: number) {
    if (end <= start) return;
    const node = document.createTextNode(text.slice(start, end));
    textNodes.push({ node, start, end });
    fragment.append(node);
  }
  for (const reference of references) {
    appendText(cursor, reference.start);
    const token = document.createElement("span");
    token.className = referenceClassName(
      reference.id === activeId,
      reference.linked,
    );
    token.contentEditable = "false";
    token.dataset.term = reference.term;
    token.dataset.referenceId = reference.id;
    token.title = `Point to a component to link “${reference.term}”.`;
    token.textContent = text.slice(reference.start, reference.end);
    token.addEventListener("pointerover", () =>
      handlers.onEnter(reference.id, token),
    );
    token.addEventListener("pointerout", handlers.onLeave);
    token.addEventListener("click", () => handlers.onActivate(reference.id));
    tokens.push({ element: token, reference });
    fragment.append(token);
    cursor = reference.end;
  }
  appendText(cursor, text.length);
  return { fragment, textNodes, tokens };
}

export function editorSelection(root: ShadowRoot): Selection | null {
  // Chromium exposes ShadowRoot.getSelection; window.getSelection().getRangeAt
  // may otherwise rescope ranges to the shadow host.
  return (
    (
      root as ShadowRoot & { getSelection?: () => Selection | null }
    ).getSelection?.() ?? window.getSelection()
  );
}
