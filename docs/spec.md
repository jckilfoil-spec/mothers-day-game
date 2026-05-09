# spec.md — Mother's Day Game

## User flow

1. **Title screen** → "Start" button (giant, centered)
2. **Character Manager** → list of saved characters with Add / Edit / Delete / Play
3. **Add Character flow** → upload photo → auto face detect → confirm/adjust crop → name → save
4. **Map Select** → 2 tiles: Mountain Ascent, Cave Descent
5. **Gameplay** → platformer with click-to-defeat enemies, win at end
6. **Win screen** → "Happy Mother's Day, [Name]!" + custom message + Play Again / Change Map / Change Character

Back button visible on every screen except gameplay (which has a pause icon → menu).

## Screen specs

### Title
- Background: subtle parallax watercolor mountains
- Logo/title: "A Game for Mom" or custom (editable in code)
- Single CTA: "Start" — 200px+ button, animated bounce

### Character Manager
- Grid of character cards (4 per row desktop, 2 mobile)
- Each card: face circle thumbnail, name, edit (pencil) + delete (trash) icons
- "+ Add Character" tile always present, big and inviting
- "Play with [name]" CTA on selected card → goes to map select
- Empty state: friendly illustration + "Let's make a character!"

### Add/Edit Character
- Step 1: Upload (drag-drop OR big upload button — accept image/*)
- Step 2: Auto-detect runs immediately. Show photo with detected face in oval highlight.
  - If detected: "Looks good?" with Confirm + Adjust buttons
  - If not detected: "Let's pick the face" — show draggable/resizable circle on photo
- Step 3: Name input — large text field, default "Character N", autofocus
- Step 4: Optional custom Mother's Day message (defaults to "Happy Mother's Day, Mommy! Love, Quinn")
- Step 5: Save → returns to manager with new card highlighted

### Map Select
- 2 large tiles side by side (stacked on mobile)
- Mountain Ascent: snowy peaks preview, "Climb to the top!"
- Cave Descent: glowing crystal preview, "Find the treasure!"
- Selected character shown top-left with "Change" link

### Gameplay
- Canvas fills viewport (16:9, letterboxed if needed)
- HUD: pause (top-right), character mini-portrait + name (top-left)
- Controls displayed first 3 seconds: "← → to move, SPACE to jump, CLICK enemy to attack"
- Mobile: on-screen left/right/jump buttons + tap-to-attack

### Win
- Confetti or floating petals
- Big card: "Happy Mother's Day, [Name]!"
- Custom message below
- Buttons: Play Again, Change Map, Change Character, Back to Title

## Data model

```js
// localStorage key: 'mdg.characters'
Character = {
  id: string,           // uuid
  name: string,         // "Mommy", "Quinn", etc.
  faceImage: string,    // base64 data URL of cropped circular face (256x256)
  customMessage: string,// shown on win screen
  createdAt: number     // timestamp
}

// localStorage key: 'mdg.settings'
Settings = {
  selectedCharacterId: string | null,
  muted: boolean,
  lastMap: 'mountain' | 'cave' | null
}
```

CRUD ops: `addCharacter`, `updateCharacter(id, patch)`, `deleteCharacter(id)`, `getCharacters()`, `selectCharacter(id)`.

Delete confirms with a friendly "Are you sure? This will remove [name]." modal.

## Game mechanics

### Physics
- Gravity: ~0.6 px/frame²
- Jump velocity: -12 px/frame (room to tune)
- Move speed: 4 px/frame
- Coyote time: 80ms (forgiving for kids)
- Variable jump height: short tap = small hop, hold = full jump

### Character render
- 64×96px sprite total. Head (circle, 48px, masked face image) + slim A-line robe body (64×88px, painted PNG) + two slipper feet poking out the robe hem (~14×8px each) + Gandalf-style staff held diagonally.
- **No arms** — staff implies the hand.
- **Staff** is a separate layer, anchored at chest (~y=42 from sprite top) for rotation. Animates on:
  - Idle — ~15° from vertical, subtle sway with breathing bob
  - Walk — sways ±5° opposite to body bob
  - Jump — locked relative to body
  - Attack click — rotates forward to ~60°, holds 80ms, returns to idle with overshoot. Total ~250ms.
- **Feet** alternate ±1px vertical bob during walk. Static during jump and attack.
- Idle body bob (sine, ±2px Y) carries the whole sprite.

### Levels
- Mountain Ascent: scrolls upward. Start at base, top has a flag/banner. ~6 screens tall.
- Cave Descent: scrolls downward. Start at cave mouth, bottom has glowing crystal. ~6 screens deep.
- 8–12 platforms per level. Mix of static rocks/ledges. 1–2 moving platforms (optional, S effort).
- 2–3 enemy chokepoints per level.

### Enemies
- Sprite: 48x48 simple blob (gray rock sprite for mountain, purple slime for cave)
- Face: emoji overlay (😈 or 😠 or 😢) — randomized or per-enemy
- HP: 15. Click to deal 1 damage. Show HP bar above enemy (drains visibly).
- Knockback shake on hit. Pop + puff cloud on defeat.
- Behavior: stationary or simple left-right pacing 2 tiles. No projectiles.
- Cannot be jumped over (they fill platform width at chokepoints) — must be defeated.

### Win condition
- Touch the goal object (flag for mountain, crystal for cave)
- Triggers fade to win screen + win SFX

### Lose condition
- None in v1. Falling off the bottom respawns at last platform. Kid-friendly.

## Asset list

### Art (need to generate or source)
- Mountain background — 3 parallax layers (sky, far peaks, near peaks)
- Cave background — 3 parallax layers (cave wall, mid stalactites, near rocks)
- Platform sprites — rock (mountain), ledge (cave), 2–3 variants each
- Character body PNG — robe silhouette, transparent, 64x80, with separate arm layer
- Enemy sprites — 1 per map (rock blob, slime)
- Goal sprites — flag (mountain), crystal (cave)
- UI: button BG, modal BG, card BG (CSS gradient is fine)
- Title screen art — 1 hero illustration

### Audio (CC0)
- Jump SFX
- Hit SFX (enemy click)
- Enemy defeat SFX
- Win fanfare
- Ambient music — 1 track per map (looping, low volume)
- Sources: Freesound, OpenGameArt, Kenney.nl

### Fonts (Google Fonts)
- Display: Fredoka (rounded, friendly)
- Accent: Fondamento or Caveat (hand-drawn callback to Avatar)

## Accessibility & kid-friendliness

- All buttons ≥60px tap target
- High contrast text (4.5:1 minimum)
- No reading required for core flow (icons + voice cues optional)
- No timers, no scoring, no fail states
- Mute button always visible
- No external links, no ads, no tracking
