import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeChromeMock } from './helpers/chromeMock.js';

const KEY = 'meetStripCfg';

async function loadBackground(chrome) {
  vi.stubGlobal('chrome', chrome);
  vi.resetModules();
  await import('../extension/background.js');
}

describe('background.js toggle-strip command', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('turns the strip off when it was on (default/unset = on)', async () => {
    const chrome = makeChromeMock({});
    await loadBackground(chrome);
    chrome.__fireCommand('toggle-strip');
    await Promise.resolve();
    await Promise.resolve();
    expect(chrome.__store[KEY].enabled).toBe(false);
  });

  it('turns the strip back on when it was off', async () => {
    const chrome = makeChromeMock({ [KEY]: { enabled: false, color: '#111111' } });
    await loadBackground(chrome);
    chrome.__fireCommand('toggle-strip');
    await Promise.resolve();
    await Promise.resolve();
    expect(chrome.__store[KEY].enabled).toBe(true);
    expect(chrome.__store[KEY].color).toBe('#111111'); // other fields preserved
  });

  it('ignores commands other than toggle-strip', async () => {
    const chrome = makeChromeMock({});
    await loadBackground(chrome);
    chrome.__fireCommand('some-other-command');
    await Promise.resolve();
    expect(chrome.__store[KEY]).toBeUndefined();
  });
});
