# HANDOFF — Mother's Day Game: Feedback + Share + Heart Fix

## Context
Adding a feedback widget, share UI on the final screen, and a heart-particle render fix to an existing live Mother's Day game distributed informally to friends & family.
- Live: https://jckilfoil-spec.github.io/mothers-day-game/
- Repo (assumed): github.com/jckilfoil-spec/mothers-day-game

## Locked scope

**Feedback widget**
- Floating "💌 Feedback" button, `position: fixed`, bottom-right
- Visible on all NON-gameplay screens (menu, intro, intermissions, final HAPPY MOTHERS DAY screen)
- Hidden during active gameplay via `body.gameplay-active` class toggle
- Click opens Tally popup modal — no custom form UI
- Tally form ID: `VLvlM6` (live at https://tally.so/r/VLvlM6)
- Notifications email: jckilfoil@gmail.com

**Share UI (final HAPPY MOTHERS DAY screen only)**
- Primary CTA: "🔗 Copy Link" — always visible
- Secondary CTA: "📤 Share" — feature-detected, renders only if `navigator.share` exists
- Copy fallback: `window.prompt()` for non-clipboard contexts
- Share URL: `https://jckilfoil-spec.github.io/mothers-day-game/`
- Pre-fill text: `Happy Mother's Day! 💌 Made you something — check it out:`

**Heart particle fix**
- Heart particles emitted from goals must render with FULLY FILLED interior
- Currently render as outline-only — read as "skulls" against light backgrounds
- Applies to ALL scenes (beach + any others where hearts emit)
- No change to color, size, animation, or emission rate

**Anti-scope (do NOT add)**
- No backend, no email-sending service, no email-input field
- No auth, no analytics, no rate limiting
- No mailto button (cut deliberately)
- No in-app feedback list, voting, or submission status
- No redesign of heart animation/particle physics

## Stack
- Existing static site on GitHub Pages
- Tally embed: `https://tally.so/widgets/embed.js`
- Web Share API: `navigator.share` (feature-detected)
- Clipboard API: `navigator.clipboard.writeText` (with `prompt()` fallback)
- No new dependencies, no build-step changes assumed

## File structure
Inspect repo to identify (locations not assumed in this handoff):
- Entry HTML file (likely `index.html`)
- Final-screen markup container (search for "HAPPY MOTHERS DAY" or equivalent text)
- Gameplay state machine — where scenes/screens transition
- Heart particle definition — grep `heart` in render/sprite/particle code
- Existing brand color palette — CSS custom properties or color constants

## Build order (gated)

1. **Feedback widget**
   - Add Tally embed script to `<head>`
   - Add floating button + styles before `</body>`
   - Wire `body.gameplay-active` toggle into game state machine (start AND end of gameplay)
   - **Gate:** button visible on all non-gameplay screens; hidden during gameplay; tap opens Tally; test submission arrives at jckilfoil@gmail.com

2. **Share UI**
   - Insert share container into final-screen markup (below heading/visuals)
   - Add CSS + JS as specified below
   - **Gate:** copy-link works on Chrome desktop, Safari iOS, Chrome Android; share-sheet appears only on iOS/Android; clipboard contains exact share URL

3. **Heart fill fix**
   - Locate heart particle source
   - Change to solid fill (investigation order below)
   - **Gate:** hearts render fully filled on every scene; no regression to size/color/animation/emission rate

## Implementation specifics

### Feedback button (insert before `</body>`; script in `<head>`)

```html
<!-- in <head> -->
<script async src="https://tally.so/widgets/embed.js"></script>

<!-- before </body> -->
<button
  class="feedback-btn"
  data-tally-open="VLvlM6"
  data-tally-layout="modal"
  data-tally-width="500"
  data-tally-emoji-text="💌"
  data-tally-emoji-animation="wave"
  type="button"
  aria-label="Leave feedback">
  💌 Feedback
</button>

<style>
  .feedback-btn {
    position: fixed;
    bottom: 16px;
    right: 16px;
    z-index: 9999;
    padding: 10px 18px;
    border: none;
    border-radius: 999px;
    background: #E91E63;
    color: #fff;
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    opacity: 0.9;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transition: transform 0.15s ease, opacity 0.15s ease;
    min-height: 44px;
  }
  .feedback-btn:hover,
  .feedback-btn:focus-visible { transform: scale(1.05); opacity: 1; }
  body.gameplay-active .feedback-btn { display: none; }
  @media (max-width: 600px) {
    .feedback-btn {
      bottom: 12px; right: 12px; font-size: 13px; padding: 9px 14px;
    }
  }
</style>
```

**State toggle:** add `document.body.classList.add('gameplay-active')` at gameplay start; `.remove('gameplay-active')` at gameplay end. Hook into existing scene transitions.

### Share UI (insert into final-screen markup)

```html
<div class="share-container">
  <button class="share-btn share-btn-primary" id="share-copy" type="button">🔗 Copy Link</button>
  <button class="share-btn share-btn-secondary" id="share-native" type="button" hidden>📤 Share</button>
</div>

<style>
  .share-container {
    display: flex; gap: 12px; justify-content: center;
    margin-top: 24px; flex-wrap: wrap;
  }
  .share-btn {
    padding: 12px 24px; border: none; border-radius: 999px;
    font-family: inherit; font-size: 15px; font-weight: 600;
    cursor: pointer; min-height: 44px;
    transition: transform 0.15s ease, background 0.15s ease;
  }
  .share-btn:hover, .share-btn:focus-visible { transform: scale(1.05); }
  .share-btn-primary { background: #E91E63; color: #fff; }
  .share-btn-secondary { background: #fff; color: #E91E63; border: 2px solid #E91E63; }
  .share-btn.copied { background: #4CAF50; color: #fff; }
</style>

<script>
(function () {
  const SHARE_URL = 'https://jckilfoil-spec.github.io/mothers-day-game/';
  const SHARE_TITLE = "Happy Mother's Day! 💌";
  const SHARE_TEXT = "Happy Mother's Day! 💌 Made you something — check it out:";
  const COPIED_DURATION_MS = 2000;
  const copyBtn = document.getElementById('share-copy');
  const nativeBtn = document.getElementById('share-native');

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(SHARE_URL);
    } catch (err) {
      window.prompt('Copy this link:', SHARE_URL);
      return;
    }
    const original = copyBtn.textContent;
    copyBtn.textContent = '✓ Copied!';
    copyBtn.classList.add('copied');
    setTimeout(() => {
      copyBtn.textContent = original;
      copyBtn.classList.remove('copied');
    }, COPIED_DURATION_MS);
  });

  if (navigator.share) {
    nativeBtn.hidden = false;
    nativeBtn.addEventListener('click', async () => {
      try {
        await navigator.share({ title: SHARE_TITLE, text: SHARE_TEXT, url: SHARE_URL });
      } catch (err) { /* user canceled, no-op */ }
    });
  }
})();
</script>
```

### Heart particle fix — investigation order

1. Grep `heart` across render/sprite/particle code
2. Inspect the heart definition's fill behavior:
   - **SVG `<path>`:** change `fill="none"` → `fill="<heartColor>"`; remove or thin stroke
   - **CSS-drawn (pseudo-elements):** add `background-color` to the shape pseudo-elements
   - **Texture/PNG/SVG asset:** replace asset with filled version
3. Verify across all scenes that emit hearts (not just beach)

### Constants

| Constant | Value |
|---|---|
| Tally form ID | `VLvlM6` |
| Notification email | jckilfoil@gmail.com |
| Share URL | `https://jckilfoil-spec.github.io/mothers-day-game/` |
| Gameplay body class | `gameplay-active` |
| Floating button z-index | 9999 |
| Button position (desktop) | bottom: 16px, right: 16px |
| Button position (mobile, ≤600px) | bottom: 12px, right: 12px |
| Min touch target | 44px |
| Copied-state duration | 2000ms |
| Pink fallback | `#E91E63` |
| Copied-state green | `#4CAF50` |

## Risks

- **Brand colors unknown** → inspect existing CSS custom properties first; fall back to `#E91E63` only if no palette found.
- **Gameplay state machine location unknown** → grep scene/screen transitions; instrument both start AND end.
- **Heart asset format unknown** → inspect particle source before fixing; try cheapest fix first (fill attr) before replacing assets.
- **Tally notifications may not be configured** → verify in Tally dashboard that email notification is enabled and pointed at jckilfoil@gmail.com; submit a test post-deploy.
- **Web Share API absent on desktop** → handled (button `hidden` by default; JS unhides only when API present).
- **Clipboard API unavailable / non-HTTPS** → handled (`prompt()` fallback). GitHub Pages is HTTPS so rare.

## Cut list (drop top-down)

1. Hover scale animations on share/feedback buttons
2. Tally emoji bounce (`data-tally-emoji-animation="wave"`)
3. Pink fallback color (replace with existing brand variable directly)

**Cannot cut:** Tally embed, feedback button gameplay-hide toggle, copy-link button, heart fill fix.

## Done definition

**Feedback**
- [ ] Button visible bottom-right on all non-gameplay screens (desktop + mobile)
- [ ] Button hidden during active gameplay
- [ ] Touch target ≥44px
- [ ] Tap opens Tally modal
- [ ] All 4 Tally form fields render with correct required/optional state
- [ ] Submission triggers email to jckilfoil@gmail.com (verified by test submit)
- [ ] No console errors

**Share**
- [ ] Copy Link button visible on final HAPPY MOTHERS DAY screen on every device
- [ ] Tap copies the exact share URL to clipboard
- [ ] "✓ Copied!" appears for ~2s then reverts
- [ ] Share button visible only when `navigator.share` exists
- [ ] Share invokes native OS share sheet with pre-filled title/text/URL
- [ ] Both buttons ≥44px

**Heart fix**
- [ ] Hearts render fully filled (solid interior) on every emitting scene
- [ ] No regression to size/color/animation/emission rate

**Global**
- [ ] Lighthouse mobile score does not regress >5 points vs. baseline
- [ ] Verified on Chrome desktop, Safari iOS, Chrome Android

## Open questions

- **Repo path / push access** — confirm `github.com/jckilfoil-spec/mothers-day-game` is correct and Code has write access.
- **Brand accent color** — does existing CSS define a primary/accent variable? If yes, use it instead of `#E91E63`.

## Receiving agent instructions

Do not deviate from locked scope without explicit human approval. If a locked decision conflicts with implementation reality, stop and ask.
