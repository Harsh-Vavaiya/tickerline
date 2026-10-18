import { describe, expect, it } from 'vitest';
import '../extension/strip.js';

const R = globalThis.MeetStrip;

describe('MeetStrip.normalize', () => {
  it('fills every field from DEFAULTS when given nothing', () => {
    expect(R.normalize(undefined)).toEqual(R.DEFAULTS);
    expect(R.normalize(null)).toEqual(R.DEFAULTS);
    expect(R.normalize('not an object')).toEqual(R.DEFAULTS);
  });

  it('coerces enabled to a boolean, defaulting to true', () => {
    expect(R.normalize({}).enabled).toBe(true);
    expect(R.normalize({ enabled: false }).enabled).toBe(false);
    expect(R.normalize({ enabled: 0 }).enabled).toBe(false);
    expect(R.normalize({ enabled: 'yes' }).enabled).toBe(true);
  });

  it('keeps valid 6-digit hex colors and rejects everything else', () => {
    expect(R.normalize({ color: '#123ABC' }).color).toBe('#123ABC');
    expect(R.normalize({ color: 'red' }).color).toBe(R.DEFAULTS.color);
    expect(R.normalize({ color: '#12' }).color).toBe(R.DEFAULTS.color);
    expect(R.normalize({ color: 'javascript:alert(1)' }).color).toBe(R.DEFAULTS.color);
    expect(R.normalize({ textColor: 123 }).textColor).toBe(R.DEFAULTS.textColor);
  });

  it('clamps opacity to [0.1, 1]', () => {
    expect(R.normalize({ opacity: 5 }).opacity).toBe(1);
    expect(R.normalize({ opacity: -5 }).opacity).toBe(0.1);
    expect(R.normalize({ opacity: 'nope' }).opacity).toBe(0.1);
    expect(R.normalize({ opacity: 0.5 }).opacity).toBe(0.5);
  });

  it('only accepts known panel shapes, fills and typefaces', () => {
    expect(R.normalize({ top: { shape: 'full' } }).top.shape).toBe('full');
    expect(R.normalize({ top: { shape: 'hexagon' } }).top.shape).toBe(R.DEFAULTS.top.shape);
    expect(R.normalize({ top: { fill: 'none' } }).top.fill).toBe('none');
    expect(R.normalize({ top: { fill: 'plasma' } }).top.fill).toBe(R.DEFAULTS.top.fill);
    expect(R.normalize({ top: { font: 'mono' } }).top.font).toBe('mono');
    expect(R.normalize({ top: { font: 'comic' } }).top.font).toBe(R.DEFAULTS.top.font);
  });

  it('clamps type settings', () => {
    expect(R.normalize({ top: { weight: 9999 } }).top.weight).toBe(900);
    expect(R.normalize({ top: { weight: 1 } }).top.weight).toBe(100);
    expect(R.normalize({ top: { tracking: 99 } }).top.tracking).toBe(0.4);
    expect(R.normalize({ top: { tracking: -99 } }).top.tracking).toBe(-0.05);
  });

  it('keeps an accent colour, rejecting anything that is not a hex', () => {
    expect(R.normalize({ accent: '#ABCDEF' }).accent).toBe('#ABCDEF');
    expect(R.normalize({ accent: 'orange' }).accent).toBe(R.DEFAULTS.accent);
  });

  it('only accepts known motion modes', () => {
    expect(R.normalize({ bottom: { mode: 'scroll' } }).bottom.mode).toBe('scroll');
    expect(R.normalize({ bottom: { mode: 'rotate' } }).bottom.mode).toBe('rotate');
    expect(R.normalize({ bottom: { mode: 'spin' } }).bottom.mode).toBe(R.DEFAULTS.bottom.mode);
    expect(R.normalize({ bottom: { mode: 42 } }).bottom.mode).toBe(R.DEFAULTS.bottom.mode);
  });

  it('clamps bar geometry into sane ranges', () => {
    const cfg = R.normalize({ top: { xPct: -40, yPct: 400, widthPct: 1, heightPct: 99 } });
    expect(cfg.top.xPct).toBe(0);
    expect(cfg.top.yPct).toBe(100);
    expect(cfg.top.widthPct).toBe(10);
    expect(cfg.top.heightPct).toBe(40);
  });

  it('clamps scroll speed and rotate seconds', () => {
    expect(R.normalize({ bottom: { speed: 1 } }).bottom.speed).toBe(10);
    expect(R.normalize({ bottom: { speed: 9999 } }).bottom.speed).toBe(400);
    expect(R.normalize({ bottom: { seconds: 0 } }).bottom.seconds).toBe(1.5);
    expect(R.normalize({ bottom: { seconds: 999 } }).bottom.seconds).toBe(30);
  });

  it('sanitises items: trims, truncates, drops empties, caps at 8', () => {
    const cfg = R.normalize({
      bottom: { items: ['  hi  ', '', '   ', 'x'.repeat(400), 1, 2, 3, 4, 5, 6, 7, 8, 9] },
    });
    expect(cfg.bottom.items[0]).toBe('hi');
    expect(cfg.bottom.items).not.toContain('');
    expect(cfg.bottom.items.every((s) => s.length <= 120)).toBe(true);
    expect(cfg.bottom.items.length).toBeLessThanOrEqual(8);
  });

  it('falls back to default items only when the config never mentioned them', () => {
    expect(R.normalize({ bottom: {} }).bottom.items).toEqual([...R.DEFAULTS.bottom.items]);
    expect(R.normalize({ bottom: { items: 'nope' } }).bottom.items).toEqual([...R.DEFAULTS.bottom.items]);
  });

  it('keeps an explicitly cleared list empty, so a logo can stand alone', () => {
    expect(R.normalize({ top: { items: [] } }).top.items).toEqual([]);
    expect(R.normalize({ top: { items: ['', '  '] } }).top.items).toEqual([]);
    // the older shape stored the top bar as a single text field
    expect(R.normalize({ top: { text: '' } }).top.items).toEqual([]);
    expect(R.normalize({ top: { text: '   ' } }).top.items).toEqual([]);
  });

  it('migrates the older top.text / bottom.segments / global heightPct shape', () => {
    const cfg = R.normalize({
      heightPct: 20,
      top: { enabled: true, text: 'Acme Corp' },
      bottom: { enabled: true, segments: ['a', 'b'], seconds: 6 },
    });
    expect(cfg.top.items).toEqual(['Acme Corp']);
    expect(cfg.bottom.items).toEqual(['a', 'b']);
    expect(cfg.top.heightPct).toBe(20);
    expect(cfg.bottom.heightPct).toBe(20);
    expect(cfg.bottom.seconds).toBe(6);
  });

  it('never throws on a hostile/malformed config object', () => {
    expect(() => R.normalize({ top: 'nope', bottom: 42, color: {}, opacity: {} })).not.toThrow();
  });
});

