import type { ButtonHTMLAttributes } from "react";
import { Icon } from "../icons";
export type ReferenceButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & { active?: boolean; label?: string };
export function ReferenceButton({
  active = false,
  className = "",
  label,
  ...props
}: ReferenceButtonProps) {
  return (
    <button
      aria-label="Toggle component references"
      aria-pressed={active}
      className={`pb-deictic-toggle ${className}`}
      title="Toggle component references"
      type="button"
      {...props}
    >
      {label && <span>{label}</span>}
      <Icon name="reference" />
    </button>
  );
}
