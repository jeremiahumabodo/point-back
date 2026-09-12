import type { ReactNode, FormEventHandler } from "react";
import { EmptyConversation } from "../message-bubble/message-bubble";
import { ComponentSelectorButton } from "../component-selector-button";
import { ComponentTag } from "../component-tag";
import {
  ReferenceEditor,
  type ReferenceEditorProps,
} from "../input-field/reference-editor";
import { SendButton } from "../send-button";
import { Icon } from "../icons";
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
            <Icon name="settings" />
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
            <Icon
              name="moon"
              className="pb-theme-toggle-moon"
            />
            <Icon
              name="sun"
              className="pb-theme-toggle-sun"
            />
            <span className="pb-theme-toggle-thumb" aria-hidden="true" />
          </button>
          <button
            className="pb-close"
            type="button"
            aria-label="Close conversation"
            title="Close conversation"
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </div>
      </header>
      <div
        className="pb-message-scroll"
        hidden={pane !== "conversation"}
      >
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
        <div className="pb-scrollbar" aria-hidden="true">
          <div className="pb-scrollbar-track">
            <div className="pb-scrollbar-thumb" />
          </div>
        </div>
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
            <Icon name="history" />
          </button>
          <div className="pb-input-scroll">
            <ReferenceEditor
              contentEditable={busy ? "false" : "plaintext-only"}
              {...editorProps}
            />
            <div className="pb-scrollbar" aria-hidden="true">
              <div className="pb-scrollbar-track">
                <div className="pb-scrollbar-thumb" />
              </div>
            </div>
          </div>
          <button
            className="pb-new-chat pb-composer-new-chat"
            type="button"
            aria-label="New chat"
            title="New chat"
            onClick={onNewChat}
            hidden={busy}
            disabled={busy}
          >
            <Icon name="new-chat" />
          </button>
          <button
            className="pb-stop"
            type="button"
            aria-label="Stop response"
            title="Stop response"
            hidden={!busy}
            onClick={onStop}
          >
            <Icon name="stop" />
          </button>
          <SendButton type="submit" disabled={busy || !canSend} />
        </div>
      </form>
    </aside>
  );
}
