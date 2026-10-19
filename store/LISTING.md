# Chrome Web Store listing — Tickerline

Everything the Developer Dashboard asks for, written out. Field limits are noted
from the store's own guidance; confirm them in the dashboard, which is the only
place that enforces them.

---

## Name (max 75 characters)

```
Tickerline — Name & Contact Overlay for Google Meet
```

51 characters. The brand is on the left and the words people actually search are
on the right. Store search reads this field, so the keywords belong here rather
than in the brand itself.

**This is not typed into the dashboard.** The store title is the `name` field in
`extension/manifest.json`, and the dashboard cannot change it after upload; a new
title means a new version. It is already set. `short_name` keeps it to
"Tickerline" where space is tight.

## Summary / short description (max 132 characters)

```
Put your name, role and contact details on your camera in Google Meet. A clean broadcast strip that survives background blur.
```

124 characters. It leads with the outcome, then names the one thing competitors
cannot do.

## Category

`Productivity` → `Workflow & Planning`

Communication is the obvious choice and the wrong one: it is dominated by
messaging clients and the browsing intent there is different.

## Language

English (add others only with real translations; a machine-translated listing
reads worse than an English one).

---

## Detailed description

```
Your name, your role, your number — on your camera, where people actually look.

Tickerline draws a broadcast-style strip over your own video in Google Meet. A
title bar for your company or logo, and a ticker underneath for whatever you
want people to remember: your name and role, a phone number, a website.

No one has to squint at a tiny participant label or ask you to drop your details
in the chat again.


WHY IT LOOKS RIGHT WHEN OTHER OVERLAYS DO NOT

Meet runs your camera through its own background blur before sending it. Anything
drawn before that gets blurred along with the background, which is why overlays
usually come out smeared.

Tickerline draws after Meet's effects, onto the frames actually being sent. Your
text stays crisp over a blurred background. There is no AI model involved and no
extra load worth measuring: under a millisecond per frame.


WHAT YOU GET

• A scrolling ticker, or static text, or text that rotates between lines
• Two independent bars, each one movable and resizable
• Six looks: Keynote, Studio, Minimal, Editorial, Terminal, Broadcast
• Your logo, on its own or beside your text
• Alt+Shift+S to toggle the strip mid-call


YOUR OWN VIEW MATCHES THE CALL

Meet mirrors your self view, which makes any text in it read backwards to you.
Tickerline paints your own tile separately and un-mirrored, so what you see is
what everyone else is getting — not a mirrored, blurred approximation of it.


PRIVACY

Tickerline runs only on meet.google.com. Your settings and logo are stored on
your own computer. Nothing is sent to us, because there is no server to send it
to. The extension makes no network requests at all.

There is no account to create and nothing to sign into. Your settings live on
the computer you set them up on.


KNOWN LIMITS, UP FRONT

• Chrome and Edge only. It relies on insertable streams, which other browsers
  do not support yet.
• Google Meet only for now.
• The "glass" surface is translucency, not a true frosted blur.

Tickerline is not affiliated with or endorsed by Google. Google Meet is a
trademark of Google LLC.

Free, with no account, no trial and nothing to upgrade to. If it saves you
repeating your details on a call, you can buy me a coffee:
https://buymeacoffee.com/hrpatelishd

Questions or problems: harshvavaiya@gmail.com
Source and issue tracker: https://github.com/Harsh-Vavaiya/tickerline
```

### Contact fields in the dashboard

- **Contact email** (Account page, not the listing): `harshvavaiya@gmail.com`. The store
  requires it to be verified, and shows it publicly in the listing's contact
  section.
- **Homepage URL**: `https://harsh-vavaiya.github.io/tickerline/`
- **Support URL**: `https://github.com/Harsh-Vavaiya/tickerline/issues`
- **Privacy policy URL**: `https://harsh-vavaiya.github.io/tickerline/privacy.html`

---

## Privacy tab

### Single purpose

```
Tickerline adds a configurable text and logo overlay to the user's own outgoing
camera video on Google Meet, so other participants can see their name, role and
contact details during a call.
```

### Permission justifications

**`storage`**

```
Stores the user's own strip settings — text, colours, position, size, chosen
template and logo — on their device, so the strip is still configured the next
time they join a call. Everything is written to chrome.storage.local on the
user's own device and is never transmitted anywhere.
```

**Host permission `https://meet.google.com/*`**

```
The extension only does anything on Google Meet. It needs to run on meet.google.com
in order to draw the overlay onto the user's outgoing camera frames and to show
the same overlay on the user's own tile. No other site is accessed.
```

### Data usage disclosures

Tick **nothing** under "collected data" — and that is a factual claim worth
keeping true. For reference, when asked:

- Does your item collect personally identifiable information? **No.** The user
  may type their own name or phone number into the strip, but it is stored on
  their device and never transmitted to the developer.
- Health, financial, authentication, personal communications, location, web
  history, user activity, website content? **No** to all.
- Certify: not sold to third parties, not used or transferred for purposes
  unrelated to the single purpose, not used to determine creditworthiness. **Yes.**

### Privacy policy URL

`https://harsh-vavaiya.github.io/tickerline/privacy.html`

Served by GitHub Pages from `docs/`, generated from `store/PRIVACY.md` so the
hosted policy and the repository copy cannot drift apart.

---

## Screenshots (1280×800, full bleed, square corners, 1 to 5)

Order is the whole game: most people see the first one and nothing else.

**1 — The result.** The remote participant's view: your tile, blurred background,
the strip crisp across it. This is the product in one image.
Caption: `Your name and details, on every call.`

**2 — The reason to install.** Split frame: blur on, strip smeared (what happens
without this) on the left, Tickerline crisp on the right.
Caption: `Survives Meet's background blur.`

**3 — Control.** The popup open beside a live call, preview showing the same
strip.
Caption: `Set it once. Change it live, mid-call.`

**4 — Range.** The six templates as a grid.
Caption: `Six looks, from keynote to newsroom.`

**5 — Reach.** A grid call with three or four tiles, yours the one carrying the
strip, so the benefit is obvious in context.
Caption: `The one they remember after the call.`

Use `store/screenshot-frame.html` to compose each one: drop in a raw capture, it
scales to exactly 1280×800 and burns in the caption.

**`store/SCREENSHOTS.md` is the full capture guide**, including how to shoot
without putting your own face in the listing.

### Shooting notes

- Use real content, not "Your Company". A real name and a real-looking number
  sells it; placeholder text reads as unfinished.
- Turn background blur **on** for shots 1 and 2. The blur is the proof.
- Shoot at a decent window light. The strip looks best over a background with
  some tone to it rather than a flat white wall.

## Small promotional tile (440×280) — required

`store/promo-small-440x280.png`. No text, per the store's own guidance, and it
still reads at half size. Extensions without one are ranked below those with one.

## Marquee tile (1400×560) — optional

Skip for launch. It only appears if the store editorially features you.
