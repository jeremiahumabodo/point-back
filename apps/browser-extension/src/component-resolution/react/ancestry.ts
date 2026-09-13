import type { ReactComponent, ReactResolution } from "../types";
import { getFiber, getComponentName, type Fiber } from "./fiber";
import { getSourceLocation } from "./source-location";

export function resolveReactComponent(
  element: Element,
): ReactResolution | undefined {
  const components: ReactComponent[] = [];
  const seen = new Set<string>();
  let fiber: Fiber | null | undefined = getFiber(element);
  // Fiber is undocumented. The isolated-world caller retains its DOM fallback.
  while (fiber) {
    const name = getComponentName(fiber);
    if (name && !seen.has(name)) {
      seen.add(name);
      components.push({
        name,
        ...(getSourceLocation(fiber._debugSource)
          ? { source: getSourceLocation(fiber._debugSource) }
          : {}),
      });
    }
    fiber = fiber.return;
  }
  if (components.length === 0) return undefined;
  const [component, ...ancestry] = components;
  return component ? { component, ancestry } : undefined;
}
