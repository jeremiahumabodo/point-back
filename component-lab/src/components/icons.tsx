import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "back-arrow"
  | "close"
  | "component-selector"
  | "component-selector-badge"
  | "component-remove-badge"
  | "history"
  | "minus"
  | "new-chat"
  | "plus"
  | "reference"
  | "send"
  | "settings"
  | "sun"
  | "moon";

type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  name: IconName;
};

const viewBoxes: Record<IconName, string> = {
  "back-arrow": "0 0 16 16",
  close: "0 0 16 16",
  "component-selector": "0 0 16 16",
  "component-selector-badge": "0 0 12 12",
  "component-remove-badge": "0 0 12 12",
  history: "0 0 16 16",
  "new-chat": "0 0 16 16",
  plus: "0 0 16 16",
  reference: "0 0 16 16",
  send: "0 0 16 16",
  settings: "0 0 16 16",
  sun: "0 0 16 16",
  moon: "0 0 16 16",
  minus: "0 0 8 8",
};

function iconContent(name: IconName): ReactNode {
  switch (name) {
    case "back-arrow":
    case "send":
      return <path d="M8 13V3M4.5 6.5 8 3l3.5 3.5" />;
    case "close":
      return <path d="m4 4 8 8M12 4l-8 8" />;
    case "component-selector":
      return (
        <>
          <rect x="2" y="2" width="12" height="12" rx="1" />
          <path d="m7 6 3 3-1.5.25L8 11z" />
        </>
      );
    case "component-selector-badge":
      return (
        <>
          <circle className="pb-add-indicator-circle" cx="6" cy="6" r="5.5" />
          <path className="pb-add-indicator-plus" d="M6 3v6M3 6h6" />
        </>
      );
    case "component-remove-badge":
      return (
        <>
          <circle className="pb-remove-indicator-circle" cx="6" cy="6" r="5.5" />
          <path className="pb-remove-indicator-minus" d="M3 6h6" />
        </>
      );
    case "history":
      return (
        <>
          <path d="M2.5 3.5v3h3" />
          <path d="M3 7a5.5 5.5 0 1 0 1.1-3.3L2.5 5" />
          <path d="M8 4.5V8l2.5 1.5" />
        </>
      );
    case "new-chat":
      return (
        <>
          <path d="m10.8 2.2 3 3-7.6 7.6-3.8.8.8-3.8 7.6-7.6ZM9.2 3.8l3 3M2.5 2.5v3M1 4h3" />
        </>
      );
    case "plus":
      return <path d="M8 3v10M3 8h10" />;
    case "reference":
      return (
        <path d="m6.4 9.6 3.2-3.2M5.1 11.9l-1 1a2.5 2.5 0 0 1-3.5-3.5l3-3a2.5 2.5 0 0 1 3.5 0M10.9 4.1l1-1a2.5 2.5 0 0 1 3.5 3.5l-3 3a2.5 2.5 0 0 1-3.5 0" />
      );
    case "settings":
      return (
        <>
          <path d="M6.7 1.2h2.6l.4 1.6c.4.2.8.4 1.1.7l1.6-.5 1.3 2.3-1.2 1.1c.1.4.1.8 0 1.3l1.2 1.1-1.3 2.3-1.6-.5c-.3.3-.7.5-1.1.7l-.4 1.6H6.7l-.4-1.6c-.4-.2-.8-.4-1.1-.7l-1.6.5-1.3-2.3 1.2-1.1a4.5 4.5 0 0 1 0-1.3L2.3 5.3 3.6 3l1.6.5c.3-.3.7-.5 1.1-.7l.4-1.6Z" />
          <circle cx="8" cy="7" r="2" />
        </>
      );
    case "sun":
      return (
        <>
          <circle cx="8" cy="8" r="2.5" />
          <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M12.6 3.4l-1 1M4.4 11.6l-1 1" />
        </>
      );
    case "moon":
      return <path d="M10.8 2.2a5.6 5.6 0 1 0 3 10.1A5.8 5.8 0 0 1 10.8 2.2Z" />;
    case "minus":
      return <path d="M1 4h6" />;
  }
}

export function Icon({ name, ...props }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox={viewBoxes[name]} {...props}>
      {iconContent(name)}
    </svg>
  );
}