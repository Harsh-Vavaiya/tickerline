// Minimal mock of the chrome.* APIs the extension touches, enough to drive
// background.js / bridge.js / popup.js logic under Vitest + jsdom.
export function makeChromeMock(initialStore = {}) {
  const store = { ...initialStore };
  const onChangedListeners = [];
  const onCommandListeners = [];

  const chrome = {
    storage: {
      local: {
        async get(key) {
          if (typeof key === 'string') return { [key]: store[key] };
          if (Array.isArray(key)) {
            const out = {};
            for (const k of key) out[k] = store[k];
            return out;
          }
          return { ...store };
        },
        async set(obj) {
          const changes = {};
          for (const [k, v] of Object.entries(obj)) {
            changes[k] = { oldValue: store[k], newValue: v };
            store[k] = v;
          }
          for (const fn of onChangedListeners) fn(changes, 'local');
        },
      },
      onChanged: {
        addListener(fn) {
          onChangedListeners.push(fn);
        },
      },
    },
    commands: {
      onCommand: {
        addListener(fn) {
          onCommandListeners.push(fn);
        },
      },
    },
    __store: store,
    __fireCommand(name) {
      for (const fn of onCommandListeners) fn(name);
    },
  };

  return chrome;
}
