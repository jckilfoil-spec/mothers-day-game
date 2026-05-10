# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Where active handoff docs live:** `C:\Users\johnk\OneDrive\Documents\Claude\Projects\Mother's Day Game\HANDOFF.md` (NOT the `HANDOFF.md` in this repo — that one is a stale historical snapshot). When asked to "check the handoff," read the OneDrive path first.

## Commands

```bash
npm run dev          # vite dev server on :5173
npm run build        # tsc --noEmit && vite build → dist/
npm run preview      # serve dist/ locally
npm test             # vitest run (one-shot)
npm run test:watch   # vitest watch
npm run typecheck    # tsc --noEmit only

# Single test file
npx vitest run tests/physics.test.ts

# Single test by name
npx vitest run -t "honors jump-buffer"
```

`npm run build` runs `tsc --noEmit` first, so a successful `build` implies a clean typecheck.

Deployment: pushes to `main` auto-deploy to GitHub Pages via `.github/workflows/pages.yml`. Live at `https://jckilfoil-spec.github.io/mothers-day-game/`.

## Architecture

Vanilla TypeScript + HTML5 Canvas + Vite. **No UI framework, no game engine, no image assets, no audio assets.** All visuals are drawn procedurally on canvas, all SFX are generated via Web Audio API.

### Boundaries (read this before adding anything)

