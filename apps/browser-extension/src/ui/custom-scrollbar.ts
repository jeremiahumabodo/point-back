export function setupCustomScrollbar(
  scrollElement: HTMLElement,
  scrollShell: HTMLElement,
  signal: AbortSignal,
) {
  const scrollbar = scrollShell.querySelector<HTMLElement>(".pb-scrollbar")!;
  const scrollbarTrack = scrollShell.querySelector<HTMLElement>(
    ".pb-scrollbar-track",
  )!;
  const scrollbarThumb = scrollShell.querySelector<HTMLElement>(
    ".pb-scrollbar-thumb",
  )!;
  let dragStart: { y: number; scrollTop: number } | null = null;
  const update = () => {
    const trackHeight = scrollbarTrack.clientHeight;
    const viewportHeight = scrollElement.clientHeight;
    const scrollHeight = scrollElement.scrollHeight;
    if (!trackHeight || !scrollHeight || scrollHeight <= viewportHeight + 1) {
      scrollShell.classList.add("pb-scrollbar-no-scroll");
      return;
    }
    scrollShell.classList.remove("pb-scrollbar-no-scroll");
    const thumbHeight = Math.max(
      18,
      (viewportHeight / scrollHeight) * trackHeight,
    );
    const maxTop = trackHeight - thumbHeight;
    const maxScrollTop = scrollHeight - viewportHeight;
    scrollbarThumb.style.height = `${thumbHeight}px`;
    scrollbarThumb.style.top = `${maxScrollTop ? (scrollElement.scrollTop / maxScrollTop) * maxTop : 0}px`;
  };
  const show = () => {
    scrollbar.classList.add("is-active");
    window.setTimeout(() => {
      if (!dragStart && !scrollShell.matches(":hover"))
        scrollbar.classList.remove("is-active");
    }, 900);
  };
  const updatePointerProximity = (event: PointerEvent) => {
    const rect = scrollShell.getBoundingClientRect();
    const nearScrollbar =
      event.clientX >= rect.right - 50 &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;
    scrollbar.classList.toggle("is-near", nearScrollbar);
  };
  const stopDrag = () => {
    dragStart = null;
    scrollbarThumb.classList.remove("is-dragging");
    show();
  };
  scrollShell.addEventListener("pointermove", updatePointerProximity, {
    signal,
  });
  scrollShell.addEventListener(
    "pointerleave",
    () => {
      scrollbar.classList.remove("is-near");
    },
    { signal },
  );
  scrollElement.addEventListener(
    "scroll",
    () => {
      update();
      show();
    },
    { signal },
  );
  scrollbarThumb.addEventListener(
    "pointerdown",
    (event) => {
      event.preventDefault();
      dragStart = { y: event.clientY, scrollTop: scrollElement.scrollTop };
      scrollbarThumb.classList.add("is-dragging");
      scrollbar.classList.add("is-active");
      scrollbarThumb.setPointerCapture(event.pointerId);
    },
    { signal },
  );
  scrollbarThumb.addEventListener(
    "pointermove",
    (event) => {
      if (!dragStart) return;
      const maxScrollTop =
        scrollElement.scrollHeight - scrollElement.clientHeight;
      const maxThumbTop =
        scrollbarTrack.clientHeight - scrollbarThumb.offsetHeight;
      if (maxThumbTop > 0)
        scrollElement.scrollTop =
          dragStart.scrollTop +
          ((event.clientY - dragStart.y) / maxThumbTop) * maxScrollTop;
    },
    { signal },
  );
  scrollbarThumb.addEventListener("pointerup", stopDrag, { signal });
  scrollbarThumb.addEventListener("pointercancel", stopDrag, { signal });
  const resizeObserver = new ResizeObserver(update);
  resizeObserver.observe(scrollElement);
  const mutationObserver = new MutationObserver(update);
  mutationObserver.observe(scrollElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  update();
  return () => {
    resizeObserver.disconnect();
    mutationObserver.disconnect();
  };
}
