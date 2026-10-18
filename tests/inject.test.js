import { describe, expect, it } from 'vitest';
import '../extension/strip.js'; // inject.js requires window.MeetStrip to already exist

describe('inject.js on a browser without insertable-stream support (e.g. jsdom)', () => {
  it('loads without throwing and marks itself hooked instead of patching the camera', async () => {
    expect(window.__meetStripHooked).toBeFalsy();
    await expect(import('../extension/inject.js')).resolves.toBeDefined();
    expect(window.__meetStripHooked).toBe(true);
    // jsdom has no MediaStreamTrackProcessor/OffscreenCanvas/VideoFrame, so the
    // feature-detection bail-out must fire and getUserMedia must be left alone.
    expect(typeof MediaStreamTrackProcessor).not.toBe('function');
  });

  it('is idempotent: importing twice still does not throw', async () => {
    await expect(import('../extension/inject.js')).resolves.toBeDefined();
  });
});
