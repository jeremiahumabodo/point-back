import { createElement } from "react";
import { HistoryList } from "../../component-lab/src/components/conversation-panes/conversation-panes";
import { getThread, listThreads } from "../agent-bridge/message-client";
import type { ThreadDetail } from "../../shared/conversation.ts";
import type { ReactSlots } from "../ui/react-slots";

type HistoryControllerElements = {
  composer: HTMLFormElement;
  messages: HTMLElement;
  historyButton: HTMLButtonElement;
  historyPane: HTMLElement;
  closeButton: HTMLButtonElement;
  newChatButtons: HTMLButtonElement[];
};

export function createHistoryController(
  slots: ReactSlots,
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
    slots.render(list, "Loading conversations…");
    try {
      const threads = await listThreads();
      if (current !== generation) return;
      const render = (loadingId?: string) =>
        slots.render(
          list,
          createElement(HistoryList, {
            threads,
            loadingId,
            onOpen: (id: string) => {
              void open(id);
            },
          }),
        );
      async function open(id: string) {
        render(id);
        try {
          const detail = await getThread(id);
          if (current !== generation || options.isBusy()) return;
          options.onOpenThread(detail);
          setOpen(false);
        } catch (error) {
          if (current === generation)
            slots.render(
              list,
              error instanceof Error
                ? error.message
                : "Could not load conversation.",
            );
        }
      }
      render();
    } catch (error) {
      if (current === generation)
        slots.render(
          list,
          error instanceof Error ? error.message : "Could not load history.",
        );
    }
  });
  elements.closeButton.addEventListener("click", () => setOpen(false));
  for (const button of elements.newChatButtons)
    button.addEventListener("click", () => {
      if (options.isBusy()) return;
      setOpen(false);
      options.onNewChat();
    });
  return {
    close: () => setOpen(false),
    dispose: () => {
      generation++;
    },
  };
}