- **`src/state.ts`** — only file allowed to touch `localStorage`. Owns keys `mdg.characters`, `mdg.settings`, `mdg.schema`. If localStorage is unavailable (private mode / quota), it transparently falls back to an in-memory store so the game keeps working but won't survive reload. Use `_setStoreForTests()` to swap the store in tests.
- **`src/game/physics.ts`** — pure functions, no DOM/canvas/audio. `stepPlayer`, `stepEnemies`, `stepHazards`, `applyClickDamage`, `applyHazardBounce`, `respawnIfFell`, `reachedGoal` mutate input state in place but are otherwise stateless. This is what makes the suite in `tests/physics.test.ts` possible.
- **`src/game/render.ts`** — painters that take a `CanvasRenderingContext2D` and an opts object. Used both for the live game *and* the map-select preview tiles, so changes here ripple to both. The `C` color table at the top mirrors `tokens.css` — keep them in sync if you change the palette.
- **`src/game/game.ts`** — owns the loop, the camera, the running level, the death-mode HP/lives bookkeeping. Lifecycle: `new Game(canvas, opts, callbacks)` → `game.start()` → `game.destroy()`. Also exposes `pause()` / `resume()` (used when the settings overlay is open — the timer credits paused time back on resume), `refresh()` (re-read zoom and resize), and `refreshCharacter()` (mid-run hero swap; preserves position/timer/run progress, swaps face + lives). The screen wrapper (`screens/game.ts`) is responsible for calling `destroy()` on cleanup.
- **`src/main.ts`** — owns two global body-class toggles: `body.gameplay-active` (true while the game screen is mounted, hides the Tally feedback button via `body.gameplay-active .feedback-btn { display: none }`) and `body.final-screen` (true on the win route, hides the cookie consent banner so it doesn't sit over the celebration). Also where every screen transition fires a `screen_viewed` analytics event with timing for the previous screen. Any future "in gameplay vs. out of gameplay" CSS hooks should ride on these classes.
- **`src/analytics.ts`** — typed `track(event, props)` wrapper that forwards to `window.track`. The actual PostHog init + cookie-consent gating + global error listeners + Tally postMessage handler all live in the inline `<script>` in `index.html` (must run in `<head>` BEFORE other custom scripts so the no-op shim is in place from the first frame). Pre-consent (or after Decline), `window.track` is a no-op — call sites are safe to fire without checking consent. Session recording is enabled with `maskAllInputs: true` (non-negotiable per the OneDrive HANDOFF). Privacy page lives at `public/privacy.html` and ships to dist root.
- **`src/router.ts`** — single `Route` union; screens take `(root, nav, route)` and may return a cleanup function. Cleanup is invoked before mounting the next screen.

### Data flow

```
main.ts ─→ Router ─→ screens/* ─→ state.ts (persistence)
                                ↘ game/game.ts ─→ physics.ts (pure)
                                                ↘ render.ts (paint)
                                                ↘ player.ts / enemy.ts (paint)
                                                ↘ input.ts (kbd + touch)
                                                ↘ audio/sounds.ts (Web Audio)
```

### Non-obvious choices

1. **`face-api.js` is intentionally _not_ used.** The original spec (`docs/spec.md`) called for it; the production decision was to ship the manual circle-drag crop only. Models are 6MB+ and load slowly; manual crop is faster, more reliable, and entirely offline. If you want to add face-api back, the integration point is `characterEditor.ts:handleFile`.
2. **No gameplay image or audio asset files.** The brand asks for a "painted, watercolor" feel — I get there with layered alpha gradients and soft-blob ellipses (`render.ts:softBlob`). Audio is short oscillator+envelope routines (`audio/sounds.ts:tone`). A consequence: changing `tokens.css` or the `C` table in `render.ts` is enough to re-skin the entire game. The *only* image assets in the repo are the brand mark + unfurl pair: `public/icon.svg` (source) plus `public/icon-180.png` (iOS apple-touch-icon) and `public/og-image.png` (1200×1200 unfurl card). Regenerate the PNGs from the SVG with `npm install --no-save sharp && node scripts/generate-icons.mjs` — sharp is intentionally NOT a permanent devDep.
3. **No ambient pads.** `audio/sounds.ts` exports `startAmbient` for legacy reasons but nothing in `src/` calls it — the ship decision was SFX only. Don't wire it up without an explicit ask.
4. **Tally feedback widget lives in `index.html`, not in TS.** It's a third-party `<script async>` plus a single `<button class="feedback-btn">`. The hide-during-gameplay rule is enforced from `main.ts` via `body.gameplay-active`, not from the game loop.

### Coordinate systems

- World: Y increases downward. **Mountain** is 720×2400, player starts near `y≈2280` at the base, goal near `y≈128` at the top, `scrollDir = -1` (climb), `progressAxis = 'y'`. **Cave** is 720×2400, player starts near `y≈-8` at the top opening, goal near `y≈2280` at the bottom, `scrollDir = 1` (descend), `progressAxis = 'y'`. **Beach** and **Car** are 2800×720 horizontals, `scrollDir = 0`, `progressAxis = 'x'`. Both vertical worlds have a solid floor platform at `y = level.height - 32` so falling off mid-game won't trigger respawn — only falling all the way past `y > level.height + 200` does (see `physics.ts:respawnIfFell`).
- Camera: smooth-follows player with a small lookahead bias (`facing * 100` on X, `scrollDir * -80` on Y), then clamps to world bounds. On viewports wider than the world, the world is centered horizontally. World rendering is also scaled by `worldScale` (1.0 on phones, up to ~1.3 on desktop, multiplied by the user's saved `zoom` setting).
- Click handling: `Game.handleClick` converts canvas pixels to world coords via `worldScale` *and* the camera, then walks the enemy list. Update both transforms together if you change one.

### How to add a new map

1. Add a scene paint function in `src/game/render.ts` (mirror `paintMountainScene` / `paintBeachScene` / `paintCarScene` / `paintCaveScene`).
2. Add a level factory in `src/game/levels.ts` returning `LevelData`. Include `hazards: []` if none. For **vertical** levels set `scrollDir: -1` (climb) or `1` (descend) and `progressAxis: 'y'`. For **horizontal** levels set `scrollDir: 0` and `progressAxis: 'x'`.
3. Add the map id to the `MapId` union in `src/state.ts`.
4. Wire the new tile + preview painter into `src/screens/mapSelect.ts`.
5. Extend the level-factory ladder in `src/screens/game.ts` (the `mapId === 'mountain' ? makeMountainLevel() : ...` chain near the top) to construct your level.
6. In `src/game/game.ts:draw()`, switch on the new id for both the **background scene** painter (the first switch, ~`game.ts:424`) and the **goal sprite** painter (the second switch, ~`game.ts:469`).
7. In `goalColor()` + `goalEmoji()` (bottom of `game.ts`), add a case for the progress-bar cap.
8. In `src/game/player.ts:drawStaff()`, add an orb color case so the staff matches the world.
9. Add a test in `tests/levels.test.ts` asserting valid start/goal/floor + any new hazard invariants.

### Hazards (bouncy, never lethal by default)

The contract:

- A `Hazard` is a `Rect` with a `variant` and optional motion fields (`speed`, `dir`, `minX`, `maxX` for patrols; `vy` for falling projectiles like seagull poop).
- Each frame `applyHazardBounce` checks player overlap. On hit it sets `player.vy = -14`, pushes horizontally away from the hazard center, and starts a 45-frame `hurtT` invincibility window.
- During `hurtT > 0`, hazards are ignored (so the player doesn't infinite-bounce inside one) and `drawPlayer` flickers the sprite alpha so the state is visible.
- The bounce + horizontal push is enough to reliably escape; if it ever isn't, increase `hurtFrames`.

To add a new hazard variant: add to the `Hazard.variant` union, paint it in `render.ts`, and dispatch in `game.ts:draw()`.

### Death mode (opt-in damage)

Off by default; toggled from the in-game gear → settings panel.

- When `settings.deathMode` is true, every hazard bounce also costs **1 of 5 HP**. At 0 HP, `Game.startDying()` plays a 60-frame red-wash overlay, then `handleLifeLost` runs.
- `loseLife(characterId)` decrements `Character.livesLeft` (default 3) in storage. If it hits 0, `deleteCharacter` runs and `onCharacterLost` callback navigates to the character picker — the character is gone for good. Otherwise the player respawns at `level.playerStart` with full HP and a 60-frame invincibility window.
- The settings panel surfaces a "Reset {name}'s lives to 3" button when the active character is below 3.
- Pure SFX/visuals don't run in death mode unless `settings.deathMode` is on — the rest of the game stays whimsy-by-default.

## Testing notes

- Tests run under `jsdom`. **`HTMLCanvasElement.getContext('2d')` is unavailable in jsdom**, so anything that calls into canvas (cropping, painting, the live game loop) is exercised in the browser only — not in the suite. The pure physics layer is fully testable.
- `tests/state.test.ts` swaps in an in-memory store via `_setStoreForTests` so each test gets a clean slate.

## Things that look weird but are intentional

- `src/util/dom.ts:el()` does direct property assignment for non-string attribute values (so `disabled={true}` Just Works). This is why event handlers can be passed as `onclick: fn` — they're stripped of the `on` prefix and passed to `addEventListener`.
- The player's `x` position is resolved against platforms *before* `y` to avoid corner-snag. See `physics.ts:stepPlayer` "Integrate + resolve" block.
- `Game.update()` runs at a fixed 60Hz step using an accumulator, even though `draw()` runs at the display's refresh rate. This means physics is deterministic across devices.
- `Game.pause()` records `pausedAt`; `resume()` shifts `startedAt` forward by the paused duration so `elapsedMs()` excludes time-in-menus. Don't try to "freeze" the timer by mutating `completedAt` — that path is reserved for win.
- The settings overlay can swap the active character mid-run. `Game.refreshCharacter()` rereads selection, swaps the face image and `livesLeft`, and leaves position/velocity/timer untouched. Anything else that depends on character identity (e.g. the HUD chip) needs a parallel refresh — see `screens/game.ts:renderChip`.
- `?touch=1` URL param forces the touch-controls layout regardless of pointer type. `public/mobile-audit.html`'s second iframe row uses it to audit the real D-pad UX, since `@media (pointer: coarse)` doesn't fire inside iframes. Read in `src/main.ts` (sets `body.force-touch`); CSS fork in `src/styles/app.css` mirrors the `pointer: coarse` rules under that class.
