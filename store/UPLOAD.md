# First upload to the Chrome Web Store

Everything to paste lives in `store/LISTING.md`. This file is the order to do
it in. Allow about 30 minutes, then a review that usually takes a few days.

## What you need open

| Thing | Where |
|---|---|
| The extension zip | <https://github.com/Harsh-Vavaiya/tickerline/releases/latest> → `tickerline-v….zip`. Upload the zip as it is; do not unzip it. |
| Listing text | `store/LISTING.md` |
| Store icon | `store/icon-store-128.png` |
| Promo tile | `store/promo-small-440x280.png` |
| Screenshots | `store/1-result.png` … `store/5-context.png` |

---

## Step 1 — Developer account (once)

1. Go to <https://chrome.google.com/webstore/devconsole>.
2. Sign in with the Google account that should own the listing. **The email
   cannot be changed later**, and a personal account keeps a personal project
   separate from work.
3. Accept the developer agreement and pay the one-time registration fee. The
   amount is shown at checkout.
4. If asked about **trader status**, read the definitions carefully. It governs
   EU consumer-law disclosures; a free extension with an optional tip jar is a
   question to answer honestly rather than one with an obvious answer.

## Step 2 — Upload the package

1. **+ New item** → choose the zip → **Upload**.
2. The dashboard reads the title and summary from the zip. Check they show as:
   - **Tickerline — Name & Contact Overlay for Google Meet**
   - *Put your name, role and contact details on your camera in Google Meet. A
     clean broadcast strip that survives background blur.*

   Neither can be edited in the dashboard. A mistake here means a new version.

## Step 3 — Store listing tab

| Field | What to enter |
|---|---|
| Description | The whole block under **Detailed description** in `LISTING.md` |
| Category | Productivity (closest match to *Workflow & Planning*) |
| Language | English |
| Store icon | `icon-store-128.png` |
| Screenshots | Drag in **1 → 5, in order**. Most people only see the first. |
| Small promo tile | `promo-small-440x280.png` |
| Marquee | Leave empty |
| Homepage URL | `https://harsh-vavaiya.github.io/tickerline/` |
| Support URL | `https://github.com/Harsh-Vavaiya/tickerline/issues` |

**Save draft.**

## Step 4 — Privacy tab

| Field | What to enter |
|---|---|
| Single purpose | The block under **Single purpose** in `LISTING.md` |
| `storage` justification | The `storage` block in `LISTING.md` |
| Host permission justification | The `meet.google.com` block in `LISTING.md` |
| Are you using remote code? | **No.** Everything the extension runs is inside the zip. (The `lab/` pages load models from a CDN, but they are not part of the extension.) |
| Data usage | Tick **nothing**. Then tick all three certifications. |
| Privacy policy URL | `https://harsh-vavaiya.github.io/tickerline/privacy.html` |

**Save draft.**

## Step 5 — Distribution tab

- **Visibility: Unlisted** for the first release. Review is the same, but only
  people with the link can find it, so you can install it from the store
  yourself and check it before the world sees it. Switch to Public afterwards;
  that needs no new review.
- Regions: all.
- Payments: free.

## Step 6 — Test instructions (for the reviewer)

Reviewers reject what they cannot exercise. Paste:

```
No account or sign-in is needed for the extension itself.

1. Open https://meet.google.com and start an instant meeting with the camera on.
2. Click the Tickerline icon in the toolbar to set the text; a live preview
   shows the result.
3. The strip appears on your own video tile immediately.
4. To see exactly what other participants receive, join the same meeting from
   a second browser or an incognito window (where extensions are off): the
   strip is part of the transmitted video.
5. Turn on background blur (⋮ → Backgrounds and effects → Blur): the strip
   stays sharp. Alt+Shift+S toggles it.

The extension runs only on meet.google.com, stores settings locally with
chrome.storage.local, and makes no network requests.
```

## Step 7 — Submit

1. **Submit for review.**
2. Leave *Publish automatically after review* **on** for an unlisted first
   release.
3. Review usually takes a few days. Extensions that touch the camera can take
   longer. You get an email either way.

## If it is rejected

The email names the policy. The usual ones for an extension like this, and
where the answer already is:

- **Single purpose / permissions unclear** → the justification text in
  `LISTING.md`; make sure it was pasted in full.
- **Privacy policy missing or unreachable** → the URL above; it is checked by
  tests on every push.
- **Misleading screenshots or trademark use** → the description says Tickerline
  is not affiliated with Google; shot 2 is a real comparison, not a mockup.

Reply through the dashboard rather than resubmitting blind.

## After it is live

- Install it from the store listing yourself, on a clean profile, and run a
  call. The store build should behave like the one you load unpacked.
- Future updates: every push to `main` cuts a new release zip. Upload the newest
  one under **Package → Upload new package**. Version numbers only go up, which
  the release workflow already guarantees.
