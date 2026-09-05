import { getThread, listThreads } from "../agent-bridge/message-client";
import type { ThreadDetail } from "../../shared/conversation.ts";

type HistoryControllerElements = {
  composer: HTMLFormElement;
  messages: HTMLElement;
  historyButton: HTMLButtonElement;
  historyPane: HTMLElement;
  closeButton: HTMLButtonElement;
  newChatButtons: HTMLButtonElement[];
};

export function createHistoryController(
  elements: HistoryControllerElements,
  options: {
    onNewChat: () => void;
    onOpenThread: (thread: ThreadDetail) => void;
    isBusy: () => boolean;
  },
) {
  const list =
    elements.historyPane.querySelector<HTMLElement>(".pb-history-list")!;
  let generation = 0;
  const setOpen = (isOpen: boolean) => {
    generation++;
    elements.historyPane.hidden = !isOpen;
    elements.messages.hidden = isOpen;
    elements.composer.hidden = isOpen;
    elements.historyButton.setAttribute("aria-expanded", String(isOpen));
  };
  elements.historyButton.addEventListener("click", async () => {
    if (options.isBusy()) return;
    setOpen(!!elements.historyPane.hidden);
    if (elements.historyPane.hidden) return;
    const current = generation;
    list.textContent = "Loading conversations…";
    try {
      const threads = await listThreads();
      if (current !== generation) return;
      list.replaceChildren();
      if (!threads.length)
        list.textContent = "No saved conversations for this repository.";
      for (const thread of threads) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "pb-history-thread";
        button.textContent = thread.title;
        button.title = new Date(thread.updatedAt).toLocaleString();
        button.addEventListener("click", async () => {
          button.disabled = true;
          try {
            const detail = await getThread(thread.id);
            if (current !== generation || options.isBusy()) return;
            options.onOpenThread(detail);
            setOpen(false);
          } catch (error) {
            if (current === generation)
              list.textContent =
                error instanceof Error
                  ? error.message
                  : "Could not load conversation.";
          } finally {
            button.disabled = false;
          }
        });
        list.append(button);
      }
    } catch (error) {
      if (current === generation)
        list.textContent =
          error instanceof Error ? error.message : "Could not load history.";
    }
  });
  elements.closeButton.addEventListener("click", () => setOpen(false));
  for (const button of elements.newChatButtons)
    button.addEventListener("click", () => {
      if (options.isBusy()) return;
      setOpen(false);
      options.onNewChat();
    });
  return { close: () => setOpen(false) };
}
