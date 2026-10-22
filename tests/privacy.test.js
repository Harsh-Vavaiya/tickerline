/*
 * docs/privacy.html is the policy the Chrome Web Store links to. It is built
 * from store/PRIVACY.md, and the two once drifted: the hosted page kept a
 * placeholder contact, and cut bullet points off mid-sentence, long after the
 * markdown was correct. These tests make that a CI failure.
 */
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { OUTPUT, SOURCE, renderPrivacy } from '../tools/build-privacy.js';

const md = fs.readFileSync(SOURCE, 'utf8');
const html = fs.readFileSync(OUTPUT, 'utf8').replace(/\r\n/g, '\n');

describe('hosted privacy policy', () => {
  it('is exactly what store/PRIVACY.md builds to (run `npm run build:privacy`)', () => {
    expect(html).toBe(renderPrivacy(md));
  });

  it('carries no placeholders or unrendered markdown', () => {
    const text = html.replace(/<style>[\s\S]*?<\/style>/, '');
    expect(text).not.toMatch(/SUPPORT EMAIL|YOUR[ _]HANDLE|TODO|<YOUR/i);
    expect(text).not.toMatch(/\*\*/);
    expect(text).not.toMatch(/<!--/);
  });

  it('gives readers a working way to reach the developer', () => {
    expect(html).toMatch(/<a href="mailto:harshvavaiya\+tickerline@gmail\.com">/);
    expect(html).toMatch(/<a href="https:\/\/github\.com\/Harsh-Vavaiya\/tickerline\/issues">/);
  });

  it('keeps every bullet point whole, even when it wraps in the source', () => {
    expect(html).toContain('draws onto camera frames as they pass through your browser');
    expect(html).toContain('The extension runs only on <code>meet.google.com</code>.');
  });
});

describe('renderPrivacy', () => {
  it('escapes HTML rather than passing it through', () => {
    expect(renderPrivacy('Hello <script>alert(1)</script>')).toContain('&lt;script&gt;');
    expect(renderPrivacy('Hello <script>alert(1)</script>')).not.toContain('<script>alert');
  });

  it('treats a * inside a code span literally, even within bold', () => {
    const out = renderPrivacy('- **`https://meet.google.com/*`** — runs here.');
    expect(out).toContain('<strong><code>https://meet.google.com/*</code></strong>');
  });

  it('turns links and bare URLs into anchors', () => {
    expect(renderPrivacy('[Google](https://policies.google.com/privacy)')).toContain(
      '<a href="https://policies.google.com/privacy">Google</a>'
    );
    expect(renderPrivacy('see <https://example.com/x>.')).toContain(
      '<a href="https://example.com/x">https://example.com/x</a>'
    );
  });

  it('turns a bracketed email address into a mailto link', () => {
    expect(renderPrivacy('email <someone@example.com>.')).toContain(
      '<a href="mailto:someone@example.com">someone@example.com</a>'
    );
  });

  it('drops HTML comments, which are notes for the author', () => {
    expect(renderPrivacy('Text\n\n<!-- private note -->')).not.toContain('private note');
  });
});
