type SettingsControllerElements = {
  composer: HTMLFormElement;
  messages: HTMLElement;
  settingsButton: HTMLButtonElement;
  settingsPane: HTMLElement;
  settingsForm: HTMLFormElement;
  closeButton: HTMLButtonElement;
  cancelButton: HTMLButtonElement;
  bridgeAddressInput: HTMLInputElement;
  bridgeTokenInput: HTMLInputElement;
};

export function createSettingsController(elements: SettingsControllerElements) {
  const status = document.createElement("p");
  status.setAttribute("role", "status");
  elements.settingsForm.append(status);
  const setOpen = (isOpen: boolean) => {
    elements.settingsPane.hidden = !isOpen;
    elements.messages.hidden = isOpen;
    elements.composer.hidden = isOpen;
    elements.settingsButton.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) elements.bridgeAddressInput.focus();
    else {
      elements.bridgeTokenInput.value = "";
      status.textContent = "";
    }
  };
  void browser.storage.local.get("agentBridgeAddress").then((settings) => {
    elements.bridgeAddressInput.value =
      typeof settings.agentBridgeAddress === "string"
        ? settings.agentBridgeAddress
        : "http://127.0.0.1:3000";
  });
  elements.settingsButton.addEventListener("click", () =>
    setOpen(!!elements.settingsPane.hidden),
  );
  elements.closeButton.addEventListener("click", () => setOpen(false));
  elements.cancelButton.addEventListener("click", () => setOpen(false));
  elements.settingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const url = new URL(elements.bridgeAddressInput.value.trim());
      if (
        url.protocol !== "http:" ||
        !["127.0.0.1", "[::1]"].includes(url.hostname) ||
        url.username ||
        url.password
      ) {
        throw new Error("Use http://127.0.0.1:3000 or another loopback port.");
      }
      const token = elements.bridgeTokenInput.value.trim();
      if (token) {
        const response = await browser.runtime.sendMessage({
          type: "pointback:save-token",
          token,
        });
        if (!response?.ok)
          throw new Error(response?.error || "Could not save token.");
      }
      await browser.storage.local.set({ agentBridgeAddress: url.origin });
      setOpen(false);
    } catch (error) {
      status.textContent =
        error instanceof Error ? error.message : "Could not save settings.";
    }
  });
  return { close: () => setOpen(false) };
}