describe('MeetStrip.barRect', () => {
  it('maps percentages onto the frame', () => {
    const bar = R.normalize({
      top: { shape: 'full', xPct: 10, yPct: 50, widthPct: 50, heightPct: 10 },
    }).top;
    expect(R.barRect(bar, 1000, 1000)).toEqual({ x: 100, y: 500, w: 500, h: 100 });
  });

  it('insets a pill so it reads as a floating object, not a cropped bar', () => {
    const base = { xPct: 0, yPct: 50, widthPct: 100, heightPct: 10 };
    const full = R.barRect(R.normalize({ top: { ...base, shape: 'full' } }).top, 1000, 1000);
    const pill = R.barRect(R.normalize({ top: { ...base, shape: 'pill' } }).top, 1000, 1000);
    expect(pill.x).toBeGreaterThan(full.x);
    expect(pill.w).toBeLessThan(full.w);
    // still centred
    expect(pill.x - full.x).toBeCloseTo(full.x + full.w - (pill.x + pill.w), 5);
  });

  it('keeps the bar inside the frame', () => {
    const bar = R.normalize({
      top: { shape: 'full', xPct: 100, yPct: 100, widthPct: 50, heightPct: 20 },
    }).top;
    const r = R.barRect(bar, 1000, 1000);
    expect(r.x + r.w).toBeLessThanOrEqual(1000);
    expect(r.y + r.h).toBeLessThanOrEqual(1000);
  });
});

