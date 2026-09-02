import type { HTMLAttributes } from "react";
import styles from "./deictic-reference.module.css";

export type DeicticReferenceProps = HTMLAttributes<HTMLSpanElement> & {
  term: string;
  active?: boolean;
  linked?: boolean;
};

export function DeicticReference({ term, active = false, linked = false, className, ...props }: DeicticReferenceProps) {
  return (
    <span
      className={[styles.root, active && styles.active, linked && styles.linked, className].filter(Boolean).join(" ")}
      title={linked ? "Hover to highlight linked component(s)" : "Point to a component to link this reference"}
      {...props}
    >
      {term}
    </span>
  );
}
