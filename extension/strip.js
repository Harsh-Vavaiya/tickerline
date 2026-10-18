/*
 * Tickerline renderer (shared by the extension, its popup, the self-view overlay and the lab).
 *
 * Draws up to two news-style bars over a video frame. Each bar has:
 *   - its own position and size, as percentages of the frame
 *   - a motion mode: static, rotate (swap every `seconds`) or scroll (marquee)
 *   - a look: panel shape and fill, typeface, weight, tracking, case, shadow
 *
 * Geometry is percentage based so the same config renders identically on a
 * 1280x720 camera frame, a popup preview and a self-view overlay.
 *
 * Note on "glass": the bar is translucent and softly graded, but nothing is
 * actually blurred. A real frosted effect would mean sampling the pixels behind
 * the bar, and the self-view overlay is a transparent canvas sitting above the
 * video with no pixels to sample. Faking it the same way in both paths keeps
 * your own tile and the outgoing frame identical, which matters more.
 */
(function (root) {
  'use strict';

  // Width of the safe zone relative to frame height. 3:4 = narrowest tile we plan for.
  const SAFE_ASPECT = 3 / 4;
  const SEP = '   ·   ';
  const MODES = ['static', 'rotate', 'scroll'];
  const SHAPES = ['full', 'pill'];
  const FILLS = ['solid', 'gradient', 'glass', 'none'];

  // System faces first, so this picks up SF on macOS and Segoe UI Variable on
  // Windows 11 rather than falling back to something generic.
  const FONTS = {
    display:
      '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI Variable Display", "Segoe UI", Inter, system-ui, sans-serif',
    text: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI Variable Text", "Segoe UI", Inter, system-ui, sans-serif',
    mono: 'ui-monospace, "SF Mono", "JetBrains Mono", "Cascadia Code", Consolas, monospace',
    serif: '"New York", "Iowan Old Style", "Palatino Linotype", Georgia, serif',
  };
  const FAMILIES = Object.keys(FONTS);

  const BAR_STYLE = Object.freeze({
    shape: 'pill',
    fill: 'glass',
    font: 'display',
    weight: 600,
    tracking: 0,
    uppercase: false,
    shadow: true,
    divider: false,
  });

  const DEFAULT_TOP = Object.freeze(
    Object.assign({}, BAR_STYLE, {
      enabled: true,
      mode: 'static',
      items: Object.freeze(['Your Company']),
      xPct: 0,
      yPct: 4,
      widthPct: 100,
      heightPct: 11,
      speed: 70,
      seconds: 4,
    })
  );

  const DEFAULT_BOTTOM = Object.freeze(
    Object.assign({}, BAR_STYLE, {
      enabled: true,
      mode: 'scroll',
      items: Object.freeze(['Your Name · Your Role', '+91 00000 00000', 'yourcompany.com']),
      xPct: 0,
      yPct: 84,
      widthPct: 100,
      heightPct: 11,
      speed: 70,
      seconds: 4,
      weight: 500,
    })
  );

  const DEFAULTS = Object.freeze({
    enabled: true,
    color: '#0B0B0D',
    textColor: '#FFFFFF',
    accent: '#0A84FF',
    opacity: 0.58,
    unmirror: true,
    top: DEFAULT_TOP,
    bottom: DEFAULT_BOTTOM,
  });

  function clamp(v, lo, hi) {
    v = Number(v);
    if (!Number.isFinite(v)) return lo;
    return Math.min(hi, Math.max(lo, v));
  }

  function isHex(c) {
    return typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c);
  }

  function rgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function pick(value, list, fallback) {
    return list.indexOf(value) >= 0 ? value : fallback;
  }

  /*
   * An explicitly empty list stays empty: clearing the text is how you say
   * "logo only". The fallback is only for a config that never mentioned items.
   */
  function cleanItems(list, fallback) {
    if (!Array.isArray(list)) return fallback.slice();
    return list.map((s) => String(s).trim().slice(0, 120)).filter(Boolean).slice(0, 8);
  }

  /**
   * Accepts both the current shape and the older one (top.text + bottom.segments
   * + a single global heightPct), so saved settings survive an upgrade.
   */
  function normalizeBar(raw, defaults, legacyHeightPct) {
    const b = raw && typeof raw === 'object' ? raw : {};
    let items = b.items;
    if (!Array.isArray(items)) {
      if (Array.isArray(b.segments)) items = b.segments;
      // an empty legacy text field also means "nothing here", not "use the default"
      else if (typeof b.text === 'string') items = b.text.trim() ? [b.text] : [];
    }
    return {
      enabled: b.enabled !== undefined ? !!b.enabled : defaults.enabled,
      mode: pick(b.mode, MODES, defaults.mode),
      items: cleanItems(items, defaults.items),
      xPct: clamp(b.xPct ?? defaults.xPct, 0, 100),
      yPct: clamp(b.yPct ?? defaults.yPct, 0, 100),
      widthPct: clamp(b.widthPct ?? defaults.widthPct, 10, 100),
      heightPct: clamp(b.heightPct ?? legacyHeightPct ?? defaults.heightPct, 4, 40),
      speed: clamp(b.speed ?? defaults.speed, 10, 400),
      seconds: clamp(b.seconds ?? defaults.seconds, 1.5, 30),
      shape: pick(b.shape, SHAPES, defaults.shape),
      fill: pick(b.fill, FILLS, defaults.fill),
      font: pick(b.font, FAMILIES, defaults.font),
      weight: clamp(b.weight ?? defaults.weight, 100, 900),
      tracking: clamp(b.tracking ?? defaults.tracking, -0.05, 0.4),
      uppercase: b.uppercase !== undefined ? !!b.uppercase : defaults.uppercase,
      shadow: b.shadow !== undefined ? !!b.shadow : defaults.shadow,
      divider: b.divider !== undefined ? !!b.divider : defaults.divider,
    };
  }

  /** Fill in missing fields and sanitise values so drawing never throws. */
  function normalize(cfg) {
    const c = cfg && typeof cfg === 'object' ? cfg : {};
    return {
      enabled: c.enabled !== undefined ? !!c.enabled : DEFAULTS.enabled,
      color: isHex(c.color) ? c.color : DEFAULTS.color,
      textColor: isHex(c.textColor) ? c.textColor : DEFAULTS.textColor,
      accent: isHex(c.accent) ? c.accent : DEFAULTS.accent,
      opacity: clamp(c.opacity ?? DEFAULTS.opacity, 0.1, 1),
      unmirror: c.unmirror !== undefined ? !!c.unmirror : DEFAULTS.unmirror,
      top: normalizeBar(c.top, DEFAULT_TOP, c.heightPct),
      bottom: normalizeBar(c.bottom, DEFAULT_BOTTOM, c.heightPct),
    };
  }

  function fontFor(bar, px) {
    return `${bar.weight} ${px}px ${FONTS[bar.font]}`;
  }

  function label(bar, text) {
    return bar.uppercase ? String(text).toUpperCase() : String(text);
  }

  // Letter spacing is a recent canvas feature; ignore it where unsupported
  // rather than letting a template silently fail to apply.
  function applyType(ctx, bar, px) {
    ctx.font = fontFor(bar, px);
    if ('letterSpacing' in ctx) ctx.letterSpacing = (bar.tracking * px).toFixed(2) + 'px';
  }

  function clearType(ctx) {
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }

  const measureCache = new Map();
  function measure(ctx, bar, text, px) {
    const key = `${bar.font}|${bar.weight}|${bar.tracking}|${px}|${text}`;
    const hit = measureCache.get(key);
    if (hit !== undefined) return hit;
    applyType(ctx, bar, px);
    const w = ctx.measureText(text).width;
    if (measureCache.size > 300) measureCache.clear();
    measureCache.set(key, w);
    return w;
  }

  const fitCache = new Map();
  function fitFont(ctx, bar, text, maxW, startPx, minPx) {
    const key = `${bar.font}|${bar.weight}|${bar.tracking}|${Math.round(maxW)}|${startPx}|${text}`;
    const hit = fitCache.get(key);
    if (hit) return hit;
    let px = startPx;
    let w = measure(ctx, bar, text, px);
    while (w > maxW && px > minPx) {
      px = Math.max(minPx, Math.floor(px * 0.92));
      w = measure(ctx, bar, text, px);
    }
    const res = { px: px, width: Math.min(w, maxW) };
    if (fitCache.size > 300) fitCache.clear();
    fitCache.set(key, res);
    return res;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, r);
      return;
    }
    r = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function panelPath(ctx, bar, r) {
    if (bar.shape === 'pill') roundRect(ctx, r.x, r.y, r.w, r.h, r.h / 2);
    else roundRect(ctx, r.x, r.y, r.w, r.h, 0);
  }

  function drawPanel(ctx, bar, c, r, edge) {
    if (bar.fill === 'none') return;
    ctx.save();
    panelPath(ctx, bar, r);

    if (bar.fill === 'solid') {
      ctx.globalAlpha = c.opacity;
      ctx.fillStyle = c.color;
      ctx.fill();
    } else {
      // gradient and glass both grade top-to-bottom; glass just sits lighter
      const top = bar.fill === 'glass' ? c.opacity * 0.96 : c.opacity;
      const bottom = bar.fill === 'glass' ? c.opacity * 0.76 : c.opacity * 0.86;
      const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
      g.addColorStop(0, rgba(c.color, top));
      g.addColorStop(1, rgba(c.color, bottom));
      ctx.fillStyle = g;
      ctx.fill();
    }

    if (bar.fill === 'glass') {
      // hairline along the top edge, the way a translucent surface catches light
      ctx.save();
      ctx.clip();
      ctx.fillStyle = rgba(c.textColor, 0.16);
      ctx.fillRect(r.x, r.y, r.w, Math.max(1, Math.round(r.h * 0.022)));
      ctx.restore();
    }

    if (bar.divider) {
      ctx.save();
      ctx.clip();
      ctx.fillStyle = rgba(c.accent, 0.95);
      const lineH = Math.max(1, Math.round(r.h * 0.05));
      ctx.fillRect(r.x, edge === 'bottom' ? r.y + r.h - lineH : r.y, r.w, lineH);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawText(ctx, bar, c, text, x, cy, px) {
    ctx.save();
    applyType(ctx, bar, px);
    ctx.fillStyle = c.textColor;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    if (bar.shadow) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = Math.max(1, px * 0.18);
      ctx.shadowOffsetY = Math.max(1, px * 0.045);
    }
    ctx.fillText(text, x, cy);
    clearType(ctx);
    ctx.restore();
  }

  function drawGuides(ctx, w, h) {
    ctx.save();
    ctx.lineWidth = Math.max(1, Math.round(h / 240));
    const lines = [];
    if (w / h > 1.5) lines.push({ cw: h * 1.5, color: '#D85A30', dash: [10, 7] }); // 3:2 grid tile
    lines.push({ cw: Math.min(w, h * SAFE_ASPECT), color: '#7F77DD', dash: [3, 5] }); // portrait tile
    for (const l of lines) {
      const x0 = (w - l.cw) / 2;
      ctx.strokeStyle = l.color;
      ctx.setLineDash(l.dash);
      ctx.beginPath();
      ctx.moveTo(x0, 0);
      ctx.lineTo(x0, h);
      ctx.moveTo(x0 + l.cw, 0);
      ctx.lineTo(x0 + l.cw, h);
      ctx.stroke();
    }
    ctx.restore();
  }

  function barRect(bar, w, h) {
    const bw = (bar.widthPct / 100) * w;
    const bh = (bar.heightPct / 100) * h;
    // keep the bar inside the frame even if the saved position would push it out
    const bx = Math.min((bar.xPct / 100) * w, Math.max(0, w - bw));
    const by = Math.min((bar.yPct / 100) * h, Math.max(0, h - bh));
    const r = { x: bx, y: by, w: bw, h: bh };
    if (bar.shape === 'pill') {
      // inset a touch so a pill reads as a floating object, not a cropped bar
      const inset = Math.min(r.h * 0.18, r.w * 0.04);
      r.x += inset;
      r.w -= inset * 2;
    }
    return r;
  }

  function logoSize(logo, r, pad) {
    if (!logo || !logo.width || !logo.height) return null;
    const maxH = r.h - pad * 2;
    const maxW = (r.w - pad * 2) * 0.45;
    if (maxH <= 0 || maxW <= 0) return null;
    const lw = Math.min((logo.width * maxH) / logo.height, maxW);
    return { w: lw, h: (logo.height * lw) / logo.width };
  }

  function drawMarquee(ctx, bar, c, r, nowMs) {
    if (!bar.items.length) return; // nothing to scroll; don't chase bare separators
    const px = Math.max(9, Math.round(r.h * 0.44));
    const text = label(bar, bar.items.join(SEP) + SEP);
    const tw = measure(ctx, bar, text, px);
    if (tw < 1) return;

    // Scroll inside an inset box rather than the panel itself: clipping against a
    // pill's curve slices glyphs mid-stroke. On a straight edge, with a little
    // room to spare, the cut reads as deliberate.
    const edgeInset = bar.shape === 'pill' ? r.h * 0.42 : r.h * 0.14;
    const box = { x: r.x + edgeInset, y: r.y, w: r.w - edgeInset * 2, h: r.h };
    if (box.w < 1) return;

    const offset = ((nowMs / 1000) * bar.speed) % tw;
    ctx.save();
    ctx.beginPath();
    ctx.rect(box.x, box.y, box.w, box.h);
    ctx.clip();
    // start one full copy to the left of the box, then tile across it
    let first = box.x + box.w - offset;
    first -= Math.ceil((first - box.x) / tw) * tw;
    const cy = box.y + box.h / 2;
    for (let x = first; x < box.x + box.w; x += tw) drawText(ctx, bar, c, text, x, cy, px);
    ctx.restore();
  }

  function drawFixed(ctx, bar, c, r, nowMs, logo) {
    const pad = Math.max(2, Math.round(r.h * 0.22));
    const innerW = r.w - pad * 2;
    if (innerW <= 0) return;
    const startPx = Math.round(r.h * 0.42);
    const minPx = Math.max(9, Math.round(r.h * 0.22));
    const idx =
      bar.mode === 'rotate' && bar.items.length > 1
        ? Math.floor(nowMs / (bar.seconds * 1000)) % bar.items.length
        : 0;
    const text = bar.items.length ? label(bar, bar.items[idx] || '') : '';

    const box = logoSize(logo, r, pad);
    const lw = box ? box.w : 0;
    const lh = box ? box.h : 0;
    // only reserve the gap when the logo and text are actually side by side,
    // otherwise a logo on its own would sit off centre
    const gap = lw && text ? Math.round(pad * 0.9) : 0;
    let tw = 0;
    let px = startPx;
    if (text) {
      const fit = fitFont(ctx, bar, text, innerW - lw - gap, startPx, minPx);
      tw = fit.width;
      px = fit.px;
    }

    ctx.save();
    panelPath(ctx, bar, r);
    ctx.clip();
    let x = r.x + (r.w - (lw + gap + tw)) / 2;
    const cy = r.y + r.h / 2;
    if (lw) {
      ctx.drawImage(logo, x, cy - lh / 2, lw, lh);
      x += lw + gap;
    }
    if (text) drawText(ctx, bar, c, text, x, cy, px);
    ctx.restore();
  }

  function drawOneBar(ctx, bar, c, w, h, nowMs, logo, edge) {
    if (!bar.enabled) return;
    const hasLogo = !!(logo && logo.width && logo.height);
    // a bar with only a logo is valid; a bar with neither is not
    if (!bar.items.length && !hasLogo) return;
    const r = barRect(bar, w, h);
    if (r.w < 1 || r.h < 1) return;
    drawPanel(ctx, bar, c, r, edge);

    if (bar.mode !== 'scroll') {
      drawFixed(ctx, bar, c, r, nowMs, logo);
      return;
    }

    // A marquee can't centre a logo with the text, so pin it to the left of the
    // bar and scroll the items through whatever width is left.
    const pad = Math.max(2, Math.round(r.h * 0.22));
    const box = logoSize(logo, r, pad);
    if (!box) {
      drawMarquee(ctx, bar, c, r, nowMs);
      return;
    }
    ctx.save();
    panelPath(ctx, bar, r);
    ctx.clip();
    ctx.drawImage(logo, r.x + pad, r.y + (r.h - box.h) / 2, box.w, box.h);
    ctx.restore();
    const used = pad + box.w + pad;
    if (r.w - used > 1) drawMarquee(ctx, bar, c, { x: r.x + used, y: r.y, w: r.w - used, h: r.h }, nowMs);
  }

  /**
   * Draw the strip onto a 2D context. The context may already hold a camera
   * frame (extension, lab) or be transparent (self-view overlay).
   * @param {CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D} ctx
   * @param {number} w frame width
   * @param {number} h frame height
   * @param {object} cfg normalised config (see normalize)
   * @param {ImageBitmap|HTMLImageElement|null} logo drawn in the top bar
   * @param {number} nowMs clock for rotation and scrolling
   * @param {{guides?: boolean}} [opts]
   */
  function draw(ctx, w, h, cfg, logo, nowMs, opts) {
    const c = cfg;
    if (!c || !c.enabled) {
      if (opts && opts.guides) drawGuides(ctx, w, h);
      return;
    }
    ctx.save();
    drawOneBar(ctx, c.top, c, w, h, nowMs, logo, 'bottom');
    drawOneBar(ctx, c.bottom, c, w, h, nowMs, null, 'top');
    ctx.restore();
    if (opts && opts.guides) drawGuides(ctx, w, h);
  }

  const api = {
    DEFAULTS: DEFAULTS,
    MODES: MODES,
    SHAPES: SHAPES,
    FILLS: FILLS,
    FAMILIES: FAMILIES,
    normalize: normalize,
    draw: draw,
    drawGuides: drawGuides,
    barRect: barRect,
    SAFE_ASPECT: SAFE_ASPECT,
  };
  try {
    Object.defineProperty(root, 'MeetStrip', { value: api, configurable: true });
  } catch (e) {
    root.MeetStrip = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