describe('MeetStrip.draw', () => {
  // Panels are paths now (rounded pills, gradients), not plain fillRects, so the
  // fake context has to understand paths and gradients.
  function makeCtx() {
    const calls = [];
    let alpha = 1;
    return {
      calls,
      save: () => calls.push('save'),
      restore: () => calls.push('restore'),
      beginPath: () => {},
      rect: () => {},
      clip: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arcTo: () => {},
      arc: () => {},
      closePath: () => {},
      stroke: () => {},
      setLineDash: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      fill: (...a) => calls.push(['fill', ...a, { alpha }]),
      fillRect: (...a) => calls.push(['fillRect', ...a, { alpha }]),
      fillText: (...a) => calls.push(['fillText', ...a, { alpha }]),
      drawImage: (...a) => calls.push(['drawImage', ...a]),
      measureText: (text) => ({ width: text.length * 8 }),
      set fillStyle(v) {},
      set strokeStyle(v) {},
      set lineWidth(v) {},
      set globalAlpha(v) {
        alpha = v;
      },
      set font(v) {},
      set textBaseline(v) {},
      set textAlign(v) {},
      set shadowColor(v) {},
      set shadowBlur(v) {},
      set shadowOffsetY(v) {},
    };
  }

  const texts = (ctx) => ctx.calls.filter((c) => Array.isArray(c) && c[0] === 'fillText');
  // a drawn panel is a path fill; glass hairlines and accent rules are fillRects
  const rects = (ctx) => ctx.calls.filter((c) => Array.isArray(c) && (c[0] === 'fill' || c[0] === 'fillRect'));

  it('does nothing when disabled', () => {
    const ctx = makeCtx();
    R.draw(ctx, 640, 360, R.normalize({ enabled: false }), null, 0);
    expect(ctx.calls).toEqual([]);
  });

  it('draws both bars when both are enabled', () => {
    const ctx = makeCtx();
    R.draw(ctx, 640, 360, R.normalize({}), null, 0);
    expect(rects(ctx).length).toBeGreaterThanOrEqual(2);
    expect(texts(ctx).length).toBeGreaterThan(0);
  });

  it('skips a bar that is turned off', () => {
    const ctx = makeCtx();
    const cfg = R.normalize({ top: { enabled: false }, bottom: { enabled: false } });
    R.draw(ctx, 640, 360, cfg, null, 0);
    expect(rects(ctx)).toHaveLength(0);
  });

  it('always draws text at full opacity (no fade between items)', () => {
    const ctx = makeCtx();
    const cfg = R.normalize({ bottom: { mode: 'rotate', items: ['a', 'b', 'c'], seconds: 4 } });
    for (let t = 0; t <= 12000; t += 50) {
      ctx.calls.length = 0;
      R.draw(ctx, 640, 360, cfg, null, t);
      for (const call of texts(ctx)) expect(call.at(-1).alpha).toBe(1);
    }
  });

  it('rotate mode cycles through items over time', () => {
    const cfg = R.normalize({
      top: { enabled: false },
      bottom: { mode: 'rotate', items: ['one', 'two'], seconds: 4 },
    });
    const at = (t) => {
      const ctx = makeCtx();
      R.draw(ctx, 640, 360, cfg, null, t);
      return texts(ctx)[0][1];
    };
    expect(at(0)).toBe('one');
    expect(at(4500)).toBe('two');
    expect(at(8500)).toBe('one');
  });

  it('scroll mode moves the text left at a steady speed', () => {
    const speed = 100; // px per second
    const cfg = R.normalize({
      top: { enabled: false },
      bottom: { mode: 'scroll', items: ['hello'], speed },
    });
    const leftmostAt = (t) => {
      const ctx = makeCtx();
      R.draw(ctx, 640, 360, cfg, null, t);
      return Math.min(...texts(ctx).map((c) => c[2]));
    };
    // The marquee tiles itself and wraps, so no single copy moves monotonically:
    // when a wrap makes room for another copy, every position shifts by one tile
    // width. What must hold is a steady leftward velocity, modulo that width.
    const tile = 'hello   ·   '.length * 8; // the fake measureText is 8px per char
    const shiftOver = (ms) => {
      const moved = (leftmostAt(0) - leftmostAt(ms)) % tile;
      return ((moved % tile) + tile) % tile;
    };
    expect(shiftOver(200)).toBeCloseTo((speed * 200) / 1000, 5);
    expect(shiftOver(500)).toBeCloseTo((speed * 500) / 1000, 5);
  });

  it('scroll mode keeps the bar covered as it wraps around', () => {
    const cfg = R.normalize({
      top: { enabled: false },
      bottom: { mode: 'scroll', items: ['abc'], speed: 150, widthPct: 100 },
    });
    for (let t = 0; t <= 5000; t += 37) {
      const ctx = makeCtx();
      R.draw(ctx, 640, 360, cfg, null, t);
      expect(texts(ctx).length).toBeGreaterThan(0);
    }
  });

  const fakeLogo = { width: 200, height: 100 };
  const images = (ctx) => ctx.calls.filter((c) => Array.isArray(c) && c[0] === 'drawImage');

  it('draws the logo in the top bar in static mode', () => {
    const ctx = makeCtx();
    const cfg = R.normalize({ top: { mode: 'static', items: ['Acme'] } });
    R.draw(ctx, 640, 360, cfg, fakeLogo, 0);
    expect(images(ctx)).toHaveLength(1);
  });

  it('draws the logo in the top bar in scroll mode too', () => {
    const ctx = makeCtx();
    const cfg = R.normalize({ top: { mode: 'scroll', items: ['Acme'] } });
    R.draw(ctx, 640, 360, cfg, fakeLogo, 0);
    expect(images(ctx)).toHaveLength(1);
    // the marquee still runs in the space left over next to the logo
    expect(texts(ctx).length).toBeGreaterThan(0);
  });

  it('draws the logo in rotate mode', () => {
    const ctx = makeCtx();
    const cfg = R.normalize({ top: { mode: 'rotate', items: ['a', 'b'] } });
    R.draw(ctx, 640, 360, cfg, fakeLogo, 0);
    expect(images(ctx)).toHaveLength(1);
  });

  it('never puts the logo on the bottom bar', () => {
    const ctx = makeCtx();
    const cfg = R.normalize({ top: { enabled: false }, bottom: { enabled: true } });
    R.draw(ctx, 640, 360, cfg, fakeLogo, 0);
    expect(images(ctx)).toHaveLength(0);
  });

  it('keeps the logo inside the bar', () => {
    const ctx = makeCtx();
    const cfg = R.normalize({ top: { mode: 'static', heightPct: 10, widthPct: 100 } });
    R.draw(ctx, 640, 360, cfg, fakeLogo, 0);
    const [, , x, y, w, h] = images(ctx)[0];
    const r = R.barRect(cfg.top, 640, 360);
    expect(x).toBeGreaterThanOrEqual(r.x);
    expect(y).toBeGreaterThanOrEqual(r.y - 0.01);
    expect(x + w).toBeLessThanOrEqual(r.x + r.w + 0.01);
    expect(y + h).toBeLessThanOrEqual(r.y + r.h + 0.01);
  });

  it('draws a logo-only bar when the text has been cleared', () => {
    for (const mode of ['static', 'rotate', 'scroll']) {
      const ctx = makeCtx();
      const cfg = R.normalize({ top: { mode, items: [] }, bottom: { enabled: false } });
      R.draw(ctx, 640, 360, cfg, fakeLogo, 0);
      expect(images(ctx), mode).toHaveLength(1);
      expect(rects(ctx).length, mode).toBeGreaterThan(0); // the bar itself still renders
      expect(texts(ctx), mode).toHaveLength(0); // and no leftover placeholder text
    }
  });

  it('centres a logo-only bar', () => {
    const ctx = makeCtx();
    const cfg = R.normalize({ top: { mode: 'static', items: [] }, bottom: { enabled: false } });
    R.draw(ctx, 640, 360, cfg, fakeLogo, 0);
    const [, , x, , w] = images(ctx)[0];
    const r = R.barRect(cfg.top, 640, 360);
    const leftGap = x - r.x;
    const rightGap = r.x + r.w - (x + w);
    expect(Math.abs(leftGap - rightGap)).toBeLessThan(1);
  });

  it('draws nothing for a bar with neither text nor logo', () => {
    const ctx = makeCtx();
    const cfg = R.normalize({ top: { items: [] }, bottom: { enabled: false } });
    R.draw(ctx, 640, 360, cfg, null, 0);
    expect(ctx.calls.filter((c) => Array.isArray(c))).toHaveLength(0);
  });

  it('is fine when no logo is supplied', () => {
    const ctx = makeCtx();
    R.draw(ctx, 640, 360, R.normalize({}), null, 0);
    expect(images(ctx)).toHaveLength(0);
  });

  it('is stable across weird frame sizes', () => {
    const ctx = makeCtx();
    const cfg = R.normalize({});
    expect(() => R.draw(ctx, 1, 1, cfg, null, 0)).not.toThrow();
    expect(() => R.draw(ctx, 4000, 3000, cfg, null, 123456)).not.toThrow();
  });
});
