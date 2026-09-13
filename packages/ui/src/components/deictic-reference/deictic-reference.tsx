import type { HTMLAttributes } from "react";
import { referenceClassName } from "./reference-class-name";
export type DeicticReferenceProps = HTMLAttributes<HTMLSpanElement> & {
  term: string;
  active?: boolean;
  linked?: boolean;
};
export function DeicticReference({
  term,
  active = false,
  linked = false,
  className = "",
  ...props
}: DeicticReferenceProps) {
  return (
    <span
      className={`${referenceClassName(active, linked)} ${className}`}
      title={
        linked
          ? "Hover to highlight linked component(s)"
          : `Point to a component to link “${term}”.`
      }
      {...props}
    >
      {term}
    </span>
  );
}
