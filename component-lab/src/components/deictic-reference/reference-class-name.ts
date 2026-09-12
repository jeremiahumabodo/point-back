export function referenceClassName(active = false, linked = false) {
  return [
    "pb-deictic-reference",
    active && "pb-deictic-reference-active",
    linked && "pb-deictic-reference-linked",
  ]
    .filter(Boolean)
    .join(" ");
}
