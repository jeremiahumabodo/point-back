export type SourceLocation = {
  fileName: string;
  lineNumber?: number;
  columnNumber?: number;
};

export type ReactComponent = {
  name: string;
  source?: SourceLocation;
};

/**
 * A serializable description of the UI evidence observed by the extension.
 * It intentionally contains no React Fiber objects or live DOM references.
 */
export type ComponentFootprint = {
  name: string;
  tagName: string;
  id?: string;
  componentName?: string;
  ariaLabel?: string;
  role?: string;
  testId?: string;
  textExcerpt?: string;
  domPath: string[];
  selector: string;
  page: {
    origin: string;
    path: string;
    title?: string;
  };
  react?: {
    component: ReactComponent;
    ancestry: ReactComponent[];
  };
};

export type ReactResolution = ComponentFootprint["react"];
