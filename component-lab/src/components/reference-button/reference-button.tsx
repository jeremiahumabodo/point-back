import type { ButtonHTMLAttributes } from "react";
import styles from "./reference-button.module.css";

export type ReferenceButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  active?: boolean;
};

export function ReferenceButton({ active = false, className, ...props }: ReferenceButtonProps) {
  return (
    <button
      aria-label="Toggle deictic references"
      aria-pressed={active}
      className={[styles.root, className].filter(Boolean).join(" ")}
      title="Toggle deictic references"
      type="button"
      {...props}
    >
      <svg aria-hidden="true" viewBox="0 0 16 16">
        <path d="m6.4 9.6 3.2-3.2M5.1 11.9l-1 1a2.5 2.5 0 0 1-3.5-3.5l3-3a2.5 2.5 0 0 1 3.5 0M10.9 4.1l1-1a2.5 2.5 0 0 1 3.5 3.5l-3 3a2.5 2.5 0 0 1-3.5 0" />
      </svg>
    </button>
  );
}
