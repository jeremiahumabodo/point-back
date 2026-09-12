import type { ButtonHTMLAttributes } from "react";
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
      <svg aria-hidden="true" viewBox="0 0 16 16">
        <path d="m6.4 9.6 3.2-3.2M5.1 11.9l-1 1a2.5 2.5 0 0 1-3.5-3.5l3-3a2.5 2.5 0 0 1 3.5 0M10.9 4.1l1-1a2.5 2.5 0 0 1 3.5 3.5l-3 3a2.5 2.5 0 0 1-3.5 0" />
      </svg>
    </button>
  );
}
