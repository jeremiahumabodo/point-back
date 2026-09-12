import type { ButtonHTMLAttributes } from "react";
export type SendButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
>;
export function SendButton({
  className = "",
  type = "button",
  ...props
}: SendButtonProps) {
  return (
    <button
      aria-label="Send message"
      title="Send message"
      className={`pb-send ${className}`}
      type={type}
      {...props}
    >
      <svg
        className="pb-direction-arrow"
        aria-hidden="true"
        viewBox="0 0 16 16"
      >
        <path d="M8 13V3M4.5 6.5 8 3l3.5 3.5" />
      </svg>
    </button>
  );
}
