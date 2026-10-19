/*
 * Builds docs/privacy.html (the page GitHub Pages serves, and the URL given to
 * the Chrome Web Store) from store/PRIVACY.md.
 *
 * The two used to be kept in step by hand, and drifted: the hosted policy went
 * on showing a placeholder contact after the markdown had the real one.
 * tests/privacy.test.js now fails if the committed HTML is not what this
 * produces, so the published policy cannot silently fall behind again.
 *
 * Usage: npm run build:privacy
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SOURCE = path.join(root, 'store', 'PRIVACY.md');
export const OUTPUT = path.join(root, 'docs', 'privacy.html');

const escape = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Inline markdown, applied after escaping so nothing in the source can inject HTML.
// Code spans are set aside first: their contents are literal, so a `*` inside
// one (as in `https://meet.google.com/*`) must not be read as emphasis.
function inline(t) {
  const code = [];
  const held = t.replace(/`([^`]+)`/g, (_, c) => `\u0000${code.push(`<code>${c}</code>`) - 1}\u0000`);
  return held
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/&lt;(https?:\/\/[^&\s]+)&gt;/g, '<a href="$1">$1</a>')
    .replace(/&lt;([^&\s@]+@[^&\s@]+\.[a-z]{2,})&gt;/gi, '<a href="mailto:$1">$1</a>')
    .replace(/\u0000(\d+)\u0000/g, (_, i) => code[Number(i)]);
}

function block(b) {
  if (b.startsWith('# ')) return `<h1>${inline(escape(b.slice(2)))}</h1>`;
  if (b.startsWith('## ')) return `<h2>${inline(escape(b.slice(3)))}</h2>`;
  if (b.startsWith('- ')) {
    // a list item can wrap onto indented continuation lines
    const items = b.split(/\n(?=- )/).map((it) => it.replace(/^- /, '').replace(/\n\s*/g, ' '));
    return `<ul>${items.map((it) => `<li>${inline(escape(it))}</li>`).join('')}</ul>`;
  }
  return `<p>${inline(escape(b.replace(/\n\s*/g, ' ')))}</p>`;
}

export function renderPrivacy(md) {
  const body = md
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map(block)
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Tickerline — Privacy Policy</title>
<style>
  :root { --ink:#0B0B0D; --ink-2:#15171B; --line:#24272C; --fg:#ECEEF0; --muted:#9AA0A6; --accent:#0A84FF; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--ink); color:var(--fg);
    font:16px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif;
    -webkit-font-smoothing:antialiased; }
  .wrap { max-width:720px; margin:0 auto; padding:52px 22px 70px; }
  h1 { font-size:30px; letter-spacing:-.022em; margin:0 0 6px; }
  h2 { font-size:17px; margin:34px 0 8px; letter-spacing:-.01em; }
  p,li { color:#C9CDD2; }
  p { margin:0 0 13px; }
  ul { padding-left:18px; } li { margin-bottom:6px; }
  a { color:var(--accent); }
  code { background:var(--ink-2); padding:1px 5px; border-radius:4px; font-size:13.5px; }
  .back { display:inline-block; margin-bottom:26px; font-size:14.5px; text-decoration:none; }
</style>
</head>
<body>
<div class="wrap">
<a class="back" href="index.html">&larr; Tickerline</a>
${body}
</div>
</body>
</html>
`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fs.writeFileSync(OUTPUT, renderPrivacy(fs.readFileSync(SOURCE, 'utf8')));
  console.log(`wrote ${path.relative(root, OUTPUT)} from ${path.relative(root, SOURCE)}`);
}
