/** Storage and privileged token transport stay outside React. Tokens are never read back. */
export async function loadBridgeAddress(): Promise<string> {
  const settings = await browser.storage.local.get("agentBridgeAddress");
  return typeof settings.agentBridgeAddress === "string"
    ? settings.agentBridgeAddress
    : "http://127.0.0.1:3000";
}
export async function saveBridgeSettings(address: string, token: string) {
  const url = new URL(address.trim());
  if (
    url.protocol !== "http:" ||
    !["127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.username ||
    url.password
  )
    throw new Error("Use http://127.0.0.1:3000 or another loopback port.");
  if (token.trim()) {
    const response = await browser.runtime.sendMessage({
      type: "pointback:save-token",
      token: token.trim(),
    });
    if (!response?.ok)
      throw new Error(response?.error || "Could not save token.");
  }
  await browser.storage.local.set({ agentBridgeAddress: url.origin });
  return url.origin;
}
