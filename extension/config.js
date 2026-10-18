/*
 * Look templates for the strip.
 *
 * Kept separate from strip.js (the renderer) and free of chrome.* calls, so the
 * rules about what a template may change can be tested directly.
 */
(function (root) {
  'use strict';

  function isPlainObject(v) {
    return !!v && typeof v === 'object' && !Array.isArray(v);
  }

  function withoutLogo(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const { logo, ...rest } = obj;
    return rest;
  }

  /*
   * Look templates. These set styling and geometry only - applying one keeps
   * your own text and logo, since a template is a look, not content.
   */
  const TEMPLATES = [
    {
      id: 'keynote',
      name: 'Keynote',
      note: 'Dark glass pills, tight type. The default.',
      cfg: {
        color: '#0B0B0D',
        textColor: '#FFFFFF',
        accent: '#0A84FF',
        opacity: 0.58,
        top: {
          shape: 'pill', fill: 'glass', font: 'display', weight: 600, tracking: -0.01,
          uppercase: false, shadow: true, divider: false,
          xPct: 0, yPct: 4, widthPct: 100, heightPct: 11, mode: 'static',
        },
        bottom: {
          shape: 'pill', fill: 'glass', font: 'display', weight: 500, tracking: 0,
          uppercase: false, shadow: true, divider: false,
          xPct: 0, yPct: 84, widthPct: 100, heightPct: 11, mode: 'scroll',
        },
      },
    },
    {
      id: 'studio',
      name: 'Studio',
      note: 'Light frosted pills, near-black text.',
      cfg: {
        color: '#F5F5F7',
        textColor: '#1D1D1F',
        accent: '#0071E3',
        opacity: 0.82,
        top: {
          shape: 'pill', fill: 'glass', font: 'display', weight: 600, tracking: -0.01,
          uppercase: false, shadow: false, divider: false,
          xPct: 0, yPct: 4, widthPct: 100, heightPct: 11, mode: 'static',
        },
        bottom: {
          shape: 'pill', fill: 'glass', font: 'text', weight: 500, tracking: 0,
          uppercase: false, shadow: false, divider: false,
          xPct: 0, yPct: 84, widthPct: 100, heightPct: 11, mode: 'scroll',
        },
      },
    },
    {
      id: 'minimal',
      name: 'Minimal',
      note: 'No panel at all, just type with a soft shadow.',
      cfg: {
        color: '#000000',
        textColor: '#FFFFFF',
        accent: '#FFFFFF',
        opacity: 0.5,
        top: {
          shape: 'full', fill: 'none', font: 'display', weight: 600, tracking: 0.01,
          uppercase: false, shadow: true, divider: false,
          xPct: 0, yPct: 5, widthPct: 100, heightPct: 10, mode: 'static',
        },
        bottom: {
          shape: 'full', fill: 'none', font: 'display', weight: 500, tracking: 0.01,
          uppercase: false, shadow: true, divider: false,
          xPct: 0, yPct: 85, widthPct: 100, heightPct: 10, mode: 'rotate',
        },
      },
    },
    {
      id: 'editorial',
      name: 'Editorial',
      note: 'Serif headline over a quiet lower third.',
      cfg: {
        color: '#111113',
        textColor: '#F7F5F2',
        accent: '#C8A96A',
        opacity: 0.66,
        top: {
          shape: 'pill', fill: 'gradient', font: 'serif', weight: 600, tracking: 0,
          uppercase: false, shadow: true, divider: false,
          xPct: 0, yPct: 4, widthPct: 100, heightPct: 12, mode: 'static',
        },
        bottom: {
          shape: 'full', fill: 'gradient', font: 'serif', weight: 400, tracking: 0.02,
          uppercase: false, shadow: false, divider: true,
          xPct: 0, yPct: 86, widthPct: 100, heightPct: 10, mode: 'scroll',
        },
      },
    },
    {
      id: 'terminal',
      name: 'Terminal',
      note: 'Monospace, uppercase, wide tracking.',
      cfg: {
        color: '#07090C',
        textColor: '#E6F1FF',
        accent: '#30D158',
        opacity: 0.74,
        top: {
          shape: 'full', fill: 'solid', font: 'mono', weight: 500, tracking: 0.14,
          uppercase: true, shadow: false, divider: true,
          xPct: 0, yPct: 0, widthPct: 100, heightPct: 9, mode: 'static',
        },
        bottom: {
          shape: 'full', fill: 'solid', font: 'mono', weight: 500, tracking: 0.12,
          uppercase: true, shadow: false, divider: true,
          xPct: 0, yPct: 91, widthPct: 100, heightPct: 9, mode: 'scroll',
        },
      },
    },
    {
      id: 'broadcast',
      name: 'Broadcast',
      note: 'Full-width bars with an accent rule. The classic news look.',
      cfg: {
        color: '#0A3D62',
        textColor: '#FFFFFF',
        accent: '#E8B21A',
        opacity: 0.92,
        top: {
          shape: 'full', fill: 'gradient', font: 'display', weight: 700, tracking: 0.01,
          uppercase: true, shadow: false, divider: true,
          xPct: 0, yPct: 0, widthPct: 100, heightPct: 12, mode: 'static',
        },
        bottom: {
          shape: 'full', fill: 'gradient', font: 'display', weight: 600, tracking: 0.01,
          uppercase: false, shadow: false, divider: true,
          xPct: 0, yPct: 88, widthPct: 100, heightPct: 12, mode: 'scroll',
        },
      },
    },
  ];

  function templateById(id) {
    return TEMPLATES.find((t) => t.id === id) || null;
  }

  /**
   * Merge a template's look into the current config, keeping the user's own
   * words, logo, motion timings and on/off switches.
   */
  function applyTemplate(current, id) {
    const tpl = templateById(id);
    if (!tpl) return current;
    const cur = isPlainObject(current) ? current : {};
    const out = Object.assign({}, cur, withoutLogo(tpl.cfg));
    for (const key of ['top', 'bottom']) {
      out[key] = Object.assign({}, cur[key], tpl.cfg[key], {
        items: (cur[key] && cur[key].items) || undefined,
        enabled: cur[key] && cur[key].enabled !== undefined ? cur[key].enabled : true,
        speed: cur[key] && cur[key].speed,
        seconds: cur[key] && cur[key].seconds,
      });
      for (const k of Object.keys(out[key])) {
        if (out[key][k] === undefined) delete out[key][k];
      }
    }
    if (cur.logo) out.logo = cur.logo;
    if (cur.unmirror !== undefined) out.unmirror = cur.unmirror;
    if (cur.enabled !== undefined) out.enabled = cur.enabled;
    return out;
  }

  const api = {
    TEMPLATES: TEMPLATES,
    templateById: templateById,
    applyTemplate: applyTemplate,
  };
  try {
    Object.defineProperty(root, 'MeetStripConfig', { value: api, configurable: true });
  } catch (e) {
    root.MeetStripConfig = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
