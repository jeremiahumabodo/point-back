import type { ButtonHTMLAttributes } from "react";
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
      <svg aria-hidden="true" viewBox="0 0 16 16">
        <rect x="2" y="2" width="12" height="12" rx="1" />
        <path d="m7 6 3 3-1.5.25L8 11z" />
      </svg>
      <span className="pb-add-indicator" aria-hidden="true">
        +
      </span>
    </button>
  );
}
