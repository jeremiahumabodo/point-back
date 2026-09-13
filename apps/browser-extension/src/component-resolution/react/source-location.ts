import type { SourceLocation } from "../types";

export function getSourceLocation(value: unknown): SourceLocation | undefined {
  if (!value || typeof value !== "object") return undefined;
  const source = value as {
    fileName?: unknown;
    lineNumber?: unknown;
    columnNumber?: unknown;
  };
  if (typeof source.fileName !== "string") return undefined;
  return {
    fileName: source.fileName,
    ...(typeof source.lineNumber === "number"
      ? { lineNumber: source.lineNumber }
      : {}),
    ...(typeof source.columnNumber === "number"
      ? { columnNumber: source.columnNumber }
      : {}),
  };
}
