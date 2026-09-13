/** Panel drag geometry only. Visibility and theme are React props. */
export function mountPanelBehavior(
  elements: { panel: HTMLElement; panelHeader: HTMLElement },
  signal: AbortSignal,
) {
  const { panel, panelHeader } = elements;
  let panelDrag: { offsetX: number; offsetY: number } | null = null;
  panelHeader.addEventListener(
    "pointerdown",
    (event) => {
      if (
        event.button !== 0 ||
        (event.target instanceof Element && event.target.closest("button"))
      )
        return;

      const rect = panel.getBoundingClientRect();
      panelDrag = {
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
      };
      panelHeader.setPointerCapture(event.pointerId);
      panel.classList.add("pb-panel-dragging");
    },
    { signal },
  );

  panelHeader.addEventListener(
    "pointermove",
    (event) => {
      if (!panelDrag) return;

      const width = panel.offsetWidth;
      const height = panel.offsetHeight;
      const left = Math.min(
        Math.max(0, event.clientX - panelDrag.offsetX),
        Math.max(0, window.innerWidth - width),
      );
      const top = Math.min(
        Math.max(0, event.clientY - panelDrag.offsetY),
        Math.max(0, window.innerHeight - height),
      );
      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
      panel.style.right = "auto";
      panel.style.bottom = "auto";
    },
    { signal },
  );

  function stopPanelDrag() {
    panelDrag = null;
    panel.classList.remove("pb-panel-dragging");
  }

  panelHeader.addEventListener("pointerup", stopPanelDrag, { signal });
  panelHeader.addEventListener("pointercancel", stopPanelDrag, { signal });
  signal.addEventListener("abort", stopPanelDrag, { once: true });
}
