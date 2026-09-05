import { useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { ComponentSelectorButton } from "../component-selector-button";
import { ComponentTag } from "../component-tag";
import { InputField } from "../input-field";
import { MessageBubble, type MessageRole } from "../message-bubble";
import { ReferenceButton } from "../reference-button";
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
  readonly componentNames?: readonly string[];
  readonly className?: string;
  readonly placeholder?: string;
  readonly dark?: boolean;
  readonly onSend?: (message: string) => void;
};

function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
  if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
    return;
  }

  event.preventDefault();
  event.currentTarget.form?.requestSubmit();
}

export function MessagePanel({
  componentName,
  messages,
  componentNames = [componentName],
  className,
  placeholder = "Ask about this component...",
  dark = false,
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

  return (
    <section
      aria-label={`Conversation about ${componentName}`}
      className={[styles.root, dark && styles.dark, className].filter(Boolean).join(" ")}
    >
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>{componentName}</h2>
          {componentNames.length > 0 ? (
            <div className={styles.tags}>
              {componentNames.map((name) => <ComponentTag key={name} name={name} onRemove={() => {}} />)}
            </div>
          ) : null}
        </div>
        <div className={styles.actions}>
          <ComponentSelectorButton />
          <button aria-label="Conversation settings" className={styles.iconButton} title="Conversation settings" type="button">⚙</button>
          <button aria-checked={dark} aria-label="Toggle dark mode" className={styles.themeSwitch} role="switch" type="button"><span /></button>
          <button aria-label="Close conversation" className={styles.iconButton} title="Close conversation" type="button">×</button>
        </div>
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
        <button aria-label="Chat history" className={styles.composerIcon} title="Chat history" type="button">↶</button>
        <InputField
          aria-label="Message"
          className={styles.input}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          value={draft}
        />
        <button aria-label="New chat" className={styles.composerIcon} title="New chat" type="button">↗</button>
        <ReferenceButton active />
        <SendButton disabled={!draft.trim()} type="submit" />
      </form>
    </section>
  );
}
