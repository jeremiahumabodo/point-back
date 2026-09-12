import type { ButtonHTMLAttributes } from "react";
import { Icon } from "../icons";
export type ComponentSelectorButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & { active?: boolean };
export function ComponentSelectorButton({
  active = false,
  className = "",
  ...props
}: ComponentSelectorButtonProps) {
  return (
    <button
      aria-label="Add components"
      aria-pressed={active}
      className={`pb-select-components ${className}`}
      title="Add components"
      type="button"
      {...props}
    >
      <Icon name="component-selector" />
      <span className="pb-add-indicator" aria-hidden="true">
        <Icon name="plus" />
      </span>
    </button>
  );
}
