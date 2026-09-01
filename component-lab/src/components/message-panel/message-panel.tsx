import { useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { InputField } from "../input-field";
import { MessageBubble, type MessageRole } from "../message-bubble";
import { SendButton } from "../send-button";
import styles from "./message-panel.module.css";

export type MessagePanelMessage = {
  id: string;
  role: MessageRole;
  content: ReactNode;
  author?: string;
  timestamp: string;
};

export type MessagePanelProps = {
  /** The UI component this thread is about. */
  readonly componentName: string;
  readonly messages: readonly MessagePanelMessage[];
  readonly className?: string;
  readonly placeholder?: string;
  readonly onSend?: (message: string) => void;
};

export function MessagePanel({
  componentName,
  messages,
  className,
  placeholder = "Ask about this component...",
  onSend,
}: MessagePanelProps) {
  const [draft, setDraft] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();

    if (!message) {
      return;
    }

    onSend?.(message);
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <section
      aria-label={`Conversation about ${componentName}`}
      className={[styles.root, className].filter(Boolean).join(" ")}
    >
      <header className={styles.header}>
        <h2 className={styles.title}>{componentName}</h2>
      </header>

      <div aria-live="polite" className={styles.messages}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>Start a conversation about {componentName}</p>
            <p className={styles.emptyDescription}>
              Ask about its behavior, styling, or implementation.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              author={message.author}
              key={message.id}
              messageRole={message.role}
              timestamp={message.timestamp}
            >
              {message.content}
            </MessageBubble>
          ))
        )}
      </div>

      <form className={styles.composer} onSubmit={handleSubmit}>
        <InputField
          aria-label="Message"
          className={styles.input}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          value={draft}
        />
        <SendButton disabled={!draft.trim()} type="submit" />
      </form>
    </section>
  );
}
