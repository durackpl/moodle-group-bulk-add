const STORAGE_KEY = 'MGAEnabled';

async function getEnabled() {
  const result = await browser.storage.local.get({ [STORAGE_KEY]: false });
  return Boolean(result[STORAGE_KEY]);
}

async function setEnabled(value) {
  await browser.storage.local.set({ [STORAGE_KEY]: value });
}

browser.browserAction.onClicked.addListener(async (tab) => {
  const enabled = !(await getEnabled());
  await setEnabled(enabled);

  // Ask the current tab to redraw the overlay immediately.
  if (tab && tab.id != null) {
    try {
      await browser.tabs.sendMessage(tab.id, { type: 'toggle-overlay', enabled });
    } catch (err) {
      // The page may not have the content script yet or may not match.
      console.warn('Could not send toggle message:', err);
    }
  }
});
