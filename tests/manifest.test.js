import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const extensionDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'extension');
const manifest = JSON.parse(readFileSync(path.join(extensionDir, 'manifest.json'), 'utf8'));
const backgroundSrc = readFileSync(path.join(extensionDir, 'background.js'), 'utf8');

describe('manifest.json', () => {
  it('declares manifest v3', () => {
    expect(manifest.manifest_version).toBe(3);
  });

  // The store takes its title and summary straight from these fields and the
  // dashboard cannot edit them after upload, so they are checked here instead.
  it('has a store title within the 75 character limit, leading with the brand', () => {
    expect(manifest.name.length).toBeLessThanOrEqual(75);
    expect(manifest.name.startsWith('Tickerline')).toBe(true);
  });

  it('has a short name within the 12 character limit', () => {
    expect(manifest.short_name).toBe('Tickerline');
    expect(manifest.short_name.length).toBeLessThanOrEqual(12);
  });

  it('has a store summary within the 132 character limit', () => {
    expect(manifest.description.length).toBeGreaterThan(0);
    expect(manifest.description.length).toBeLessThanOrEqual(132);
  });

  it('has a well-formed semver version', () => {
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('requests only the storage permission (least privilege)', () => {
    expect(manifest.permissions).toEqual(['storage']);
    expect(manifest.host_permissions ?? []).toEqual([]);
  });

  it('only runs content scripts on Google Meet, never on all URLs', () => {
    expect(manifest.content_scripts.length).toBeGreaterThan(0);
    for (const cs of manifest.content_scripts) {
      for (const pattern of cs.matches) {
        expect(pattern.startsWith('https://meet.google.com/')).toBe(true);
      }
    }
  });

  it('uses a non-persistent (event-driven) service worker background', () => {
    expect(manifest.background.service_worker).toBe('background.js');
    expect(manifest.background.persistent).toBeUndefined();
  });

  it('keeps the toggle-strip command wired to the same name background.js listens for', () => {
    expect(manifest.commands).toHaveProperty('toggle-strip');
    expect(backgroundSrc).toContain("'toggle-strip'");
  });
});
