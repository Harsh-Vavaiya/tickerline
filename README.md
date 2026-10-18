# Tickerline

A news-style strip (logo and contact details) for your camera in Google Meet. Two things in here:

- `extension/` is a Chrome extension that puts a news-style strip (logo + company on top, rotating contact details at the bottom) on your camera in Google Meet. No model, just drawing.
- `lab/` is a comparison page that runs the same strip through three pipelines on your own camera: no model, segmentation (MediaPipe selfie segmenter) and depth (Depth Anything V2 Small). It shows fps and timings side by side.

## Load the extension

1. Open `chrome://extensions`, turn on Developer mode, click "Load unpacked" and pick the `extension` folder.
2. Click the Tickerline icon. Set your company text, logo, contact lines and color. The preview shows what others will see, with crop guides.
3. Open Google Meet (reload the tab if it was already open) and join a meeting.

`Alt+Shift+S` turns the strip on and off during a call. Every change applies live, no camera restart.

## Keeping your settings

Everything you set is saved as you type, so it is still there after a browser restart or an extension reload.

Everything lives on the computer you set it up on. There is no account, no sync and no backup file, which is the whole of what the extension knows about you.

Set it up again on a second machine if you use one. That is the trade for having nothing to sign into.

## What to check in Meet

- Join the same meeting from your phone or a second account and check the strip reads correctly there.
- Turn on Meet's background blur. The strip should stay crisp over the blurred background, both in your own tile and for everyone else.
- Pin and unpin your own feed. There should be exactly one strip, always on the current tile.
- Get 3+ people in the call and check the strip text still sits inside your tile.
- Press F12 on the Meet tab. Every 10 seconds there's a `[Tickerline]` line with ms per frame and fps. Note the numbers on a normal laptop.

## Run the lab

Open `lab/index.html` in Chrome. If Chrome won't start the camera from a local file, run this in the `tickerline` folder and open http://localhost:8000/lab/ instead:

```
python3 -m http.server 8000
```

The first run needs internet: MediaPipe is a few MB, Depth Anything is 25 to 100 MB depending on your GPU. Both are cached after that.

Things to compare:

- fps, ms per frame, model ms and mask updates per second for each pipeline
- edge quality around hair and hands (tick "Show person mask")
- "Simulate Meet's own blur": this draws the strip first and blurs after, which is what happens when Meet's blur is on. Watch the strip get eaten, then untick it to see our order fix it.
- In depth mode, move the "Depth cutoff" slider. Depth gives relative distance, so you have to pick where "you" end and the room begins.

## How it works

`inject.js` runs inside Meet's page at `document_start` and draws the strip in exactly one place: the track Meet hands to the peer connection (`RTCPeerConnection.addTrack` / `addTransceiver` / `sender.replaceTrack`). By then Meet has already run its blur and background pipeline, so the strip lands on top of the blur rather than under it. Per frame: `VideoFrame` -> `OffscreenCanvas` (frame + strip) -> `MediaStreamTrackGenerator` that Meet uses like a normal camera.

`getUserMedia` is deliberately left alone. That track is what your own self view renders, and Meet blurs it downstream of us, so drawing there only ever produced a smeared strip in your own tile. Instead `inject.js` paints an overlay canvas positioned over your own tile, un-mirrored, so what you see locally matches what the call receives.

`bridge.js` passes your saved settings across the world boundary. `strip.js` is the shared renderer used by the extension, the popup and the lab.

## Known limits

- Chrome and Edge only, since it relies on insertable streams.
- Drawing happens on Meet's main thread. If ms per frame is high on your laptop, the next step is moving it into a worker.
- The model pipelines only run in the lab for now. Running a model inside Meet is the next step, because Meet's page security rules may block loading the ML runtime, and that needs its own test.
- With a logo and long company name together, the top text shrinks to fit the safe zone. Check if it's still readable in a small tile, or use logo only.

## What was tested before handing this over

In headless Chrome with a fake camera: the camera hook, live on/off, settings and logo updates, the popup, and all three lab pipelines. The lab's model pipelines were tested with stand-in models because the sandbox couldn't download the real ones, so your first run is the first time real MediaPipe and Depth Anything run on this code.

