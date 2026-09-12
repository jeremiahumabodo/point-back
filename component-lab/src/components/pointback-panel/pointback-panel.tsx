import type { ReactNode, FormEventHandler } from "react";
import { EmptyConversation } from "../message-bubble/message-bubble";
import { ComponentSelectorButton } from "../component-selector-button";
import { ComponentTag } from "../component-tag";
import {
  ReferenceEditor,
  type ReferenceEditorProps,
} from "../input-field/reference-editor";
import { SendButton } from "../send-button";
import {
  SettingsPane,
  HistoryPane,
} from "../conversation-panes/conversation-panes";

export type PointBackPanelProps = {
  componentNames?: readonly string[];
  title?: string;
  children?: ReactNode;
  dark?: boolean;
  hidden?: boolean;
  onClose?: () => void;
  onToggleTheme?: () => void;
  onSelectComponents?: () => void;
  onRemoveComponent?: (index: number) => void;
  pane?: "conversation" | "settings" | "history";
  busy?: boolean;
  canSend?: boolean;
  onOpenSettings?: () => void;
  onOpenHistory?: () => void;
  onBack?: () => void;
  onNewChat?: () => void;
  onStop?: () => void;
  onSend?: FormEventHandler<HTMLFormElement>;
  onSaveSettings?: FormEventHandler<HTMLFormElement>;
  editorProps?: ReferenceEditorProps;
  historyContent?: ReactNode;
  settingsStatus?: string;
  deicticMode?: boolean;
  onToggleReferences?: () => void;
};

/** Shared panel markup. Empty slots are reserved for the browser controller.
 * The controller mounts React views into those slots; this shell is mounted once.
 * No browser APIs, agent protocols, or DOM targeting belong in this component.
 */
export function PointBackPanel({
  componentNames = [],
  title,
  children,
  dark = false,
  hidden = false,
  onClose,
  onToggleTheme,
  onSelectComponents,
  onRemoveComponent,
  pane = "conversation",
  busy = false,
  canSend = false,
  onOpenSettings,
  onOpenHistory,
  onBack,
  onNewChat,
  onStop,
  onSend,
  onSaveSettings,
  editorProps,
  historyContent,
  settingsStatus,
  deicticMode = true,
  onToggleReferences,
}: PointBackPanelProps) {
  return (
    <aside
      className={`pb-panel${dark ? " pb-dark" : ""}`}
      aria-label="PointBack conversation"
      hidden={hidden}
    >
      <header className="pb-header">
        <div>
          <h2 className="pb-component-name">
            {title ??
              `${componentNames.length} Component${componentNames.length === 1 ? "" : "s"} selected`}
          </h2>
          <div className="pb-component-list" aria-label="Selected components">
            {componentNames.map((name, index) => (
              <ComponentTag
                key={index}
                name={name}
                disabled={busy}
                onRemove={
                  onRemoveComponent ? () => onRemoveComponent(index) : undefined
                }
              />
            ))}
          </div>
        </div>
        <div className="pb-header-actions">
          <ComponentSelectorButton
            onClick={onSelectComponents}
            disabled={busy}
          />
          <button
            className="pb-settings"
            type="button"
            aria-label="Conversation settings"
            aria-expanded={pane === "settings"}
            aria-controls="pb-settings-pane"
            title="Conversation settings"
            onClick={onOpenSettings}
            disabled={busy}
          >
            <svg aria-hidden="true" viewBox="0 0 16 16">
              <path d="M6.7 1.2h2.6l.4 1.6c.4.2.8.4 1.1.7l1.6-.5 1.3 2.3-1.2 1.1c.1.4.1.8 0 1.3l1.2 1.1-1.3 2.3-1.6-.5c-.3.3-.7.5-1.1.7l-.4 1.6H6.7l-.4-1.6c-.4-.2-.8-.4-1.1-.7l-1.6.5-1.3-2.3 1.2-1.1a4.5 4.5 0 0 1 0-1.3L2.3 5.3 3.6 3l1.6.5c.3-.3.7-.5 1.1-.7l.4-1.6Z" />
              <circle cx="8" cy="7" r="2" />
            </svg>
          </button>
          <button
            className="pb-theme-toggle"
            type="button"
            role="switch"
            aria-label="Dark mode"
            aria-checked={dark}
            title="Toggle dark mode"
            onClick={onToggleTheme}
          >
            <svg
              className="pb-theme-toggle-moon"
              aria-hidden="true"
              viewBox="0 0 16 16"
            >
              <path d="M10.8 2.2a5.6 5.6 0 1 0 3 10.1A5.8 5.8 0 0 1 10.8 2.2Z" />
            </svg>
            <svg
              className="pb-theme-toggle-sun"
              aria-hidden="true"
              viewBox="0 0 16 16"
            >
              <circle cx="8" cy="8" r="2.5" />
              <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M12.6 3.4l-1 1M4.4 11.6l-1 1" />
            </svg>
            <span className="pb-theme-toggle-thumb" aria-hidden="true" />
          </button>
          <button
            className="pb-close"
            type="button"
            aria-label="Close conversation"
            title="Close conversation"
            onClick={onClose}
          >
            <svg aria-hidden="true" viewBox="0 0 16 16">
              <path d="m4 4 8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
      </header>
      <div
        className="pb-messages"
        aria-live="polite"
        hidden={pane !== "conversation"}
      >
        {children === undefined ? (
          <EmptyConversation selectedCount={componentNames.length} />
        ) : (
          children
        )}
      </div>
      <SettingsPane
        hidden={pane !== "settings"}
        onClose={onBack}
        onSubmit={onSaveSettings}
        status={settingsStatus}
        deicticMode={deicticMode}
        onToggleReferences={onToggleReferences}
      />
      <HistoryPane hidden={pane !== "history"} onClose={onBack}>
        {historyContent}
      </HistoryPane>
      <form
        className="pb-composer"
        hidden={pane !== "conversation"}
        onSubmit={onSend}
      >
        <div className="pb-composer-row">
          <button
            className="pb-history"
            type="button"
            aria-label="Chat history"
            aria-expanded={pane === "history"}
            aria-controls="pb-history-pane"
            title="Chat history"
            onClick={onOpenHistory}
            disabled={busy}
          >
            <svg aria-hidden="true" viewBox="0 0 16 16">
              <path d="M2.5 3.5v3h3" />
              <path d="M3 7a5.5 5.5 0 1 0 1.1-3.3L2.5 5" />
              <path d="M8 4.5V8l2.5 1.5" />
            </svg>
          </button>
          <ReferenceEditor
            contentEditable={busy ? "false" : "plaintext-only"}
            {...editorProps}
          />
          <button
            className="pb-new-chat pb-composer-new-chat"
            type="button"
            aria-label="New chat"
            title="New chat"
            onClick={onNewChat}
            disabled={busy}
          >
            <svg aria-hidden="true" viewBox="0 0 16 16">
              <path d="m10.8 2.2 3 3-7.6 7.6-3.8.8.8-3.8 7.6-7.6ZM9.2 3.8l3 3M2.5 2.5v3M1 4h3" />
            </svg>
          </button>
          <button
            className="pb-stop"
            type="button"
            hidden={!busy}
            onClick={onStop}
          >
            Stop
          </button>
          <SendButton type="submit" disabled={busy || !canSend} />
        </div>
      </form>
    </aside>
  );
}
