import type { ButtonHTMLAttributes } from "react";
import styles from "./component-tag.module.css";

export type ComponentTagProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  name: string;
  selected?: boolean;
  onRemove?: () => void;
};

export function ComponentTag({ name, selected = false, onRemove, className, ...props }: ComponentTagProps) {
  return (
    <span className={styles.root}>
      <button
        aria-pressed={selected}
        className={[styles.tag, className].filter(Boolean).join(" ")}
        title={`Replace ${name}`}
        type="button"
        {...props}
      >
        {name}
      </button>
      {onRemove ? (
        <button aria-label={`Remove ${name}`} className={styles.remove} onClick={onRemove} title={`Remove ${name}`} type="button">
          −
        </button>
      ) : null}
    </span>
  );
}
