import type { CSSProperties } from "react";

export function SelectionOverlay() {
  return (
    <>
      <div className="pb-selection-hint" hidden>
        <span className="pb-selection-instruction">
          Click a component, or drag to select multiple.
        </span>
        <button
          className="pb-cancel-selection"
          type="button"
          title="Cancel selection"
        >
          Cancel
        </button>
      </div>
      <div className="pb-lasso" hidden />
      <div className="pb-selected-highlights" />
      <div className="pb-replacement-highlight" hidden />
      <div className="pb-deictic-target-highlights" />
      <div className="pb-deictic-tooltip" role="tooltip" hidden />
      <div className="pb-component-details-popover" role="tooltip" hidden />
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
