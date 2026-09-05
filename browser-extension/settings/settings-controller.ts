type SettingsControllerElements = {
  composer: HTMLFormElement;
  messages: HTMLElement;
  settingsButton: HTMLButtonElement;
  settingsPane: HTMLElement;
  settingsForm: HTMLFormElement;
  closeButton: HTMLButtonElement;
  cancelButton: HTMLButtonElement;
  bridgeAddressInput: HTMLInputElement;
  projectDirectoryInput: HTMLInputElement;
};

export function createSettingsController(elements: SettingsControllerElements) {
  const setOpen = (isOpen: boolean) => {
    elements.settingsPane.hidden = !isOpen;
    elements.messages.hidden = isOpen;
    elements.composer.hidden = isOpen;
    elements.settingsButton.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) elements.bridgeAddressInput.focus();
  };

  const load = async () => {
    const settings = await browser.storage.local.get(["agentBridgeAddress", "projectDirectory"]);
    elements.bridgeAddressInput.value = settings.agentBridgeAddress ?? "";
    elements.projectDirectoryInput.value = settings.projectDirectory ?? "";
  };

  elements.settingsButton.addEventListener("click", () => setOpen(elements.settingsPane.hidden));
  elements.closeButton.addEventListener("click", () => setOpen(false));
  elements.cancelButton.addEventListener("click", () => setOpen(false));
  elements.settingsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void browser.storage.local
      .set({
        agentBridgeAddress: elements.bridgeAddressInput.value.trim(),
        projectDirectory: elements.projectDirectoryInput.value.trim(),
      })
      .then(() => setOpen(false));
  });
  void load();

  return { close: () => setOpen(false) };
}
