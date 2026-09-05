type HistoryControllerElements = {
  composer: HTMLFormElement;
  messages: HTMLElement;
  historyButton: HTMLButtonElement;
  historyPane: HTMLElement;
  closeButton: HTMLButtonElement;
  newChatButtons: HTMLButtonElement[];
};

type HistoryControllerOptions = {
  onNewChat: () => void;
};

export function createHistoryController(
  elements: HistoryControllerElements,
  options: HistoryControllerOptions,
) {
  const setOpen = (isOpen: boolean) => {
    elements.historyPane.hidden = !isOpen;
    elements.messages.hidden = isOpen;
    elements.composer.hidden = isOpen;
    elements.historyButton.setAttribute("aria-expanded", String(isOpen));
  };

  elements.historyButton.addEventListener("click", () => setOpen(elements.historyPane.hidden));
  elements.closeButton.addEventListener("click", () => setOpen(false));
  for (const newChatButton of elements.newChatButtons) {
    newChatButton.addEventListener("click", () => {
      setOpen(false);
      options.onNewChat();
    });
  }

  return { close: () => setOpen(false) };
}
