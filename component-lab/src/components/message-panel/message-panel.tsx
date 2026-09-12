import { useRef, useState, type ReactNode } from "react";
import { MessageBubble, type MessageRole } from "../message-bubble";
import { PointBackPanel } from "../pointback-panel";

export type MessagePanelMessage = {
  id: string;
  role: MessageRole;
  content: ReactNode;
  author?: string;
  timestamp: string;
};
export type MessagePanelProps = {
  readonly componentName: string;
  readonly messages: readonly MessagePanelMessage[];
  readonly componentNames?: readonly string[];
  readonly className?: string;
  readonly placeholder?: string;
  readonly dark?: boolean;
  readonly onSend?: (message: string) => void;
};

/** Convenience demo wrapper. Panel markup and styling live only in PointBackPanel. */
export function MessagePanel({
  componentName,
  messages,
  componentNames = [componentName],
  className,
  placeholder = "Type your message here...",
  dark = false,
  onSend,
}: MessagePanelProps) {
  const [draft, setDraft] = useState("");
  const editor = useRef<HTMLDivElement | null>(null);
  return (
    <div className={className}>
      <PointBackPanel
        title={componentName}
        componentNames={componentNames}
        dark={dark}
        canSend={!!draft.trim()}
        editorProps={{
          "data-placeholder": placeholder,
          onInput: (event) => {
            editor.current = event.currentTarget;
            setDraft(event.currentTarget.innerText);
          },
          onKeyDown: (event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              event.currentTarget.closest("form")?.requestSubmit();
            }
          },
        }}
        onSend={(event) => {
          event.preventDefault();
          if (!draft.trim()) return;
          onSend?.(draft.trim());
          editor.current?.replaceChildren();
          setDraft("");
        }}
      >
        {messages.length
          ? messages.map((message) => (
              <MessageBubble
                key={message.id}
                messageRole={message.role}
                author={message.author}
                timestamp={message.timestamp}
              >
                {message.content}
              </MessageBubble>
            ))
          : undefined}
      </PointBackPanel>
    </div>
  );
}
