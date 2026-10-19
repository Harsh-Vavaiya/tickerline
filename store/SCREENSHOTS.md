# Taking the store screenshots — step by step

You will end up with five PNG files, each exactly 1280×800, ready to upload.
Allow about an hour the first time. Do the parts in order: each one sets up
the next.

Keyboard shortcuts used throughout:

| Shortcut | Does |
|---|---|
| `Win`+`Shift`+`S` | Snip a region of the screen to the clipboard |
| `Ctrl`+`Shift`+`N` | New incognito window in Chrome |
| `Ctrl`+`Shift`+`B` | Hide or show Chrome's bookmarks bar |
| `F11` | Chrome fullscreen, hides tabs and toolbar |

---

## Part 1 — A stand-in camera, so your face stays out of it

Meet's background blur works by finding a person in the frame, so the camera
feed needs a person in it. OBS feeds a video file to Meet as if it were your
webcam.

### 1.1 Get a clip

1. Go to <https://www.pexels.com/videos/>.
2. Search **person working at laptop** or **person video call**.
3. Pick a clip where someone faces the camera, upper body in frame, in a room
   with some depth behind them (shelves, a window). Plain white walls make the
   blur invisible.
4. Click **Free download**, choose a **1920×1080** size, save it somewhere you
   will find it.

Pexels allows commercial use without attribution. A store listing is
promotional, though, and an identifiable person can read as endorsing the
product. If you can get a friend or colleague to record a 20-second clip
instead, that is the better choice; the steps below are the same either way.

### 1.2 Set up OBS

1. Open **OBS Studio**.
2. In the **Sources** panel at the bottom, click **+** → **Media Source** → name
   it `Camera` → **OK**.
3. Click **Browse**, pick the clip. Tick **Loop**. Click **OK**.
4. Click the clip in the preview so it is selected, then press `Ctrl`+`F` to fit
   it to the canvas.
5. In the **Controls** panel at the bottom right, click **Start Virtual Camera**.

Leave OBS open until every screenshot is done.

---

## Part 2 — Set up the extension and a call

### 2.1 Fill the strip with real content

1. `chrome://extensions` → on the Tickerline card, click the **reload** arrow.
2. Pin the extension: click the puzzle-piece icon in the toolbar → the pin next
   to **Tickerline**.
3. Click the Tickerline icon to open the popup, and set:
   - **Template:** Keynote
   - **Top strip:** your name or personal brand
   - **Bottom strip**, one per line: your role · a contact line · a website
   - **Logo:** add one if you have it

Use **your own** details. No employer name or logo, and no phone number you do
not want sitting in a public store listing forever.

### 2.2 Start the call — the "presenter" window

This is your normal Chrome window, the one with the extension in it.

1. Go to <https://meet.google.com> → **New meeting** → **Start an instant
   meeting**.
2. Switch the camera to OBS: **⋮** (bottom bar) → **Settings** → **Video** →
   **Camera** → **OBS Virtual Camera**. Close settings.
3. Turn on blur: **⋮** → **Backgrounds and effects** → **Blur your background**.
4. Copy the meeting link from the address bar.

### 2.3 Join as a viewer — the "viewer" window

Incognito windows run without extensions, so this one sees exactly what any
other participant would.

1. `Ctrl`+`Shift`+`N` for incognito. Paste the meeting link.
2. Turn its camera and mic **off**, type a name like `Viewer`, click **Ask to
   join**.
3. Back in the presenter window, click **Admit**.
4. In the viewer window, hover the presenter's tile → **⋮** → **Pin**.

---

## Part 3 — The five shots

For every shot the routine is the same:

1. Snip it with `Win`+`Shift`+`S`.
2. Open `store/screenshot-frame.html` by double-clicking it in Explorer.
3. Press `Ctrl`+`V` on that page, set the caption, click **Download PNG**.
4. Rename the download to the file name given for the shot.

Keep the composer open between shots; **Clear** empties it.

### Shot 1 — The result → `1-result.png`

What another person on the call sees.

