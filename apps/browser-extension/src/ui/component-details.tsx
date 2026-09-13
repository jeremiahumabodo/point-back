import { ComponentDetails } from "@pointback/ui";
import type { ComponentFootprint, SourceLocation } from "@pointback/protocol";

function formatSourceLocation(source: SourceLocation | undefined): string {
  if (!source) return "";
  if (!source.lineNumber) return source.fileName;
  const parts: Array<string | number> = [source.fileName, source.lineNumber];
  if (source.columnNumber) parts.push(source.columnNumber);
  return parts.join(":");
}

/** Present normalized evidence only; no framework internals or DOM resolution. */
export function ResolvedComponentDetails({
  footprint,
}: {
  footprint: ComponentFootprint;
}) {
  const sourceLocation = formatSourceLocation(
    footprint.react?.component.source,
  );
  const attributes: Array<[string, string]> = [
    ["tagName", `<${footprint.tagName}>`],
    ["name", footprint.name],
    ["page", `${footprint.page.origin}${footprint.page.path}`],
    ["selector", footprint.selector],
    ["DOM path", footprint.domPath.join(" > ")],
    ...(footprint.react
      ? [
          ["React component", footprint.react.component.name] as [
            string,
            string,
          ],
        ]
      : []),
    ...(sourceLocation ? [["source", sourceLocation] as [string, string]] : []),
    ...(footprint.react?.ancestry.length
      ? [
          [
            "React ancestry",
            footprint.react.ancestry
              .map((component) => component.name)
              .join(" ← "),
          ] as [string, string],
        ]
      : []),
    ...(footprint.id ? [["id", footprint.id] as [string, string]] : []),
    ...(footprint.componentName
      ? [["data-component-name", footprint.componentName] as [string, string]]
      : []),
    ...(footprint.testId
      ? [["data-testid", footprint.testId] as [string, string]]
      : []),
    ...(footprint.ariaLabel
      ? [["aria-label", footprint.ariaLabel] as [string, string]]
      : []),
    ...(footprint.role ? [["role", footprint.role] as [string, string]] : []),
    ...(footprint.textExcerpt
      ? [["text", footprint.textExcerpt] as [string, string]]
      : []),
  ];
  return <ComponentDetails attributes={attributes} />;
}
