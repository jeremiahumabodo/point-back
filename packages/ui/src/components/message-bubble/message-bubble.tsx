import type { HTMLAttributes, ReactNode, Ref } from "react";
export type MessageRole = "user" | "assistant";
export type MessageBubbleProps = HTMLAttributes<HTMLElement> & {
  children?: ReactNode;
  messageRole: MessageRole;
  author?: string;
  timestamp?: string;
  metadata?: ReactNode;
  bodyRef?: Ref<HTMLParagraphElement>;
  metadataRef?: Ref<HTMLDivElement>;
};
export function MessageBubble({
  children,
  className = "",
  messageRole,
  author = messageRole === "user" ? "You" : "Assistant",
  timestamp,
  metadata,
  bodyRef,
  metadataRef,
  ...props
}: MessageBubbleProps) {
  return (
    <article className={`pb-message pb-${messageRole} ${className}`} {...props}>
      <p className="pb-message-content" ref={bodyRef}>
        {children}
      </p>
      <div className="pb-message-metadata" ref={metadataRef}>
        {metadata ?? `${author}${timestamp ? ` · ${timestamp}` : ""}`}
      </div>
    </article>
  );
}
export function EmptyConversation({
  selectedCount = 0,
}: {
  selectedCount?: number;
}) {
  return (
    <div className="pb-empty-state">
      <p className="pb-empty-title">
        Start a conversation about{" "}
        {selectedCount === 0
          ? "this page"
          : selectedCount === 1
            ? "this component"
            : "these components"}
      </p>
      <p className="pb-empty-description">
        {selectedCount === 0
          ? "Type a message and point to components as you refer to them."
          : "Ask about their behavior, styling, or implementation."}
      </p>
    </div>
  );
}
