# A Game for Mom 🌸

A warm, painted-style platformer where you upload a photo of mom (or anyone you love) and they become the hero of a tiny adventure. Built as a Mother's Day gift, released open source so anyone can fork it and make their own.

> _"Climb the mountain. Or descend the cave. Either way, mom wins."_

![brand banner](docs/brand_preview.svg)

## Play

The game runs in any modern browser — no install, no account.

1. Click **Start**.
2. Tap **Add character** and pick a photo. Drag the circle to frame the face, slide to resize, hit **Looks good →**.
3. Give them a name and a personal Mother's Day message.
4. Pick an adventure:
   - **Hike the Mountain!** — climb to the flag at the top.
   - **Go Spelunking!** — drop down through one-way ledges to the glowing crystal.
   - **Hunt for Sharkteeth!** — sprint across hot sand, click seagulls out of the sky before they drop on you, find the shark tooth at the end.
   - **Drive Home** — spam-click cell phones off the road, dodge patrolling cars, reach the family at home.
5. **Arrows** or **A/D** to move. **Space** or **↑** to jump (you can jump _through_ platforms from below). **↓** to drop down through a platform. **Click** monsters and phones to defeat them. Live timer below the progress bar; final time on the win screen.

Touch devices get on-screen controls instead of the keyboard.

Faces, names, and custom messages live in your browser's `localStorage` only — they never leave the device. Anonymous usage analytics (page views, button clicks, level progress, time on each screen, and session recordings with all text inputs masked) are collected via [PostHog](https://posthog.com) **only after you accept the cookie banner**. Decline and the game runs with zero tracking. See [`/privacy.html`](./public/privacy.html) for the full privacy note.

## Run it locally

Requires Node 18+ (tested on Node 24).

```bash
npm install
npm run dev          # local dev server at http://localhost:5173
npm run build        # production build → dist/
npm run preview      # serve the production build
npm test             # one-shot test run
npm run test:watch   # watch mode
npm run typecheck    # TypeScript only, no emit
```

## Architecture (one screen)

```
src/
  main.ts                  entry — wires Router to screens
  router.ts                tiny in-memory router (Route union, mountFn callback)
  state.ts                 localStorage CRUD for Character + Settings
  audio/sounds.ts          procedural Web Audio SFX + ambient pads (no audio files)
  screens/
    title.ts               watercolor sunrise + Start CTA
    characterManager.ts    grid of cards (add / edit / delete / select)
    characterEditor.ts     upload → drag-circle crop → name + message
    mapSelect.ts           Mountain or Cave preview tiles
    game.ts                fullscreen canvas + HUD + touch controls
    win.ts                 confetti + "Happy Mother's Day, {Name}!"
  game/
    types.ts               Player/Enemy/Level/Input shapes + PHYSICS constants
    physics.ts             pure step functions (gravity, collision, jump, click damage)
    input.ts               keyboard + touch button input aggregator
    player.ts              robe + slipper + Gandalf staff procedural draw
    enemy.ts               rock/slime body + emoji face + HP bar + defeat puff
    levels.ts              Mountain & Cave level data factories
    render.ts              painted-feel scene painters (shared between game + map preview)
    rng.ts                 seeded mulberry32
  util/
    dom.ts                 tiny `el(tag, attrs, children)` helper
    face.ts                circular crop → 256×256 PNG data URL
    confetti.ts            burst + slow rain canvas particle system
  styles/
    tokens.css             every color, radius, shadow, easing — single source of truth
    app.css                component styles (buttons, cards, modal, HUD, etc.)
tests/                     vitest suite — state, physics, levels, rng, file utils
docs/
  spec.md, brand.md, handoff.md   original product/brand/build spec
```

### Key design decisions

- **Vanilla TypeScript + Canvas, no framework.** ~13KB JS gzipped. The whole game (router, state, two levels, audio, UI) loads fast on any device.
- **Procedural art, no image assets.** All scenes, characters, platforms, and enemies are drawn on the canvas with gradient/blur tricks for a watercolor feel. Lets you change the brand palette in `tokens.css` and have everything update.
- **Procedural audio, no audio files.** All SFX are short oscillator routines via Web Audio API, ambient is two detuned sines with a slow LFO. Same reason: no asset pipeline, instantly remixable.
- **`face-api.js` is intentionally _not_ included.** Auto face detection requires a 6MB+ model bundle that hurts first paint. The manual circle-drag crop is fast, kid-friendly, and works offline. (If someone wants to add it back, the integration point is `characterEditor.ts:handleFile`.)
- **localStorage only for personal data.** No accounts, no backend. Photos and names you give characters live only in your browser. Anonymous usage analytics (page views, button clicks, level progress) are gated on a cookie-consent prompt — decline and zero PostHog network calls are made. The whole game is one static `dist/` folder — drop it on any static host.
- **All design tokens in one CSS file.** Want a different palette? Edit `src/styles/tokens.css` — the canvas painters and CSS components both consume the same hex strings (CSS via `var(--c-…)`, canvas via the `C` table in `render.ts`).

### Tests

```bash
npm test
```

The suite covers the things that would be expensive to debug visually:

- `state.test.ts` — character CRUD, name trimming, auto-select-on-first, mute persistence.
- `physics.test.ts` — gravity, landing, max-fall cap, jump, coyote time, jump buffer, world clamp, click damage, enemy patrol.
- `levels.test.ts` — both level layouts have valid start, goal, and the player lands on the floor without falling out.
- `rng.test.ts` — seeded mulberry32 is deterministic.
- `face.test.ts` — file → data URL utility (the canvas crop runs in browser only).

## Deploy

Any static host works. The build outputs a self-contained `dist/`:

- **Vercel:** `vercel --prod`
- **Netlify:** drag `dist/` onto the dashboard, or `netlify deploy --prod --dir=dist`
- **GitHub Pages:** push `dist/` to a `gh-pages` branch
- **Cloudflare Pages, Surge, S3+CloudFront:** all fine — no server-side anything.

## License

MIT — see [LICENSE](./LICENSE). Make it yours, fork it, gift it, send it to your own mom.

## Made by

[John Kilfoil](https://github.com/jckilfoil-spec) for Katie, with help from Quinn (~4 yrs, lead playtester) and Claude Opus.