1. In the **viewer** window press `F11`.
2. Wait until the bottom strip is mid-scroll, with a readable line centred.
3. `Win`+`Shift`+`S` → **Rectangle** → drag around the presenter's tile, roughly
   the shape of a laptop screen.
4. Composer: **Single image**, caption `Your name and details, on every call.`

Check before saving: the background is clearly blurred, the strip is sharp.

### Shot 2 — The proof → `2-blur.png`

Two halves: the same strip drawn before the blur on the left, after it on the
right. This is the one image no other overlay can produce.

The project's lab draws the strip both ways with the same renderer, so the
comparison is like for like.

1. Open a terminal in the `tickerline` folder and run:
   ```
   python -m http.server 8777
   ```
2. In Chrome open <http://localhost:8777/lab/>.
3. When Chrome asks for the camera, click the camera icon in the address bar and
   choose **OBS Virtual Camera**.
4. Choose the **Segmentation** pipeline and wait for the model to download, a
   few seconds.
5. Tick **Simulate Meet's own blur (strip drawn first)**. Snip the video. This is
   the **before**.
6. Untick it. Snip the video again. This is the **after**.
7. Composer: switch to **Split: before | after**, press **Clear**, then paste the
   before image, then the after image. The caption fills in as
   `Survives Meet's background blur.`

I have not been able to run the lab since the renderer was rewritten. If it
misbehaves, use this instead: in the viewer window, snip a closer rectangle
around the lower half of the presenter's tile, so the sharp strip edge against
the blurred room is the whole picture. Composer, single image, caption
`Stays sharp over Meet's background blur.`

Do not stage a fake "before". If the comparison is not real, ship the fallback.

### Shot 3 — The controls → `3-controls.png`

The popup open over a live call. One image carries most of the feature list.

The popup closes the instant anything else takes focus, and `Win`+`Shift`+`S`
takes focus. Use the Snipping Tool app with a delay instead:

1. In the **presenter** window, `Ctrl`+`Shift`+`B` to hide the bookmarks bar.
2. Start menu → **Snipping Tool**.
3. Set the delay dropdown (it says **No delay**) to **3 seconds**, then click
   **New**.
4. Within three seconds, click the Tickerline icon so the popup opens.
5. When the screen freezes, drag a rectangle covering the popup **and** the call
   beside it.
6. Click **Copy** in Snipping Tool, then paste into the composer. Caption
   `Set it once. Change it live, mid-call.`

Scroll the popup first so the preview and the bar controls are both in view.

### Shot 4 — The looks → `4-templates.png`

1. With the server from shot 2 still running, open
   <http://localhost:8777/lab/templates.html>.
2. Press `F11`.
3. Snip the grid of six.
4. Caption `Six looks, from keynote to newsroom.`

It shows example content by default. To show your own, edit the two `items`
lines near the top of `lab/templates.html` and refresh.

### Shot 5 — In a real call → `5-context.png`

Your tile is the only one carrying a strip. Everyone else is a name.

1. Get two or three more people into the call. Each needs a separate browser:
   - your phone, in the Meet app, camera off
   - Microsoft Edge, joining by the link as a guest
   - the incognito viewer window already in the call
2. In the **viewer** window: **⋮** → **Change layout** → **Tiled**. Unpin the
   presenter so all tiles show.
3. `F11`, snip the whole grid.
4. Caption `The one they remember after the call.`

---

## Part 4 — Clean up and check

1. In OBS click **Stop Virtual Camera**.
2. Stop the server with `Ctrl`+`C` in its terminal.
3. Switch Meet's camera back to your real webcam, or the next call will show the
   stock clip.

Before uploading, open each of the five files and check:

- [ ] 1280×800 exactly (right-click → Properties → Details)
- [ ] no employer name or logo anywhere, including in browser tabs
- [ ] no notifications, emails or personal tabs visible in a corner
- [ ] shot 1 still reads at a glance when you zoom out: the strip is the first
      thing you notice

## Part 5 — Upload

In the Chrome Web Store developer dashboard → your item → **Store listing** →
**Screenshots**, drag them in order 1 to 5. The order is the order shoppers
see them, and most only see the first.
