// Keyboard shortcut (Alt+Shift+S by default): flip the strip on or off.
const KEY = 'meetStripCfg';

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-strip') return;
  const saved = (await chrome.storage.local.get(KEY))[KEY] || {};
  const enabled = saved.enabled === undefined ? true : !!saved.enabled;
  await chrome.storage.local.set({ [KEY]: { ...saved, enabled: !enabled } });
});
