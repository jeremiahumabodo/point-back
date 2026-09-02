import type { ButtonHTMLAttributes } from "react";
import styles from "./component-selector-button.module.css";

export type ComponentSelectorButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  active?: boolean;
};

export function ComponentSelectorButton({ active = false, className, ...props }: ComponentSelectorButtonProps) {
  return (
    <button
      aria-label="Add components"
      aria-pressed={active}
      className={[styles.root, className].filter(Boolean).join(" ")}
      title="Add components"
      type="button"
      {...props}
    >
      <svg aria-hidden="true" viewBox="0 0 16 16">
        <rect height="12" rx="1" width="12" x="2" y="2" />
        <path d="m7 6 3 3-1.5.25L8 11z" />
      </svg>
      <span aria-hidden="true">+</span>
    </button>
  );
}
