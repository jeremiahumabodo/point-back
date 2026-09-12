import type { HTMLAttributes } from "react";

/** React owns the editable host, but not its descendants. Native editing, IME,
 * selection ranges and non-editable reference tokens require an imperative island.
 * Use reference-editor-dom.ts to render its contents without React reconciliation.
 */
export type ReferenceEditorProps = HTMLAttributes<HTMLDivElement> & {
  "data-placeholder"?: string;
};
export function ReferenceEditor(props: ReferenceEditorProps) {
  return (
    <div
      className="pb-input"
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      aria-label="Message"
      data-placeholder="Type your message here..."
      {...props}
    />
  );
}
