import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeChromeMock } from './helpers/chromeMock.js';

const KEY = 'meetStripCfg';
const TINY_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

async function loadBridge(chrome) {
  vi.stubGlobal('chrome', chrome);
  vi.resetModules();
  await import('../extension/bridge.js');
  // bridge.js's send() is async (awaits chrome.storage.local.get); flush microtasks.
  await Promise.resolve();
  await Promise.resolve();
}

function flush() {
  return Promise.resolve().then(() => Promise.resolve());
}

describe('bridge.js', () => {
  let postMessageSpy;

  beforeEach(() => {
    postMessageSpy = vi.spyOn(window, 'postMessage');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    postMessageSpy.mockRestore();
  });

  it('sends the saved config (without the raw logo field) on load', async () => {
    const chrome = makeChromeMock({ [KEY]: { enabled: true, color: '#223344' } });
    await loadBridge(chrome);

    const call = postMessageSpy.mock.calls.find((c) => c[0] && c[0].__meetStrip === 'cfg');
    expect(call).toBeTruthy();
    expect(call[0].cfg).toEqual({ enabled: true, color: '#223344' });
    expect(call[0].logoBlob).toBeNull();
    expect(call[1]).toBe(location.origin);
  });

  it('converts a data: URL logo into a Blob with the right mime type', async () => {
    const chrome = makeChromeMock({ [KEY]: { enabled: true, logo: TINY_PNG_DATA_URL } });
    await loadBridge(chrome);

    const call = postMessageSpy.mock.calls.find((c) => c[0] && c[0].__meetStrip === 'cfg');
    expect(call[0].logoBlob).toBeInstanceOf(Blob);
    expect(call[0].logoBlob.type).toBe('image/png');
    expect(call[0].cfg.logo).toBeUndefined();
  });

  it('does not crash and sends no logoBlob when storage throws (extension reloaded mid-tab)', async () => {
    const chrome = makeChromeMock({});
    chrome.storage.local.get = vi.fn().mockRejectedValue(new Error('context invalidated'));
    await expect(loadBridge(chrome)).resolves.toBeUndefined();
    expect(postMessageSpy).not.toHaveBeenCalled();
  });

  it('ignores a malformed data: URL logo instead of throwing', async () => {
    const chrome = makeChromeMock({ [KEY]: { enabled: true, logo: 'data:image/png;base64,not-base64!!!' } });
    await loadBridge(chrome);
    const call = postMessageSpy.mock.calls.find((c) => c[0] && c[0].__meetStrip === 'cfg');
    expect(call[0].logoBlob).toBeNull();
  });

  it('re-sends the config when inject.js announces it is ready', async () => {
    const chrome = makeChromeMock({ [KEY]: { enabled: true } });
    await loadBridge(chrome);
    postMessageSpy.mockClear();

    window.dispatchEvent(new MessageEvent('message', { data: { __meetStrip: 'ready' }, origin: location.origin }));
    await flush();

    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({ __meetStrip: 'cfg' }),
      location.origin
    );
  });

  it('ignores "ready" messages from a different origin', async () => {
    const chrome = makeChromeMock({ [KEY]: { enabled: true } });
    await loadBridge(chrome);
    postMessageSpy.mockClear();

    window.dispatchEvent(new MessageEvent('message', { data: { __meetStrip: 'ready' }, origin: 'https://evil.example' }));
    await flush();

    expect(postMessageSpy).not.toHaveBeenCalled();
  });

  it('re-sends the config when storage changes', async () => {
    const chrome = makeChromeMock({ [KEY]: { enabled: true } });
    await loadBridge(chrome);
    postMessageSpy.mockClear();

    await chrome.storage.local.set({ [KEY]: { enabled: false } });
    await flush();

    const call = postMessageSpy.mock.calls.find((c) => c[0] && c[0].__meetStrip === 'cfg');
    expect(call[0].cfg.enabled).toBe(false);
  });
});
