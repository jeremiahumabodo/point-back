import { test } from "node:test";
import assert from "node:assert/strict";
import { reconcileReferences } from "../src/conversations/reconcile-references.ts";
import { isPluralReference } from "../src/conversations/conversation-state.ts";

function ids() {
  let next = 0;
  return () => `reference-${++next}`;
}

const reference = (id, term, start, targets = []) => ({
  id,
  term,
  start,
  end: start + term.length,
  targets,
});

test("recognizes whole deictic words case-insensitively with source offsets", () => {
  const result = reconcileReferences(
    "  THIS, that; these those here thesis",
    [],
    [],
    ids(),
  );
  assert.deepEqual(
    result.references.map(({ term, start, end }) => ({ term, start, end })),
    [
      { term: "this", start: 2, end: 6 },
      { term: "that", start: 8, end: 12 },
      { term: "these", start: 14, end: 19 },
      { term: "those", start: 20, end: 25 },
      { term: "here", start: 26, end: 30 },
    ],
  );
  assert.equal(result.newestId, "reference-5");
  assert.equal(result.removed, false);
  assert.deepEqual(result.references.map(isPluralReference), [
    false,
    false,
    true,
    true,
    false,
  ]);
});

test("surviving tokens retain identity and targets when preceding text shifts", () => {
  const target = {};
  const previous = [reference("old", "this", 0, [target])];
  const rendered = [reference("old", "this", 8)];
  const result = reconcileReferences("Explain this", previous, rendered, ids());
  assert.deepEqual(result.references, [reference("old", "this", 8, [target])]);
  assert.equal(result.newestId, null);
  assert.equal(result.removed, false);
  assert.equal(
    previous[0].start,
    0,
    "reconciliation must not mutate previous state",
  );
});

test("retyped text does not inherit links from a deleted token", () => {
  const target = {};
  const result = reconcileReferences(
    "this",
    [reference("old", "this", 0, [target])],
    [],
    ids(),
  );
  assert.deepEqual(result.references, [reference("reference-1", "this", 0)]);
  assert.deepEqual([...result.releasedTargets], [target]);
  assert.equal(result.removed, true);
});

test("deleting a reference only releases targets not used by surviving tokens", () => {
  const shared = {};
  const released = {};
  const previous = [
    reference("first", "this", 0, [shared, released]),
    reference("second", "that", 5, [shared]),
  ];
  const result = reconcileReferences(
    "that",
    previous,
    [reference("second", "that", 0)],
    ids(),
  );
  assert.deepEqual(result.references, [
    reference("second", "that", 0, [shared]),
  ]);
  assert.deepEqual([...result.releasedTargets], [released]);
});

test("repeated words keep distinct identities and a new occurrence becomes active", () => {
  const nextId = ids();
  const initial = reconcileReferences("this this", [], [], nextId);
  const result = reconcileReferences(
    "this this this",
    initial.references,
    initial.references,
    nextId,
  );
  assert.deepEqual(
    result.references.map(({ id }) => id),
    ["reference-1", "reference-2", "reference-3"],
  );
  assert.equal(result.newestId, "reference-3");
  assert.equal(result.removed, false);
});

test("clearing the draft releases all targets once", () => {
  const target = {};
  const result = reconcileReferences(
    "",
    [
      reference("first", "this", 0, [target]),
      reference("second", "that", 5, [target]),
    ],
    [],
    ids(),
  );
  assert.deepEqual(result.references, []);
  assert.deepEqual([...result.releasedTargets], [target]);
  assert.equal(result.newestId, null);
});
