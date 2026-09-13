import type { DeicticReference } from "./conversation-state";

type RenderedReference = Pick<
  DeicticReference,
  "id" | "term" | "start" | "end"
>;
const deicticWords = new Set(["this", "that", "these", "those", "here"]);

/** Preserve identity only when a surviving editor token matches the new text. */
export function reconcileReferences<Target = string>(
  text: string,
  previous: readonly DeicticReference<Target>[],
  rendered: readonly RenderedReference[],
  nextId: () => string,
) {
  const referencesById = new Map(
    previous.map((reference) => [reference.id, reference]),
  );
  const matchedIds = new Set<string>();
  let newestId: string | null = null;
  const references: DeicticReference<Target>[] = [];

  for (const match of text.matchAll(/[a-z]+/gi)) {
    const term = match[0].toLowerCase();
    if (!deicticWords.has(term)) continue;
    const start = match.index;
    const candidate = { term, start, end: start + match[0].length };
    const token = rendered.find(
      (reference) =>
        !matchedIds.has(reference.id) &&
        reference.term === term &&
        reference.start === candidate.start &&
        reference.end === candidate.end,
    );
    const existing = token ? referencesById.get(token.id) : undefined;
    if (existing && token) {
      matchedIds.add(token.id);
      references.push({ ...existing, ...candidate });
    } else {
      newestId = nextId();
      references.push({ ...candidate, id: newestId, targets: [] });
    }
  }

  const removed = previous.filter((reference) => !matchedIds.has(reference.id));
  const retainedTargets = new Set(
    references.flatMap((reference) => reference.targets),
  );
  const releasedTargets = new Set(
    removed
      .flatMap((reference) => reference.targets)
      .filter((target) => !retainedTargets.has(target)),
  );
  return { references, newestId, releasedTargets, removed: removed.length > 0 };
}
