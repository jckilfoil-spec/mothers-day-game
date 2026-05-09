# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

`npm run build` runs `tsc --noEmit` first, so a successful `build` implies a clean typecheck. The whole production bundle is ~13KB JS / ~3.5KB CSS gzipped.

## Architecture

Vanilla TypeScript + HTML5 Canvas + Vite. **No UI framework, no game engine, no image assets, no audio assets.** All visuals are drawn procedurally on canvas, all SFX are generated via Web Audio API.

### Boundaries (read this before adding anything)

- **`src/state.ts`** — only file allowed to touch `localStorage`. Owns keys `mdg.characters`, `mdg.settings`, `mdg.schema`. If localStorage is unavailable (private mode / quota), it transparently falls back to an in-memory store so the game keeps working but won't survive reload. Use `_setStoreForTests()` to swap the store in tests.
- **`src/game/physics.ts`** — pure functions, no DOM/canvas/audio. `stepPlayer`, `stepEnemies`, `applyClickDamage`, `respawnIfFell`, `reachedGoal` mutate input state in place but are otherwise stateless. This is what makes the suite in `tests/physics.test.ts` possible.
- **`src/game/render.ts`** — painters that take a `CanvasRenderingContext2D` and an opts object. Used both for the live game *and* the map-select preview tiles, so changes here ripple to both. The `C` color table at the top mirrors `tokens.css` — keep them in sync if you change the palette.
- **`src/game/game.ts`** — owns the loop, the camera, the running level. Lifecycle: `new Game(canvas, opts, callbacks)` → `game.start()` → `game.destroy()`. The screen wrapper (`screens/game.ts`) is responsible for calling `destroy()` on cleanup.
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

### Two non-obvious choices

1. **`face-api.js` is intentionally _not_ used.** The original spec (`docs/spec.md`) called for it; the production decision was to ship the manual circle-drag crop only. Models are 6MB+ and load slowly; manual crop is faster, more reliable, and entirely offline. If you want to add face-api back, the integration point is `characterEditor.ts:handleFile`.
2. **No image or audio asset files exist.** The brand asks for a "painted, watercolor" feel — I get there with layered alpha gradients and soft-blob ellipses (`render.ts:softBlob`). Audio is short oscillator+envelope routines (`audio/sounds.ts:tone`). A consequence: changing `tokens.css` or the `C` table in `render.ts` is enough to re-skin the entire game.

### Coordinate systems

- World: Y increases downward. Mountain world is 720×3600 (player starts near `y=3500`, goal near `y=200`, `scrollDir = -1`). Cave world is 720×3600 (player starts near `y=80`, goal near `y=3360`, `scrollDir = 1`). Both worlds have a floor platform at `y = WORLD_H - 32` so falling off mid-game won't trigger respawn — only falling all the way past `y = WORLD_H + 200` does.
- Camera: smooth-follows player with a small lookahead bias in `scrollDir`, then clamps to world bounds.
- Click handling: `Game.handleClick` converts canvas pixels to world coords via the camera, then walks the enemy list.

### How to add a new map

1. Add a paint function in `src/game/render.ts` (mirror the structure of `paintMountainScene` / `paintCaveScene`).
2. Add a level factory in `src/game/levels.ts` returning `LevelData`.
3. Add the map to the `MapId` union in `src/state.ts`.
4. Wire the new tile into `src/screens/mapSelect.ts`.
5. Switch on the new id inside `src/game/game.ts:draw()` for the background painter.
6. Add a test in `tests/levels.test.ts` asserting a valid start/goal/floor.

## Testing notes

- Tests run under `jsdom`. **`HTMLCanvasElement.getContext('2d')` is unavailable in jsdom**, so anything that calls into canvas (cropping, painting, the live game loop) is exercised in the browser only — not in the suite. The pure physics layer is fully testable.
- `tests/state.test.ts` swaps in an in-memory store via `_setStoreForTests` so each test gets a clean slate.

## Things that look weird but are intentional

- `src/util/dom.ts:el()` does direct property assignment for non-string attribute values (so `disabled={true}` Just Works). This is why event handlers can be passed as `onclick: fn` — they're stripped of the `on` prefix and passed to `addEventListener`.
- The player's `x` position is resolved against platforms *before* `y` to avoid corner-snag. See `physics.ts:stepPlayer` "Integrate + resolve" block.
- `Game.update()` runs at a fixed 60Hz step using an accumulator, even though `draw()` runs at the display's refresh rate. This means physics is deterministic across devices.
