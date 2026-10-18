import { describe, expect, it } from 'vitest';
import '../extension/strip.js';
import '../extension/config.js';

const C = globalThis.MeetStripConfig;
const R = globalThis.MeetStrip;

const LOGO = 'data:image/png;base64,AAAA';

describe('templates', () => {
  it('ships several, each with a unique id and a name', () => {
    expect(C.TEMPLATES.length).toBeGreaterThanOrEqual(5);
    const ids = C.TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of C.TEMPLATES) {
      expect(t.name, t.id).toBeTruthy();
      expect(t.note, t.id).toBeTruthy();
    }
  });

  it('every template survives normalize with its look intact', () => {
    for (const t of C.TEMPLATES) {
      const cfg = R.normalize(t.cfg);
      // a value the renderer rejected would silently fall back to the default
      expect(cfg.color, t.id).toBe(t.cfg.color);
      expect(cfg.top.shape, t.id).toBe(t.cfg.top.shape);
      expect(cfg.top.fill, t.id).toBe(t.cfg.top.fill);
      expect(cfg.top.font, t.id).toBe(t.cfg.top.font);
      expect(cfg.bottom.font, t.id).toBe(t.cfg.bottom.font);
      expect(cfg.bottom.tracking, t.id).toBeCloseTo(t.cfg.bottom.tracking, 5);
    }
  });

  it('looks up by id and ignores unknown ones', () => {
    expect(C.templateById('keynote').name).toBe('Keynote');
    expect(C.templateById('nope')).toBeNull();
  });

  describe('applyTemplate', () => {
    const current = {
      enabled: true,
      unmirror: false,
      logo: LOGO,
      top: { items: ['Acme Ltd'], enabled: true, mode: 'static', color: '#111111' },
      bottom: { items: ['a', 'b'], enabled: false, speed: 123, seconds: 9 },
    };

    it('keeps your words, logo and switches', () => {
      const out = R.normalize(C.applyTemplate(current, 'terminal'));
      expect(out.top.items).toEqual(['Acme Ltd']);
      expect(out.bottom.items).toEqual(['a', 'b']);
      expect(out.bottom.enabled).toBe(false);
      expect(out.unmirror).toBe(false);
      expect(C.applyTemplate(current, 'terminal').logo).toBe(LOGO);
    });

    it('keeps your motion timings', () => {
      const out = R.normalize(C.applyTemplate(current, 'studio'));
      expect(out.bottom.speed).toBe(123);
      expect(out.bottom.seconds).toBe(9);
    });

    it('takes the look from the template', () => {
      const out = R.normalize(C.applyTemplate(current, 'terminal'));
      expect(out.top.font).toBe('mono');
      expect(out.top.uppercase).toBe(true);
      expect(out.color).toBe('#07090C');
    });

    it('returns the config untouched for an unknown template', () => {
      expect(C.applyTemplate(current, 'nope')).toBe(current);
    });

    it('works from nothing at all', () => {
      expect(() => R.normalize(C.applyTemplate(null, 'keynote'))).not.toThrow();
      expect(() => R.normalize(C.applyTemplate(undefined, 'minimal'))).not.toThrow();
    });
  });
});
