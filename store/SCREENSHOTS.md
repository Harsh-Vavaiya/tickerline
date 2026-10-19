# Capture guide — the five store screenshots

The store allows **five screenshots at most**, 1280×800, full bleed, square
corners. Most people look at the first one and nothing else, so the order below
is deliberate: result, then proof, then control, then range, then context.

Compose every shot through `store/screenshot-frame.html`. Drop in a raw capture,
it scales to exactly 1280×800 and burns in the caption.

---

## Shooting without your face

Meet's background blur works by finding a person in the frame. Point the camera
at an empty desk and there is nothing to segment, so shot 2 — the one that sells
the extension — stops working. The feed needs a person-shaped subject.

**Use OBS Virtual Camera.** It is already installed, and unlike Chrome's fake
camera flags it works in your normal browser profile, so the extension stays
loaded and you stay signed in to Google.

1. Open OBS → Sources → **+** → **Media Source** → pick a video file. Tick
   *Loop*.
2. Resize it to fill the canvas (Ctrl+F fits it to screen).
3. Controls → **Start Virtual Camera**.
4. In Meet: Settings → Video → Camera → **OBS Virtual Camera**.
5. Shoot the screenshots. Stop Virtual Camera when you are done.

For the subject itself, in order of how convincing the result looks:

- **Someone who agrees to it.** A colleague or friend on a short clip. Best
  result, no licensing question, and they can be told exactly what it is for.
- **Licensed stock footage of a person.** Pexels and Pixabay have free clips of
  people at desks. Check the licence covers commercial use. Be aware that a
  store listing is promotional: showing an identifiable person can imply they
  endorse the product, which is what model releases exist for. Prefer footage
  whose licence is explicit about commercial use.
- **A rendered stand-in.** No licensing question at all and no real person, but
  it reads as a mockup rather than a product in use, which costs you credibility
  on the one shot that has to convince.

Whatever you pick, the strip content should be **your own** name, role and
contact details. Do not use an employer's name or logo.

Shots 3 and 4 need no camera at all: the popup draws its own preview and the
template gallery renders its own scene. Neither contains a face.

---

## 1 — The result

What the other person sees: your tile, background blurred, the strip crisp
across it.

- Blur **on**.
- Bottom bar scrolling, caught mid-scroll so it reads as a ticker.
- Logo in the top bar if you have one.
- Capture from the **second account**, not your own tile, so it is genuinely the
  received video rather than your local overlay.

Caption: `Your name and details, on every call.`

## 2 — The reason to install

A split frame. Left: blur on with the strip drawn before Meet's effects, smeared
— this is what every other overlay produces. Right: Tickerline, crisp.

This is the only image in the set no competitor can produce. It is worth the
extra effort of staging both halves.

To stage the "before" half, turn the strip off and put any other overlay in the
frame, or capture an older build. Do not fake it: if the comparison is not real,
do not ship the shot.

Caption: `Survives Meet's background blur.`

## 3 — Control

The popup open, its live preview showing the same strip. One image carries most
of the feature list: two bars, motion mode, position and size sliders,
typeface, weight, tracking, colours.

- Scroll the popup so the preview and a good spread of controls are both visible.
- Have real content in the fields, not the defaults.

Caption: `Set it once. Change it live, mid-call.`

## 4 — Range

The six templates side by side. Open `lab/templates.html` and capture the grid.

Caption: `Six looks, from keynote to newsroom.`

## 5 — Context

A grid call with three or four tiles, yours the only one carrying a strip. This
is where the benefit becomes obvious: everyone else is a name label, you are a
business card.

Caption: `The one they remember after the call.`

---

## What will not fit in five images

Put these in the description instead, which is where people look once a
screenshot has earned their attention:

- `Alt+Shift+S` to toggle mid-call
- the status badge on your own tile
- un-mirrored self view
- nothing leaving your computer

## Before you upload

- Every shot exactly 1280×800, no padding, square corners.
- No employer name, logo, or real phone number you do not want public.
- Shot 1 reads at thumbnail size: squint at it, and the strip should still be
  the thing you notice.
