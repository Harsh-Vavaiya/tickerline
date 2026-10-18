/*
 * Runs in the extension's isolated world on Meet.
 * Reads the saved strip config and hands it to inject.js (Meet's world) via postMessage.
 * The logo travels as a Blob so the page never has to load a data: URL.
 *
 * Drawing - both the outgoing track and the self-view overlay - happens in inject.js.
 * This file only moves settings across the world boundary.
 */
(() => {
  'use strict';
  const KEY = 'meetStripCfg';

  function dataUrlToBlob(url) {
    const comma = url.indexOf(',');
    const head = url.slice(0, comma);
    const mime = (head.match(/^data:([^;,]+)/) || [])[1] || 'image/png';
    const bin = atob(url.slice(comma + 1));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  async function send() {
    let saved;
    try {
      saved = (await chrome.storage.local.get(KEY))[KEY];
    } catch (e) {
      return; // extension reloaded while the tab stayed open
    }
    const { logo, ...cfg } = saved || {};
    let logoBlob = null;
    if (typeof logo === 'string' && logo.startsWith('data:')) {
      try {
        logoBlob = dataUrlToBlob(logo);
      } catch (e) {}
    }
    window.postMessage({ __meetStrip: 'cfg', cfg, logoBlob }, location.origin);
  }

  window.addEventListener('message', (e) => {
    if (e.origin === location.origin && e.data && e.data.__meetStrip === 'ready') send();
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[KEY]) send();
  });
  send();
})();
