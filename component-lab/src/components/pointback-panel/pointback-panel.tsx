import type { ReactNode } from "react";
import { ComponentSelectorButton } from "../component-selector-button";
import { ComponentTag } from "../component-tag";
import { ReferenceButton } from "../reference-button";
import { SendButton } from "../send-button";
import styles from "./pointback-panel.module.css";

export type PointBackPanelProps = {
  componentNames?: readonly string[];
  children?: ReactNode;
  dark?: boolean;
};

export function PointBackPanel({ componentNames = [], children, dark = false }: PointBackPanelProps) {
  return (
    <section className={[styles.root, dark && styles.dark].filter(Boolean).join(" ")}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>{componentNames.length} component{componentNames.length === 1 ? "" : "s"} selected</h2>
          {componentNames.length > 0 ? (
            <div className={styles.tags}>
              {componentNames.map((name) => <ComponentTag key={name} name={name} onRemove={() => {}} />)}
            </div>
          ) : null}
        </div>
        <div className={styles.actions}>
          <ComponentSelectorButton />
          <button aria-label="Toggle theme" className={styles.themeSwitch} role="switch" type="button"><span /></button>
          <button aria-label="Close conversation" className={styles.iconButton} title="Close conversation" type="button">×</button>
        </div>
      </header>
      <div className={styles.messages}>
        {children ?? (
          <div className={styles.emptyState}>
            <p>Start a conversation about this page</p>
            <span>Type a message and point to components as you refer to them.</span>
          </div>
        )}
      </div>
      <div className={styles.composer}>
        <div className={styles.input} contentEditable data-placeholder="Ask about this page..." role="textbox" />
        <ReferenceButton active />
        <SendButton />
      </div>
    </section>
  );
}
