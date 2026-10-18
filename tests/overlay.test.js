/*
 * Covers the self-view overlay that inject.js paints over your own tile, plus
 * the status badge that tells you whether the strip is on.
 *
 * This lives in inject.js (Meet's world) rather than bridge.js: a MAIN-world
 * content script shares the DOM just the same, and relying on strip.js being
 * injected into the isolated world too turned out to be fragile - it failed
 * with the overlay silently disabled and no error anywhere.
 *
 * inject.js guards on a non-configurable window.__meetStripHooked, so it can
 * only be imported once per environment; everything here drives that one load.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import '../extension/strip.js';

function makeCtx() {
  const calls = [];
  const target = { calls };
  return new Proxy(target, {
    get(t, p) {
      if (p === 'calls') return t.calls;
      if (p === 'measureText') return (s) => ({ width: String(s).length * 7 });
      if (p === 'createLinearGradient') return () => ({ addColorStop: () => {} });
      return (...args) => t.calls.push([p, ...args]);
    },
    set() {
      return true;
    },
  });
}

let ctx;
let rafCb;
let video;

function addSelfVideo() {
  const v = document.createElement('video');
  // isSelfView() normally detects Meet's scaleX(-1); jsdom does not resolve that
  // computed transform, so set the flag the detection would have set.
  v.dataset.meetStripSelf = '1';
  Object.defineProperty(v, 'readyState', { value: 4, configurable: true });
  v.getBoundingClientRect = () => ({
    width: 320, height: 180, top: 40, left: 60, right: 380, bottom: 220, x: 60, y: 40,
  });
  document.body.appendChild(v);
  return v;
}

function tick() {
  const cb = rafCb;
  rafCb = null;
  cb(1);
}

async function sendCfg(cfg) {
  window.dispatchEvent(
    new MessageEvent('message', {
      data: { __meetStrip: 'cfg', cfg, logoBlob: null },
      origin: location.origin,
    })
  );
  await Promise.resolve();
  await Promise.resolve();
}

const painted = (name) => ctx.calls.filter((c) => c[0] === name);
const labels = () => painted('fillText').map((c) => c[1]);

beforeEach(() => {
  ctx = makeCtx();
  if (video) video.remove();
  document.querySelectorAll('canvas').forEach((c) => c.remove());
  HTMLCanvasElement.prototype.getContext = () => ctx;
  document.elementFromPoint = () => video;
  video = addSelfVideo();
});

afterAll(() => {
  vi.useRealTimers();
});

// jsdom has none of the insertable-stream APIs, so install just enough for
// inject.js to get past its feature check and reach the overlay code.
vi.stubGlobal('MediaStreamTrackProcessor', class {});
vi.stubGlobal('MediaStreamTrackGenerator', class {});
vi.stubGlobal('VideoFrame', class {});
vi.stubGlobal('OffscreenCanvas', class {});
vi.stubGlobal('requestAnimationFrame', (cb) => {
  rafCb = cb;
  return 1;
});

await import('../extension/inject.js');

describe('self-view overlay', () => {
  it('creates an overlay canvas positioned over the self view', async () => {
    await sendCfg({ enabled: true });
    tick();

    const canvases = document.body.querySelectorAll('canvas');
    expect(canvases).toHaveLength(1);
    expect(canvases[0].style.transform).toBe('translate(60px, 40px)');
    expect(canvases[0].style.pointerEvents).toBe('none');
    expect(painted('fillRect').length).toBeGreaterThan(0);
  });

  it('marks the page so the overlay state is visible from the console', () => {
    expect(document.documentElement.dataset.tickerline).toBe('overlay');
  });

  it('un-mirrors the self view when asked, and restores it when not', async () => {
    await sendCfg({ enabled: true, unmirror: true });
    tick();
    expect(video.style.transform).toBe('scaleX(1)');

    await sendCfg({ enabled: true, unmirror: false });
    tick();
    expect(video.style.transform).toBe('');
  });

  it('hides rather than painting over a Meet panel that covers the tile', async () => {
    await sendCfg({ enabled: true });
    const panel = document.createElement('div'); // elsewhere in the page
    document.body.appendChild(panel);
    document.elementFromPoint = () => panel;
    tick();
    expect(document.body.querySelector('canvas').style.display).toBe('none');
    panel.remove();
    document.elementFromPoint = () => video;
  });

  it("still paints under Meet's own layers stacked over the tile", async () => {
    // Meet puts hover targets and labels over each tile. They are siblings of
    // the video that only meet it several levels up, and testing just the
    // video's parent rejected them, which hid the overlay entirely.
    const tile = document.createElement('div');
    const branchA = document.createElement('div');
    const branchB = document.createElement('div');
    const meetLayer = document.createElement('div');
    tile.append(branchA, branchB);
    branchB.appendChild(meetLayer);
    document.body.appendChild(tile);
    branchA.appendChild(video); // video now sits deeper than the layer on top

    await sendCfg({ enabled: true });
    document.elementFromPoint = () => meetLayer;
    tick();
    expect(document.body.querySelector('canvas').style.display).toBe('block');

    document.body.appendChild(video);
    tile.remove();
    document.elementFromPoint = () => video;
  });

  it('retires the overlay when its video goes away', async () => {
    // Meet swaps the video element when the layout changes - pinning, grid
    // changes - and an overlay left behind sits frozen at the old position.
    const second = addSelfVideo();
    await sendCfg({ enabled: true });
    tick();
    expect(document.body.querySelectorAll('canvas')).toHaveLength(2);

    second.remove(); // the old tile is gone
    tick();
    expect(document.body.querySelectorAll('canvas')).toHaveLength(1);
  });

  it('follows the tile when it moves', async () => {
    await sendCfg({ enabled: true });
    tick();
    expect(document.body.querySelector('canvas').style.transform).toBe('translate(60px, 40px)');

    video.getBoundingClientRect = () => ({
      width: 320, height: 180, top: 300, left: 900, right: 1220, bottom: 480, x: 900, y: 300,
    });
    tick();
    expect(document.body.querySelector('canvas').style.transform).toBe('translate(900px, 300px)');
  });

  it('survives a draw failure without killing the loop', async () => {
    await sendCfg({ enabled: true });
    HTMLCanvasElement.prototype.getContext = () => {
      throw new Error('context lost');
    };
    expect(() => tick()).not.toThrow();
    HTMLCanvasElement.prototype.getContext = () => ctx;
    expect(rafCb).toBeTypeOf('function'); // still scheduled
  });
});

describe('status badge', () => {
  it('stays up while the strip is off, so off is not mistaken for broken', async () => {
    await sendCfg({ enabled: false });
    tick();
    expect(labels()).toContain('Tickerline off');
    expect(document.body.querySelector('canvas').style.display).toBe('block');
  });

  it('does not nag with a badge once the strip has simply been on for a while', async () => {
    await sendCfg({ enabled: true });
    // switching on legitimately flashes the badge, so step past that window
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 10000);
    ctx.calls.length = 0;
    tick();
    expect(labels()).not.toContain('Tickerline on');
    expect(labels()).not.toContain('Tickerline off');
    vi.useRealTimers();
  });

  it('flashes "on" right after the strip is switched on, then stops', async () => {
    await sendCfg({ enabled: false });
    await sendCfg({ enabled: true }); // a real change: badge should flash
    ctx.calls.length = 0;
    tick();
    expect(labels()).toContain('Tickerline on');

    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 10000);
    ctx.calls.length = 0;
    tick();
    expect(labels()).not.toContain('Tickerline on');
    vi.useRealTimers();
  });

  it('never draws the badge into what the call sees', () => {
    // strip.js is what feeds the outgoing track; the badge must not live there
    const R = globalThis.MeetStrip;
    const plain = makeCtx();
    R.draw(plain, 640, 360, R.normalize({ enabled: true }), null, 0);
    const text = plain.calls.filter((c) => c[0] === 'fillText').map((c) => c[1]).join(' ');
    expect(text).not.toMatch(/Tickerline/);
  });
});
