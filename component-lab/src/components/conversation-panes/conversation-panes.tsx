import type { FormHTMLAttributes, ReactNode } from "react";
import { ReferenceButton } from "../reference-button";

export function BackArrow() {
  return (
    <svg className="pb-direction-arrow" aria-hidden="true" viewBox="0 0 16 16">
      <path d="M8 13V3M4.5 6.5 8 3l3.5 3.5" />
    </svg>
  );
}
export function SettingsPane({
  hidden = true,
  onSubmit,
  status,
  onClose,
  deicticMode = true,
  onToggleReferences,
}: {
  hidden?: boolean;
  onSubmit?: FormHTMLAttributes<HTMLFormElement>["onSubmit"];
  status?: string;
  onClose?: () => void;
  deicticMode?: boolean;
  onToggleReferences?: () => void;
}) {
  return (
    <section
      id="pb-settings-pane"
      className="pb-settings-pane"
      aria-labelledby="pb-settings-title"
      hidden={hidden}
    >
      <div className="pb-settings-pane-header">
        <button
          className="pb-settings-close"
          type="button"
          aria-label="Back to conversation"
          title="Back to conversation"
          onClick={onClose}
        >
          <BackArrow />
        </button>
        <h3 id="pb-settings-title">Connection Settings</h3>
      </div>
      <form className="pb-settings-form" onSubmit={onSubmit}>
        <label className="pb-settings-field">
          <span>Agent bridge address</span>
          <input
            className="pb-agent-bridge-address"
            type="url"
            inputMode="url"
            placeholder="http://127.0.0.1:3000"
            autoComplete="off"
            required
          />
        </label>
        <label className="pb-settings-field">
          <span>Bridge token</span>
          <input
            className="pb-bridge-token"
            type="password"
            placeholder="Paste from bridge terminal; blank keeps saved token"
            autoComplete="off"
          />
          <small>
            The repository is configured locally when starting the bridge. Agent
            access is read-only.
          </small>
        </label>
        <ReferenceButton
          active={deicticMode}
          onClick={onToggleReferences}
          className="pb-deictic-settings-toggle"
          label="Reference UI components"
        />
        <div className="pb-settings-actions">
          <button
            className="pb-settings-cancel"
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="pb-settings-save" type="submit">
            Save
          </button>
        </div>
        <p className="pb-settings-status" role="status">
          {status}
        </p>
      </form>
    </section>
  );
}
export function HistoryPane({
  hidden = true,
  children,
  onClose,
}: {
  hidden?: boolean;
  children?: ReactNode;
  onClose?: () => void;
}) {
  return (
    <section
      id="pb-history-pane"
      className="pb-history-pane"
      aria-labelledby="pb-history-title"
      hidden={hidden}
    >
      <div className="pb-settings-pane-header">
        <button
          className="pb-history-close"
          type="button"
          aria-label="Back to conversation"
          title="Back to conversation"
          onClick={onClose}
        >
          <BackArrow />
        </button>
        <h3 id="pb-history-title">Chat History</h3>
      </div>
      <div className="pb-history-list">{children}</div>
    </section>
  );
}
export function HistoryList({
  threads,
  onOpen,
  loadingId,
}: {
  threads: readonly { id: string; title: string; updatedAt: string }[];
  onOpen: (id: string) => void;
  loadingId?: string;
}) {
  return threads.length ? (
    <>
      {threads.map((thread) => (
        <button
          key={thread.id}
          type="button"
          className="pb-history-thread"
          disabled={loadingId === thread.id}
          title={new Date(thread.updatedAt).toLocaleString()}
          onClick={() => onOpen(thread.id)}
        >
          {thread.title}
        </button>
      ))}
    </>
  ) : (
    <>No saved conversations for this repository.</>
  );
}
