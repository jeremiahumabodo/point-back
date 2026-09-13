import type { SendRequest } from "@pointback/protocol";

export function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
const text = (v: unknown, max = 4096): v is string =>
  typeof v === "string" && v.length <= max;
export const uuid = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const position = (v: unknown): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0;

function component(v: unknown): boolean {
  return (
    record(v) &&
    text(v.name, 512) &&
    (v.source === undefined ||
      (record(v.source) &&
        text(v.source.fileName) &&
        (v.source.lineNumber === undefined || position(v.source.lineNumber)) &&
        (v.source.columnNumber === undefined ||
          position(v.source.columnNumber))))
  );
}
function footprint(v: unknown): boolean {
  if (
    !record(v) ||
    !text(v.name, 512) ||
    !text(v.tagName, 128) ||
    !text(v.selector, 8192) ||
    !Array.isArray(v.domPath) ||
    v.domPath.length > 12 ||
    !v.domPath.every((p) => text(p, 1024)) ||
    !record(v.page) ||
    !text(v.page.origin, 2048) ||
    !text(v.page.path)
  )
    return false;
  if (
    ![
      v.id,
      v.componentName,
      v.ariaLabel,
      v.role,
      v.testId,
      v.textExcerpt,
      v.page.title,
    ].every((p) => p === undefined || text(p, 10000))
  )
    return false;
  return (
    v.react === undefined ||
    (record(v.react) &&
      component(v.react.component) &&
      Array.isArray(v.react.ancestry) &&
      v.react.ancestry.length <= 50 &&
      v.react.ancestry.every(component))
  );
}
export function validSend(v: unknown): v is SendRequest {
  if (
    !record(v) ||
    !uuid(v.requestId) ||
    (v.threadId !== undefined && !uuid(v.threadId)) ||
    !record(v.message) ||
    !text(v.message.content, 20000) ||
    !v.message.content.trim() ||
    !Array.isArray(v.message.references) ||
    v.message.references.length > 50 ||
    !record(v.context) ||
    !Array.isArray(v.context.selectedComponents) ||
    v.context.selectedComponents.length > 50 ||
    !v.context.selectedComponents.every(footprint)
  )
    return false;
  const content = v.message.content;
  let previousEnd = 0;
  return v.message.references.every((r) => {
    if (
      !record(r) ||
      !text(r.id, 256) ||
      !text(r.term, 1024) ||
      !position(r.start) ||
      !position(r.end) ||
      r.start < previousEnd ||
      r.end <= r.start ||
      r.end > content.length ||
      content.slice(r.start, r.end) !== r.term ||
      !Array.isArray(r.components) ||
      r.components.length > 50 ||
      !r.components.every(footprint)
    )
      return false;
    previousEnd = r.end;
    return true;
  });
}
