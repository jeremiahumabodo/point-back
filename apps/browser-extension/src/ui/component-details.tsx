import { ComponentDetails } from "@pointback/ui";
import type { ComponentFootprint } from "@pointback/protocol";

/** Present normalized evidence only; no framework internals or DOM resolution. */
export function ResolvedComponentDetails({
  footprint,
}: {
  footprint: ComponentFootprint;
}) {
  const source = footprint.react?.component.source;
  const sourceLocation = source
    ? `${source.fileName}${source.lineNumber ? `:${source.lineNumber}${source.columnNumber ? `:${source.columnNumber}` : ""}` : ""}`
    : undefined;
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
