import type { ButtonHTMLAttributes } from "react";
import styles from "./send-button.module.css";

type SendButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

export function SendButton({
  "aria-label": ariaLabel = "Send message",
  className,
  type = "button",
  ...props
}: SendButtonProps) {
  return (
    <button
      aria-label={ariaLabel}
      className={[styles.root, className].filter(Boolean).join(" ")}
      type={type}
      {...props}
    >
      <svg aria-hidden="true" viewBox="0 0 16 16">
        <path d="M8 12V3M4.5 6.5 8 3l3.5 3.5" />
      </svg>
    </button>
  );
}
