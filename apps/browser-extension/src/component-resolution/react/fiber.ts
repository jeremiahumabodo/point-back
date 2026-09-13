// Private React runtime metadata. Keep these assumptions inside the resolver.
export type Fiber = {
  return?: Fiber | null;
  type?: unknown;
  elementType?: unknown;
  _debugSource?: unknown;
};

export function getFiber(element: Element): Fiber | undefined {
  const key = Object.getOwnPropertyNames(element).find(
    (property) =>
      property.startsWith("__reactFiber$") ||
      property.startsWith("__reactInternalInstance$"),
  );
  return key
    ? (element as unknown as Record<string, Fiber | undefined>)[key]
    : undefined;
}

export function getComponentName(fiber: Fiber): string | undefined {
  const type = fiber.type ?? fiber.elementType;
  if (typeof type === "string") return undefined;
  if (typeof type === "function") {
    const component = type as { displayName?: unknown; name?: unknown };
    if (typeof component.displayName === "string") return component.displayName;
    if (typeof component.name === "string") return component.name;
    return undefined;
  }
  if (type && typeof type === "object") {
    const component = type as {
      displayName?: unknown;
      render?: { displayName?: unknown; name?: unknown };
    };
    if (typeof component.displayName === "string") return component.displayName;
    if (typeof component.render?.displayName === "string")
      return component.render.displayName;
    if (typeof component.render?.name === "string")
      return component.render.name;
  }
  return undefined;
}
