(() => {
  'use strict';
  const KEY = 'meetStripCfg';

  /*
   * Tip jar. The link hides itself if this is ever blanked out, so the popup
   * cannot ship a dead link.
   */
  const SUPPORT_URL = 'https://buymeacoffee.com/harshv9';

  const R = window.MeetStrip;
  const C = window.MeetStripConfig;
  const $ = (id) => document.getElementById(id);

  const BARS = ['top', 'bottom'];
  const el = {
    enabled: $('enabled'), stateLabel: $('stateLabel'), guides: $('guides'),
    color: $('color'), textColor: $('textColor'), accent: $('accent'),
    opacity: $('opacity'), opacityVal: $('opacityVal'),
    unmirror: $('unmirror'),
    templateList: $('templateList'), templateNote: $('templateNote'),
    pickLogo: $('pickLogo'), logoFile: $('logoFile'), logoThumb: $('logoThumb'), clearLogo: $('clearLogo'),
    preview: $('preview'),
    cfgStatus: $('cfgStatus'), support: $('support'),
  };
  for (const b of BARS) {
    el[b] = {
      enabled: $(b + 'Enabled'), items: $(b + 'Items'), mode: $(b + 'Mode'),
      rate: $(b + 'Rate'), rateLabel: $(b + 'RateLabel'),
      x: $(b + 'X'), y: $(b + 'Y'), w: $(b + 'W'), h: $(b + 'H'),
      xVal: $(b + 'XVal'), yVal: $(b + 'YVal'), wVal: $(b + 'WVal'), hVal: $(b + 'HVal'),
      shape: $(b + 'Shape'), fill: $(b + 'Fill'), font: $(b + 'Font'), weight: $(b + 'Weight'),
      tracking: $(b + 'Tracking'), trackingVal: $(b + 'TrackingVal'),
      uppercase: $(b + 'Uppercase'), shadow: $(b + 'Shadow'), divider: $(b + 'Divider'),
    };
  }

  let state = null; // normalised config + optional logo data URL
  let logoBmp = null;
  let saveTimer = null;
  let statusTimer = null;

  function status(msg, isError) {
    el.cfgStatus.textContent = msg || '';
    el.cfgStatus.style.color = isError ? '#c0392b' : '';
    clearTimeout(statusTimer);
    if (msg) statusTimer = setTimeout(() => (el.cfgStatus.textContent = ''), 4000);
  }

  // "rate" is seconds per item when rotating, pixels per second when scrolling.
  function rateFor(bar) {
    return bar.mode === 'scroll' ? bar.speed : bar.seconds;
  }
  function applyRateUi(name) {
    const bar = state[name];
    const scroll = bar.mode === 'scroll';
    const f = el[name];
    f.rateLabel.textContent = scroll ? 'Speed (px/s)' : 'Seconds per item';
    f.rate.min = scroll ? 10 : 1.5;
    f.rate.max = scroll ? 400 : 30;
    f.rate.step = scroll ? 5 : 0.5;
    f.rate.value = rateFor(bar);
    f.rate.disabled = bar.mode === 'static';
  }

  function fillForm() {
    el.enabled.checked = state.enabled;
    el.stateLabel.textContent = state.enabled ? 'On' : 'Off';
    el.color.value = state.color;
    el.textColor.value = state.textColor;
    el.accent.value = state.accent;
    el.opacity.value = Math.round(state.opacity * 100);
    el.opacityVal.textContent = Math.round(state.opacity * 100) + '%';
    el.unmirror.checked = state.unmirror;
    for (const name of BARS) {
      const bar = state[name];
      const f = el[name];
      f.enabled.checked = bar.enabled;
      f.items.value = bar.items.join('\n');
      f.mode.value = bar.mode;
      f.shape.value = bar.shape;
      f.fill.value = bar.fill;
      f.font.value = bar.font;
      f.weight.value = String(bar.weight);
      f.tracking.value = Math.round(bar.tracking * 100);
      f.trackingVal.textContent = bar.tracking.toFixed(2);
      f.uppercase.checked = bar.uppercase;
      f.shadow.checked = bar.shadow;
      f.divider.checked = bar.divider;
      f.x.value = bar.xPct; f.xVal.textContent = bar.xPct + '%';
      f.y.value = bar.yPct; f.yVal.textContent = bar.yPct + '%';
      f.w.value = bar.widthPct; f.wVal.textContent = bar.widthPct + '%';
      f.h.value = bar.heightPct; f.hVal.textContent = bar.heightPct + '%';
      applyRateUi(name);
    }
    showLogo();
  }

  function readBar(name) {
    const f = el[name];
    const mode = f.mode.value;
    const rate = Number(f.rate.value);
    const prev = state[name];
    return {
      enabled: f.enabled.checked,
      mode: mode,
      items: f.items.value.split('\n'),
      xPct: Number(f.x.value),
      yPct: Number(f.y.value),
      widthPct: Number(f.w.value),
      heightPct: Number(f.h.value),
      speed: mode === 'scroll' ? rate : prev.speed,
      seconds: mode === 'rotate' ? rate : prev.seconds,
      shape: f.shape.value,
      fill: f.fill.value,
      font: f.font.value,
      weight: Number(f.weight.value),
      tracking: Number(f.tracking.value) / 100,
      uppercase: f.uppercase.checked,
      shadow: f.shadow.checked,
      divider: f.divider.checked,
    };
  }

  function readForm() {
    const next = R.normalize({
      enabled: el.enabled.checked,
      color: el.color.value,
      textColor: el.textColor.value,
      accent: el.accent.value,
      opacity: Number(el.opacity.value) / 100,
      unmirror: el.unmirror.checked,
      top: readBar('top'),
      bottom: readBar('bottom'),
    });
    next.logo = state.logo || null;
    const modeChanged = BARS.some((b) => state[b].mode !== next[b].mode);
    state = next;
    el.stateLabel.textContent = state.enabled ? 'On' : 'Off';
    el.opacityVal.textContent = Math.round(state.opacity * 100) + '%';
    for (const name of BARS) {
      const bar = state[name];
      const f = el[name];
      f.xVal.textContent = bar.xPct + '%';
      f.yVal.textContent = bar.yPct + '%';
      f.wVal.textContent = bar.widthPct + '%';
      f.hVal.textContent = bar.heightPct + '%';
      f.trackingVal.textContent = bar.tracking.toFixed(2);
      if (modeChanged) applyRateUi(name);
    }
  }

  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => chrome.storage.local.set({ [KEY]: state }), 200);
  }

  async function applyCfg(raw, logo) {
    state = R.normalize(raw);
    state.logo = typeof logo === 'string' && logo.startsWith('data:') ? logo : null;
    fillForm();
    await loadLogoBitmap();
  }

  function showLogo() {
    const has = !!state.logo;
    el.logoThumb.style.display = has ? 'block' : 'none';
    el.clearLogo.hidden = !has;
    if (has) el.logoThumb.src = state.logo;
  }

  async function loadLogoBitmap() {
    if (logoBmp && logoBmp.close) logoBmp.close();
    logoBmp = null;
    if (!state.logo) return;
    try {
      const blob = await (await fetch(state.logo)).blob();
      logoBmp = await createImageBitmap(blob);
    } catch (e) {
      console.warn('logo decode failed', e);
    }
  }

  // Downscale the logo before storing so the strip never carries a huge image around.
  async function importLogo(file) {
    const src = await createImageBitmap(file).catch(() => null);
    let bmp = src;
    if (!bmp) {
      // SVGs need an <img> to rasterise
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.src = url;
      await img.decode();
      bmp = img;
      URL.revokeObjectURL(url);
    }
    const maxH = 160;
    const maxW = 640;
    const scale = Math.min(1, maxH / bmp.height, maxW / bmp.width);
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(bmp.width * scale));
    c.height = Math.max(1, Math.round(bmp.height * scale));
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    if (src && src.close) src.close();
    state.logo = c.toDataURL('image/png');
    showLogo();
    await loadLogoBitmap();
    save();
  }

  // Placeholder "camera" so the preview shows layout without asking for camera access.
  function drawScene(ctx, w, h) {
    ctx.fillStyle = '#2b3036';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#353b42';
    ctx.fillRect(w * 0.62, h * 0.12, w * 0.22, h * 0.42); // a picture frame on the wall
    ctx.fillStyle = '#8a9097';
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.42, h * 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.95, w * 0.2, h * 0.34, 0, Math.PI, 0);
    ctx.fill();
  }

  function loop() {
    const ctx = el.preview.getContext('2d');
    const w = el.preview.width;
    const h = el.preview.height;
    drawScene(ctx, w, h);
    if (state) R.draw(ctx, w, h, state, logoBmp, Date.now(), { guides: el.guides.checked });
    requestAnimationFrame(loop);
  }

  function wireTemplates() {
    const blank = document.createElement('option');
    blank.value = '';
    blank.textContent = '— custom —';
    el.templateList.appendChild(blank);
    for (const t of C.TEMPLATES) {
      const o = document.createElement('option');
      o.value = t.id;
      o.textContent = t.name;
      el.templateList.appendChild(o);
    }
    el.templateList.addEventListener('change', async () => {
      const id = el.templateList.value;
      const tpl = C.templateById(id);
      el.templateNote.textContent = tpl ? tpl.note : '';
      if (!tpl) return;
      // a template is a look, not content: keep the words and the logo
      await applyCfg(C.applyTemplate(state, id), state.logo);
      save();
      status(`Applied "${tpl.name}".`);
    });
  }

  function wireSupport() {
    if (!el.support) return;
    // Hide rather than ship a dead link.
    if (!SUPPORT_URL || SUPPORT_URL.includes('YOUR_HANDLE')) {
      el.support.hidden = true;
      return;
    }
    el.support.href = SUPPORT_URL;
    el.support.hidden = false;
  }

  async function init() {
    const saved = (await chrome.storage.local.get(KEY))[KEY];
    state = R.normalize(saved || R.DEFAULTS);
    state.logo = saved && saved.logo ? saved.logo : null;
    fillForm();
    wireTemplates();
    wireSupport();
    await loadLogoBitmap();
    if (!saved) chrome.storage.local.set({ [KEY]: state });

    const onChange = () => {
      readForm();
      save();
    };
    const simple = ['enabled', 'color', 'textColor', 'accent', 'opacity', 'unmirror'];
    for (const k of simple) {
      el[k].addEventListener('input', onChange);
      el[k].addEventListener('change', onChange);
    }
    const barControls = [
      'enabled', 'items', 'mode', 'rate', 'x', 'y', 'w', 'h',
      'shape', 'fill', 'font', 'weight', 'tracking', 'uppercase', 'shadow', 'divider',
    ];
    for (const name of BARS) {
      for (const k of barControls) {
        el[name][k].addEventListener('input', onChange);
        el[name][k].addEventListener('change', onChange);
      }
    }

    el.pickLogo.addEventListener('click', () => el.logoFile.click());
    el.logoFile.addEventListener('change', () => {
      const f = el.logoFile.files && el.logoFile.files[0];
      if (f) importLogo(f).catch((e) => console.warn('logo import failed', e));
      el.logoFile.value = '';
    });
    el.clearLogo.addEventListener('click', async () => {
      state.logo = null;
      showLogo();
      await loadLogoBitmap();
      save();
    });
    // Reflect toggles made with the keyboard shortcut while the popup is open.
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !changes[KEY] || !changes[KEY].newValue) return;
      const nv = changes[KEY].newValue;
      if (!!nv.enabled !== state.enabled) {
        state.enabled = !!nv.enabled;
        el.enabled.checked = state.enabled;
        el.stateLabel.textContent = state.enabled ? 'On' : 'Off';
      }
    });
    requestAnimationFrame(loop);
  }

  init();
})();
