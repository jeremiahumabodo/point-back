import type { ButtonHTMLAttributes } from "react";
import { Icon } from "../icons";
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
      <Icon
        name="send"
        className="pb-direction-arrow"
      />
    </button>
  );
}
