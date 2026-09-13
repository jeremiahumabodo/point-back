import type { CSSProperties, ReactNode } from "react";

export function SelectionOverlay({
  mode = null,
  onCancel,
  tooltip,
  details,
  detailsStyle,
}: {
  mode?: "initial" | "add" | "replace" | "link" | null;
  onCancel?: () => void;
  tooltip?: { text: string; left: number; top: number } | null;
  details?: ReactNode;
  detailsStyle?: CSSProperties;
}) {
  return (
    <>
      <div
        className={`pb-selection-hint${mode === "link" ? " pb-cursor-hint" : ""}`}
        hidden={!mode}
      >
        <span className="pb-selection-instruction">
          {mode === "link"
            ? "Point to Component"
            : mode === "replace"
              ? "Click a component to replace the selected tag."
              : mode === "add"
                ? "Click a component, or drag to add multiple components."
                : "Click a component, or drag to select multiple."}
        </span>
        <button
          className="pb-cancel-selection"
          type="button"
          title="Cancel selection"
          hidden={mode === "link"}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
      <div className="pb-lasso" hidden />
      <div className="pb-selected-highlights" />
      <div className="pb-replacement-highlights" />
      <div className="pb-deictic-target-highlights" />
      <div
        className="pb-deictic-tooltip"
        role="tooltip"
        hidden={!tooltip}
        style={tooltip ? { left: tooltip.left, top: tooltip.top } : undefined}
      >
        {tooltip?.text}
      </div>
      <div
        className="pb-component-details-popover"
        role="tooltip"
        hidden={!details}
        style={detailsStyle}
      >
        {details}
      </div>
    </>
  );
}
export function Highlights({
  rectangles,
  className,
}: {
  rectangles: readonly CSSProperties[];
  className: string;
}) {
  return (
    <>
      {rectangles.map((style, index) => (
        <div key={index} className={className} style={style} />
      ))}
    </>
  );
}
export function ComponentDetails({
  attributes,
}: {
  attributes: readonly (readonly [string, string])[];
}) {
  return (
    <>
      <strong className="pb-component-details-title">
        Resolved attributes
      </strong>
      <dl className="pb-component-details-list">
        {attributes.map(([name, value]) => (
          <div key={name}>
            <dt>{name}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
