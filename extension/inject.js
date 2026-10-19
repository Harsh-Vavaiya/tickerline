/*
 * Runs in Meet's own JavaScript world at document_start, before Meet asks for the camera.
 *
 * The strip is drawn in exactly one place: the track Meet hands to the peer connection
 * (addTrack / addTransceiver / sender.replaceTrack). By then Meet has already run its
 * blur and background pipeline, so the strip lands on top of the blur rather than under
 * it, and remote participants get crisp text.
 *
 * We deliberately do NOT touch getUserMedia. That track is what your own self view
 * renders, and Meet blurs it downstream of us - drawing there only produced a smeared
 * strip in your own tile. Instead this file also paints an overlay canvas over your own
 * tile, so what you see locally matches what the call receives.
 *
 * The overlay lives here rather than in bridge.js because a MAIN-world content script
 * shares the page's DOM just as an isolated one does, and the renderer is already loaded
 * here. Relying on strip.js being injected into the isolated world as well turned out to
 * be fragile, and failed with the overlay silently disabled.
 *
 * Pipeline per frame: VideoFrame -> OffscreenCanvas (frame + strip) -> new VideoFrame -> Meet
 * When the strip is off, frames pass straight through untouched, so toggling never restarts the camera.
 */
(() => {
  'use strict';
  if (window.__meetStripHooked) return;
  Object.defineProperty(window, '__meetStripHooked', { value: true });

  const TAG = '[Tickerline]';
  const R = window.MeetStrip;
  if (!R) {
    console.warn(TAG, 'renderer missing, strip disabled');
    return;
  }

  // Start disabled until the saved config arrives from bridge.js.
  let cfg = Object.assign(R.normalize(R.DEFAULTS), { enabled: false });
  let logo = null;
  let lastChangeAt = 0;
  let seenFirstCfg = false;

  window.addEventListener('message', async (e) => {
    if (e.origin !== location.origin || !e.data || e.data.__meetStrip !== 'cfg') return;
    const wasEnabled = cfg.enabled;
    cfg = R.normalize(e.data.cfg);
    // Flash the badge on real changes, but not on the first config of the page load.
    if (seenFirstCfg && cfg.enabled !== wasEnabled) lastChangeAt = Date.now();
    seenFirstCfg = true;
    const blob = e.data.logoBlob;
    if (blob instanceof Blob) {
      try {
        const bmp = await createImageBitmap(blob);
        if (logo && logo.close) logo.close();
        logo = bmp;
      } catch (err) {
        console.warn(TAG, 'could not read logo', err);
        logo = null;
      }
    } else {
      if (logo && logo.close) logo.close();
      logo = null;
    }
  });
  window.postMessage({ __meetStrip: 'ready' }, location.origin);

  const supported =
    typeof MediaStreamTrackProcessor === 'function' &&
    typeof MediaStreamTrackGenerator === 'function' &&
    typeof VideoFrame === 'function' &&
    typeof OffscreenCanvas === 'function';
  if (!supported) {
    console.warn(TAG, 'insertable streams not available in this browser, strip disabled');
    return;
  }

  const WRAPPED = '__meetStripWrapped';

  // Screen shares expose displaySurface; only the camera should get a strip.
  function isScreenShare(track) {
    try {
      return !!(track.getSettings && track.getSettings().displaySurface);
    } catch (e) {
      return false;
    }
  }

  function shouldWrap(track) {
    return (
      track &&
      track.kind === 'video' &&
      track.readyState !== 'ended' &&
      !track[WRAPPED] &&
      !isScreenShare(track)
    );
  }

  function wrapTrack(src) {
    const processor = new MediaStreamTrackProcessor({ track: src });
    const gen = new MediaStreamTrackGenerator({ kind: 'video' });

    let canvas = null;
    let ctx = null;
    const stats = { frames: 0, ms: 0, since: performance.now() };

    const transformer = new TransformStream({
      transform(frame, controller) {
        if (!cfg.enabled) {
          controller.enqueue(frame);
          return;
        }
        const t0 = performance.now();
        const w = frame.displayWidth;
        const h = frame.displayHeight;
        try {
          if (!canvas || canvas.width !== w || canvas.height !== h) {
            canvas = new OffscreenCanvas(w, h);
            ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
          }
          ctx.drawImage(frame, 0, 0, w, h);
          R.draw(ctx, w, h, cfg, logo, Date.now());
          const init = { timestamp: frame.timestamp };
          if (frame.duration != null) init.duration = frame.duration;
          const out = new VideoFrame(canvas, init);
          frame.close();
          controller.enqueue(out);
        } catch (err) {
          // Never break the call: fall back to the raw frame.
          console.warn(TAG, 'frame draw failed, passing raw frame', err);
          controller.enqueue(frame);
          return;
        }
        stats.frames += 1;
        stats.ms += performance.now() - t0;
        const elapsed = performance.now() - stats.since;
        if (elapsed > 10000) {
          console.info(
            TAG,
            `${w}x${h} | ${(stats.ms / stats.frames).toFixed(2)} ms/frame | ${((stats.frames * 1000) / elapsed).toFixed(1)} fps`
          );
          stats.frames = 0;
          stats.ms = 0;
          stats.since = performance.now();
        }
      },
    });

    processor.readable
      .pipeThrough(transformer)
      .pipeTo(gen.writable)
      .catch((err) => console.debug(TAG, 'pipeline closed', err && err.message));

    // Make the generated track behave like the real camera for Meet.
    const nativeStop = gen.stop.bind(gen);
    gen.stop = function stop() {
      try {
        src.stop();
      } catch (e) {}
      nativeStop();
    };
    gen.getSettings = () => Object.assign({}, src.getSettings());
    gen.getCapabilities = () => (src.getCapabilities ? src.getCapabilities() : {});
    gen.getConstraints = () => src.getConstraints();
    gen.applyConstraints = (c) => src.applyConstraints(c);
    try {
      Object.defineProperty(gen, 'label', { get: () => src.label, configurable: true });
    } catch (e) {}
    src.addEventListener('ended', () => {
      try {
        nativeStop();
      } catch (e) {}
    });

    try {
      Object.defineProperty(gen, WRAPPED, { value: true });
    } catch (e) {}

    console.info(TAG, 'camera wrapped:', src.label || 'video track');
    return gen;
  }

  // Redraw on the outgoing track, which Meet has already run its effects over.
  function wrapOutgoing(track) {
    if (!shouldWrap(track)) return track;
    try {
      return wrapTrack(track);
    } catch (err) {
      console.warn(TAG, 'could not wrap outgoing track, sending as-is', err);
      return track;
    }
  }

  if (typeof RTCPeerConnection === 'function') {
    const pcProto = RTCPeerConnection.prototype;

    const nativeAddTrack = pcProto.addTrack;
    pcProto.addTrack = function addTrack(track, ...streams) {
      return nativeAddTrack.call(this, wrapOutgoing(track), ...streams);
    };

    const nativeAddTransceiver = pcProto.addTransceiver;
    pcProto.addTransceiver = function addTransceiver(trackOrKind, init) {
      if (typeof trackOrKind !== 'string') trackOrKind = wrapOutgoing(trackOrKind);
      return nativeAddTransceiver.call(this, trackOrKind, init);
    };
  }

  if (typeof RTCRtpSender === 'function') {
    const nativeReplaceTrack = RTCRtpSender.prototype.replaceTrack;
    RTCRtpSender.prototype.replaceTrack = function replaceTrack(track) {
      return nativeReplaceTrack.call(this, wrapOutgoing(track));
    };
  }

  /* ---------- self view: un-mirror + strip overlay + status badge ---------- */

  const MIRRORED = 'matrix(-1, 0, 0, 1, 0, 0)';
  const SELF_FLAG = 'meetStripSelf';
  const BADGE_MS = 2200;
  const BADGE_FADE_MS = 400;
  // video element -> its overlay canvas. A Map rather than a WeakMap because we
  // need to enumerate these to clean up: Meet swaps the video element when the
  // layout changes (pinning, grid changes), and an overlay left behind would sit
  // frozen at the old tile's position. Entries are dropped as soon as their
  // video goes, so holding strong references does not pile up.
  const overlays = new Map();

  // Meet mirrors only the local preview, so a scaleX(-1) video is our own tile.
  // Remember it on the element, because un-mirroring removes what we matched on.
  function isSelfView(v) {
    if (v.dataset[SELF_FLAG] === '1') return true;
    if (getComputedStyle(v).transform === MIRRORED) {
      v.dataset[SELF_FLAG] = '1';
      return true;
    }
    return false;
  }

  /*
   * Is the topmost element at the tile's centre part of that tile?
   *
   * Meet stacks its own transparent layers over each tile (hover targets, the
   * name label, pinning controls). Those are siblings of the video rather than
   * children, and only meet it several levels up, so testing the video's
   * immediate parent rejected Meet's own chrome and hid the overlay for good.
   * Walking a bounded way up the tree accepts anything in the same tile while
   * still rejecting a panel or dialog from elsewhere in the page.
   */
  function isSameTile(video, hit) {
    if (!hit) return false;
    if (hit === video || video.contains(hit) || hit.contains(video)) return true;
    const vr = video.getBoundingClientRect();
    const vArea = vr.width * vr.height;
    let node = video.parentElement;
    for (let i = 0; i < 8 && node; i++) {
      // Never walk as far as the page itself: body contains everything, which
      // would accept any panel anywhere. Stop at the first ancestor that is
      // much bigger than the tile, too - by then we are in page layout, not
      // the tile.
      if (node === document.body || node === document.documentElement) break;
      const nr = node.getBoundingClientRect();
      if (vArea > 0 && nr.width * nr.height > vArea * 4) break;
      if (node.contains(hit)) return true;
      node = node.parentElement;
    }
    return false;
  }

  function overlayFor(video) {
    let el = overlays.get(video);
    if (el && el.isConnected) return el;
    el = document.createElement('canvas');
    el.setAttribute('aria-hidden', 'true');
    Object.assign(el.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '2147483646',
      left: '0px',
      top: '0px',
    });
    document.body.appendChild(el);
    overlays.set(video, el);
    return el;
  }

  /*
   * The badge stays up while the strip is off, because that is the state you
   * cannot otherwise see: an off strip and a broken extension both just look
   * like your plain camera. When the strip is on, the strip itself is the
   * indicator, so the badge only flashes after a change and then fades.
   */
  function badgeAlpha(nowMs, on) {
    if (!on) return 1;
    const age = nowMs - lastChangeAt;
    if (!lastChangeAt || age < 0 || age > BADGE_MS + BADGE_FADE_MS) return 0;
    if (age <= BADGE_MS) return 1;
    return 1 - (age - BADGE_MS) / BADGE_FADE_MS;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, r);
      return;
    }
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawBadge(ctx, w, h, on, alpha) {
    const fs = Math.max(9, Math.min(15, Math.round(h * 0.052)));
    const inset = Math.max(5, Math.round(h * 0.03));
    const padX = Math.round(fs * 0.7);
    const dot = Math.round(fs * 0.5);
    const gap = Math.round(fs * 0.45);
    const label = on ? 'Tickerline on' : 'Tickerline off';

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `600 ${fs}px "Segoe UI", Roboto, system-ui, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const bw = padX + dot + gap + ctx.measureText(label).width + padX;
    const bh = Math.round(fs * 1.9);

    ctx.fillStyle = 'rgba(14, 16, 18, 0.72)';
    roundRect(ctx, inset, inset, bw, bh, bh / 2);
    ctx.fill();

    ctx.fillStyle = on ? '#0A84FF' : '#9AA0A5';
    ctx.beginPath();
    ctx.arc(inset + padX + dot / 2, inset + bh / 2, dot / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#F2F4F5';
    ctx.fillText(label, inset + padX + dot + gap, inset + bh / 2);
    ctx.restore();
  }

  function paintOverlay(video, nowMs) {
    const el = overlayFor(video);
    const r = video.getBoundingClientRect();
    const alpha = badgeAlpha(nowMs, cfg.enabled);
    const wantStrip = !!cfg.enabled;
    const onScreen =
      (wantStrip || alpha > 0) &&
      r.width > 40 &&
      r.height > 40 &&
      r.bottom > 0 &&
      r.right > 0 &&
      r.top < innerHeight &&
      r.left < innerWidth &&
      video.readyState >= 2;
    if (!onScreen) {
      el.style.display = 'none';
      return;
    }
    // Meet's own panels and dialogs can sit over the tile. The overlay is
    // pointer-events:none so it never hit-tests itself; if something outside
    // the tile is on top, stay hidden rather than painting over it.
    if (!isSameTile(video, document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2))) {
      el.style.display = 'none';
      return;
    }

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(r.width);
    const h = Math.round(r.height);
    if (el.width !== w * dpr || el.height !== h * dpr) {
      el.width = w * dpr;
      el.height = h * dpr;
    }
    Object.assign(el.style, {
      display: 'block',
      width: w + 'px',
      height: h + 'px',
      transform: `translate(${Math.round(r.left)}px, ${Math.round(r.top)}px)`,
    });

    const ctx = el.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (wantStrip) R.draw(ctx, w, h, cfg, logo, nowMs);
    if (alpha > 0) drawBadge(ctx, w, h, wantStrip, alpha);
  }

  function dropOverlay(video) {
    const el = overlays.get(video);
    if (el) el.remove();
    overlays.delete(video);
  }

  function tick() {
    requestAnimationFrame(tick);
    if (!document.body) return;
    const nowMs = Date.now();
    const live = new Set();
    for (const v of document.querySelectorAll('video')) {
      if (!isSelfView(v)) continue;
      live.add(v);
      if (cfg.unmirror) {
        if (v.style.transform !== 'scaleX(1)') v.style.setProperty('transform', 'scaleX(1)', 'important');
      } else if (v.style.transform) {
        v.style.removeProperty('transform');
      }
      try {
        paintOverlay(v, nowMs);
      } catch (err) {
        console.warn(TAG, 'self-view overlay failed', err);
      }
    }
    // Retire overlays whose video has gone or is no longer on screen, otherwise
    // the canvas lingers at the old position showing the last frame it drew.
    for (const video of overlays.keys()) {
      if (!live.has(video) || !video.isConnected) dropOverlay(video);
    }
  }

  document.documentElement.dataset.tickerline = 'overlay';
  requestAnimationFrame(tick);
})();
