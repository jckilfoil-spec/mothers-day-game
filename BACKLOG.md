# Backlog

Things that would be nice but aren't shipping in v1. Ordered roughly by impact.

## Gamification & feedback (asked for 2026-05-09)

The vertical progress bar that ships in v1 is the simplest "how far have I gotten" indicator.
Two natural follow-ups (both noted from John 2026-05-09):

- [ ] **Defeat counter.** Show "Monsters defeated: N / total" in the HUD. Lights up to a final
      celebratory tally on the win screen. Could double as a per-level high-water-mark.
- [ ] **Stars / collectibles.** Sprinkle 3 star pickups along each level path (one easy, one
      medium, one off-the-beaten-track). Stars persist in the character's record. Win screen
      shows how many you collected this run + "best ever". This is the strongest engagement
      hook for repeat play with a kid playtester.
- [ ] **Combo / time bonus.** Optional layer on top of stars — fast finishes or chained
      monster defeats yield extra stars. Probably too much for the kid-audience target; revisit
      after star pickups land.

## Game feel

- [ ] **Auto face detection** via face-api.js (currently manual crop only — see CLAUDE.md for
      why). Would shave a step off the editor for non-technical users uploading a photo.
- [ ] **Moving platforms.** One per level, slow horizontal traverse. Adds variety without
      raising difficulty much.
- [ ] **Per-character map progress.** Persist completion + best stars per (character, map)
      pair. Show a "✓ done" badge on the map tile for that character.
- [ ] **Mid-level checkpoints.** Currently respawn-on-fall snaps to the highest platform under
      the player. A real checkpoint banner halfway up each level would feel rewarding.

## Polish

- [ ] **Real watercolor painted backgrounds** via image assets — current procedural painters
      are fine but a real artist pass would lift it considerably. Keep the procedural fallback.
- [ ] **More enemy variants** — at least 2 per map for variety. Slime + crab in the cave;
      rock + frost-sprite on the mountain.
- [ ] **Custom message length / formatting** in the editor — bullets, line breaks, optional
      emoji picker.
- [ ] **Replay export.** "Save a tiny GIF of your run to share." Big lift; only worth it if
      we want this to be sharable beyond the immediate gift recipient.
- [ ] **Localization.** Strings are inline in TS today; would need an i18n layer.

## Tech / housekeeping

- [ ] **Visual regression tests** via Playwright + screenshot diff for the painted scenes.
      Right now nothing catches "I broke the watercolor look".
- [ ] **Deploy automation.** GitHub Actions workflow that builds + publishes to GitHub Pages
      on push to `main`.
- [ ] **PWA manifest.** Tiny add — lets the kid "install" the game to home screen.
