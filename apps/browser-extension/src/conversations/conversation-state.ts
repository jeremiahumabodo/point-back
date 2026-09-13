export function isPluralReference(reference: { term: string }) {
  return reference.term === "these" || reference.term === "those";
}

/** Application drafts use opaque string handles; reconciliation is target-agnostic. */
export type DeicticReference<Target = string> = {
  id: string;
  term: string;
  start: number;
  end: number;
  targets: Target[];
};
