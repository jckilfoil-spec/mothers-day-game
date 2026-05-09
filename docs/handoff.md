# handoff.md — Build Plan for Code Agent

## Mission

Ship a playable web game by Mother's Day morning. Brand and spec are locked. Iterate fast on art polish; never sacrifice working flow for polish.

## Suggested file structure

```
mothers-day-game/
├── index.html
├── vite.config.js
├── package.json
├── src/
│   ├── main.js                 # entry, screen router
│   ├── state.js                # localStorage CRUD
│   ├── screens/
│   │   ├── title.js
│   │   ├── characterManager.js
│   │   ├── characterEditor.js  # add/edit flow
│   │   ├── mapSelect.js
│   │   ├── game.js             # main canvas loop
│   │   └── win.js
│   ├── game/
│   │   ├── physics.js          # gravity, collision
│   │   ├── player.js           # render, animation
│   │   ├── enemy.js            # HP, click handler
│   │   ├── levels/
│   │   │   ├── mountain.js
│   │   │   └── cave.js
│   │   └── render.js           # parallax, draw helpers
│   ├── face/
│   │   └── detect.js           # face-api.js wrapper
│   ├── audio/
│   │   └── sounds.js           # Howler wrappers
│   └── styles/
│       ├── tokens.css          # palettes from brand.md
│       └── app.css
├── public/
│   ├── art/
│   │   ├── mountain/           # bg layers, platforms, enemy, flag
│   │   ├── cave/               # bg layers, platforms, enemy, crystal
│   │   └── character/          # robe body PNGs (warm, earth), arm
│   └── audio/                  # sfx, ambient
└── README.md
```

## Build order (strict — gates each loop)

### Loop 1 — Skeleton & Character pipeline (build until working before moving on)
1. Vite scaffold, screen router, `tokens.css` from brand palette.
2. Title → Character Manager → Add Character flow with placeholder face detect (manual crop only).
3. Wire `face-api.js`, swap manual-only for auto-detect-with-fallback.
4. Full CRUD: add, edit name, delete with confirm, select active.
5. **Gate:** can create 3 characters with real photos, edit names, delete, select one. State persists across reload.

### Loop 2 — One map end-to-end (Mountain)
1. Map select screen with 2 tiles (cave tile disabled with "Coming up next" label is OK temporarily).
2. Mountain level: parallax bg, 8 platforms, player physics, jump, move, arm swing.
3. One enemy chokepoint with HP bar + click damage + defeat animation.
4. Goal flag at top → triggers win screen.
5. Win screen with name + custom message + Play Again.
6. **Gate:** can play full mountain run start-to-finish with selected character. Feels good. Quinn playtest #1.

### Loop 3 — Second map (Cave) + polish
1. Cave level (reuse engine, swap art + level data, scroll downward).
2. Second enemy variant (slime).
3. Audio pass: ambient + all SFX.
4. Mobile controls (on-screen left/right/jump buttons).
5. Polish pass: animation timing, button feedback, transitions.
6. **Gate:** Quinn playtest #2 with both maps. If she says ship → ship.

### Loop 4 — Deploy + final touches
1. Deploy to Vercel/Netlify, custom URL if quick.
2. Pre-load Katie's character so she just opens the link and plays.
3. Final QA on her likely device (iPhone? iPad? confirm).

## Iteration loops & how to debug fast

- **Art doesn't feel right?** Generate 3 variants (e.g. with a quick image-gen pass), swap, pick best in 5 minutes. Don't spend 30 minutes tuning one.
- **Physics feels off?** Tune in this order: gravity → jump velocity → coyote time → move speed. Change one variable at a time.
- **Face detection failing?** Always show manual crop fallback. Never block the user.
- **Performance bad on mobile?** Reduce parallax layers, lower canvas resolution, skip moving platforms.

## Cut list (in order — drop these if time runs out)

1. Moving platforms (drop first, biggest art-vs-value gap)
2. Mobile on-screen controls (desktop-only is acceptable if Katie plays on laptop)
3. Cave map (ship Mountain only as v1, add cave later in the day)
4. Custom message editing (hardcode "Happy Mother's Day, Mommy! Love, Quinn")
5. Robe color variants (one default robe is fine)
6. Confetti animation (static "✨" emoji burst is fine)

**Cannot cut:** character creation flow, one playable map, one enemy chokepoint, win screen.

## Definition of done — v1

- [ ] Quinn can upload a photo of Katie, name the character "Mommy", select her, pick Mountain, play through, see win screen with custom message.
- [ ] No console errors. No broken art.
- [ ] Works on John's primary device + Katie's likely device.
- [ ] Deployed at a stable URL.
- [ ] Mute button works. State persists.

## Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Watercolor TLA aesthetic doesn't land | High | Time-box art polish to 2 hours per map. Fallback to flatter PBS Kids style if not landing. |
| Face detection bad on Katie's photo | Med | Manual crop always available. Test with 3 real photos before declaring loop 1 done. |
| Time runs out | High | Cut list is ordered. Ship Loop 2 gate as v1 if needed — Mountain only is still a complete gift. |
| Mobile performance | Med | Test on real phone by end of Loop 2. Drop layers if FPS <30. |
| Quinn rejects the result | Low | Iterate with her after Loop 2. Her feedback drives Loop 3 priorities. |

## Test plan (informal, with Quinn)

- After Loop 2: she creates a character (any photo — herself or a stuffed animal first for fun), plays Mountain. Watch over her shoulder. Note every confused moment.
- After Loop 3: same but with both maps. She also tries the edit/delete flows. Final yes/no.

## Open items for John before/during build

- Confirm Katie's primary device for the final hand-off (laptop? phone? iPad?)
- Decide custom Mother's Day message wording (default in spec is fine)
- Pick a deploy URL — Vercel auto-URL is fine, or buy something cute like `mommy.kingsbury.fyi` if you want
