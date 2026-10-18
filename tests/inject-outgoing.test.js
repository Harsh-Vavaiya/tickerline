/*
 * Exercises the peer-connection hooks, which is where the strip gets drawn on top of
 * Meet's own background effects. Needs the insertable-stream globals faked, otherwise
 * inject.js bails out early (see inject.test.js for that path).
 *
 * inject.js guards on a non-configurable window.__meetStripHooked, so it can only be
 * imported once per environment - hence this lives in its own file.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import '../extension/strip.js';

const wrappedTracks = [];

class FakeTrack {
  constructor({ kind = 'video', label = 'camera', displaySurface, readyState = 'live' } = {}) {
    this.kind = kind;
    this.label = label;
    this.readyState = readyState;
    this._displaySurface = displaySurface;
  }
  getSettings() {
    return this._displaySurface ? { displaySurface: this._displaySurface } : { width: 1280, height: 720 };
  }
  getConstraints() {
    return {};
  }
  applyConstraints() {
    return Promise.resolve();
  }
  addEventListener() {}
  stop() {}
}

beforeAll(async () => {
  globalThis.MediaStreamTrackProcessor = class {
    constructor({ track }) {
      this.track = track;
      this.readable = { pipeThrough: () => ({ pipeTo: () => Promise.resolve() }) };
    }
  };
  globalThis.MediaStreamTrackGenerator = class {
    constructor({ kind }) {
      this.kind = kind;
      this.writable = {};
      wrappedTracks.push(this);
    }
    stop() {}
    addEventListener() {}
  };
  globalThis.VideoFrame = class {};
  globalThis.OffscreenCanvas = class {
    getContext() {
      return {};
    }
  };
  globalThis.TransformStream = class {};
  globalThis.MediaDevices = class {
    getUserMedia() {}
  };

  globalThis.RTCPeerConnection = class {
    addTrack(track) {
      return { track };
    }
    addTransceiver(trackOrKind) {
      return { trackOrKind };
    }
  };
  globalThis.RTCRtpSender = class {
    replaceTrack(track) {
      return Promise.resolve(track);
    }
  };

  await import('../extension/inject.js');
});

describe('outgoing peer-connection hooks', () => {
  it('patches addTrack, addTransceiver and replaceTrack', () => {
    expect(RTCPeerConnection.prototype.addTrack.name).toBe('addTrack');
    expect(RTCPeerConnection.prototype.addTrack.toString()).toContain('wrapOutgoing');
    expect(RTCPeerConnection.prototype.addTransceiver.toString()).toContain('wrapOutgoing');
    expect(RTCRtpSender.prototype.replaceTrack.toString()).toContain('wrapOutgoing');
  });

  it('wraps a camera video track so the strip is drawn after Meet effects', () => {
    const pc = new RTCPeerConnection();
    const camera = new FakeTrack({ kind: 'video', label: 'HD WEBCAM' });
    const { track } = pc.addTrack(camera);
    expect(track).not.toBe(camera);
    expect(track.__meetStripWrapped).toBe(true);
  });

  it('leaves screen-share tracks alone', () => {
    const pc = new RTCPeerConnection();
    const screen = new FakeTrack({ kind: 'video', label: 'screen', displaySurface: 'monitor' });
    const { track } = pc.addTrack(screen);
    expect(track).toBe(screen);
  });

  it('leaves audio tracks alone', () => {
    const pc = new RTCPeerConnection();
    const audio = new FakeTrack({ kind: 'audio', label: 'mic' });
    const { track } = pc.addTrack(audio);
    expect(track).toBe(audio);
  });

  it('does not double-wrap a track it already wrapped', () => {
    const pc = new RTCPeerConnection();
    const camera = new FakeTrack({ kind: 'video' });
    const once = pc.addTrack(camera).track;
    const twice = pc.addTrack(once).track;
    expect(twice).toBe(once);
  });

  it('leaves ended tracks alone', () => {
    const pc = new RTCPeerConnection();
    const dead = new FakeTrack({ kind: 'video', readyState: 'ended' });
    expect(pc.addTrack(dead).track).toBe(dead);
  });

  it('passes a null track through replaceTrack (used to stop sending)', async () => {
    const sender = new RTCRtpSender();
    await expect(sender.replaceTrack(null)).resolves.toBeNull();
  });

  it('wraps the track given to replaceTrack', async () => {
    const sender = new RTCRtpSender();
    const camera = new FakeTrack({ kind: 'video' });
    const sent = await sender.replaceTrack(camera);
    expect(sent).not.toBe(camera);
    expect(sent.__meetStripWrapped).toBe(true);
  });

  it('does not wrap when addTransceiver is called with a kind string', () => {
    const pc = new RTCPeerConnection();
    expect(pc.addTransceiver('video').trackOrKind).toBe('video');
  });
});
