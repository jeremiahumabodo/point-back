import type { ButtonHTMLAttributes, Ref } from "react";

export type ComponentTagProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  name: string;
  selected?: boolean;
  onRemove?: () => void;
  removeLabel?: string;
  chipRef?: Ref<HTMLButtonElement>;
};

export function ComponentTag({
  name,
  selected = false,
  onRemove,
  removeLabel = name,
  chipRef,
  className = "",
  disabled,
  ...props
}: ComponentTagProps) {
  return (
    <span className="pb-component-tag">
      <button
        ref={chipRef}
        aria-label={`Replace ${name}`}
        aria-pressed={selected}
        className={`pb-component-chip ${className}`}
        title={`Replace ${name}`}
        type="button"
        disabled={disabled}
        {...props}
      >
        {name}
      </button>
      {onRemove && (
        <button
          aria-label={`Remove ${removeLabel}`}
          className="pb-remove-component"
          onClick={onRemove}
          title={`Remove ${removeLabel}`}
          type="button"
          disabled={disabled}
        >
          −
        </button>
      )}
    </span>
  );
}
