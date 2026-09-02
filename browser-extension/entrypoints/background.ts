export default defineBackground(() => {
  browser.action.onClicked.addListener((tab) => {
    if (tab.id === undefined) return;

    void browser.tabs.sendMessage(tab.id, { type: "pointback:start-selection" }).catch(() => undefined);
  });
});
