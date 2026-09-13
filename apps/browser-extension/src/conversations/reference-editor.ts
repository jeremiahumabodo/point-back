import { buildReferenceDraft, editorSelection } from "@pointback/ui/editor";

/** Browser editing mechanics, independent of conversation and selection policy. */
export function createReferenceEditor(input: HTMLElement, shadow: ShadowRoot) {
  function getDraft() {
    return input.innerText.replace(/\r/g, "");
  }
  function getRenderedReferences() {
    return [
      ...input.querySelectorAll<HTMLElement>(".pb-deictic-reference"),
    ].map((token) => {
      const range = document.createRange();
      range.selectNodeContents(input);
      range.setEndBefore(token);
      const before = document.createElement("div");
      before.append(range.cloneContents());
      const start = (before.textContent ?? "").replace(/\r/g, "").length;
      const term = token.dataset.term ?? "";
      return {
        id: token.dataset.referenceId ?? "",
        term,
        start,
        end: start + term.length,
      };
    });
  }
  function getCaretOffset() {
    const selection = editorSelection(shadow);
    if (!selection?.rangeCount) return null;
    const range = selection.getRangeAt(0);
    if (!input.contains(range.endContainer)) return null;
    const beforeCaret = range.cloneRange();
    beforeCaret.selectNodeContents(input);
    beforeCaret.setEnd(range.endContainer, range.endOffset);
    return beforeCaret.toString().length;
  }
  function restoreCaret(
    offset: number,
    textNodes: Array<{ node: Text; start: number; end: number }>,
    tokens: Array<{
      element: HTMLElement;
      reference: { start: number; end: number };
    }>,
  ) {
    const range = document.createRange();
    const textNode = textNodes.find(
      ({ start, end }) => offset >= start && offset <= end,
    );
    if (textNode) range.setStart(textNode.node, offset - textNode.start);
    else {
      const token = tokens.find(
        ({ reference }) => offset >= reference.start && offset <= reference.end,
      );
      if (token && offset <= token.reference.start)
        range.setStartBefore(token.element);
      else if (token) range.setStartAfter(token.element);
      else range.selectNodeContents(input);
    }
    range.collapse(true);
    const selection = editorSelection(shadow);
    input.focus({ preventScroll: true });
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
  function render(
    caretOffset: number | null,
    ...draft: Parameters<typeof buildReferenceDraft>
  ) {
    const { fragment, textNodes, tokens } = buildReferenceDraft(...draft);
    input.replaceChildren(fragment);
    if (caretOffset !== null) restoreCaret(caretOffset, textNodes, tokens);
  }
  return { getDraft, getRenderedReferences, getCaretOffset, render };
}
