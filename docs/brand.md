# brand.md — Visual Direction

## Brand pillars

- **Warm.** This is a love letter, not a game review. Soft edges, painted textures, gentle motion.
- **Painted, not pixel.** Watercolor backgrounds with visible brush feel. Avoid hard-edge cartoon vector look.
- **Kid-confident.** Big, obvious, generous. Nothing tiny, nothing subtle. Quinn (kid) is the UX bar.
- **Avatar: TLA inspired, not derivative.** Borrow the *feeling* — painted skies, earthy palettes, robe silhouettes — without copying characters or logos.

## Color palettes

### Mountain Ascent (Air Nomad mood)

| Role | Hex | Notes |
|---|---|---|
| Sky top | `#B8D8E8` | soft morning blue |
| Sky horizon | `#FBEFD9` | cream sunrise |
| Sunset accent | `#F4A56C` | for clouds, distant warmth |
| Far peaks | `#8B7AA8` | dusty purple |
| Near peaks | `#6B8CAE` | cooler blue-gray |
| Snow / highlight | `#FAFAFA` | platforms, peak caps |
| Rock platform | `#7D7068` | warm stone |
| Goal flag | `#F4A56C` + `#FBEFD9` | orange + cream pennant |

### Cave Descent (Earth Kingdom mood)

| Role | Hex | Notes |
|---|---|---|
| Cave deep | `#2A1F1A` | near-black umber, never pure black |
| Cave wall | `#5C3A28` | warm brown |
| Stalactite | `#8B5E3C` | mid umber |
| Crystal accent | `#6FB5A8` | teal-green glow |
| Crystal highlight | `#A8E6DC` | pale teal for glow |
| Torch glow | `#FFB870` | warm rim light |
| Moss | `#4A6B3A` | deep green |
| Goal crystal | `#6FB5A8` + `#A8E6DC` | with subtle pulse animation |

### UI palette (shared across maps)

| Role | Hex |
|---|---|
| Button primary | `#F4A56C` |
| Button primary hover | `#E89554` |
| Button secondary | `#FBEFD9` (text `#5C3A28`) |
| Card surface | `#FFFEF8` |
| Text primary | `#2A1F1A` |
| Text muted | `#7D7068` |
| Danger (delete) | `#C75D5D` |
| Success | `#7BA888` |

## Typography

- **Display** (titles, character names): **Fredoka**, 600 weight. Rounded, warm, very friendly.
- **Accent** (one-off "Happy Mother's Day"): **Caveat** or **Fondamento**, hand-drawn feel. Use sparingly.
- **Body** (instructions, button labels): **Fredoka**, 400 weight. Same family for cohesion.
- Sizes (desktop): h1 56px, h2 36px, body 18px, button label 22px. Bump 10–15% on mobile if needed for tap clarity.

## Character design

- **Head:** circular mask of uploaded face, 48px diameter, soft 2px cream border ring (looks like a portrait painting).
- **Body:** slim A-line robe silhouette, 64×88px PNG. Clean tapered shape — *not* bell-shaped or lumpy. Two color variants offered:
  - Warm robe — orange + cream (Air Nomad-ish)
  - Earth robe — green + brown (Earth Kingdom-ish)
  - User picks during character creation, default warm.
- **Feet:** two small slipper shapes poking out the bottom of the robe hem. Cream-leather or earth-leather look, ~14×8px each. During walk: alternating ±1px vertical bob (no full step cycle — sub-pixel charm).
- **Staff:** tall wooden Gandalf-feeling staff held diagonally across the body. Light brown shaft (`#8B5E3C`) with darker knots (`#5C3A28`). Gnarled top with a small glowing orb — Mountain orb is pale teal (`#A8E6DC`), Cave orb is warm amber (`#FFB870`). Anchored at chest height for animation pivot.
- **No arms drawn** — the staff visually implies the hand. Keeps silhouette painterly and cuts animation cost.
- **Staff animation states:**
  - Idle — held diagonally ~15° from vertical, gentle sway with breathing bob
  - Walk — sways ±5° opposite to body bob
  - Jump — staff stays planted relative to body
  - Attack click — swings forward to ~60°, holds 80ms, returns with overshoot. Total ~250ms.
- **Face composition rule:** crop to a tight square around the face, mask to circle. Slight zoom out (90%) so the face isn't too tight to the edge.

## UI components

### Buttons
- Primary: 60px+ height, 16–24px radius, `#F4A56C` BG, white text, 2px shadow, hover lifts 2px.
- Big primary (CTAs like "Start", "Play"): 80px+ height, 28px radius, drop shadow, subtle bounce-in animation on mount.
- Icon buttons: 56px square, rounded, generous padding.

### Cards
- Character cards: 200×240px, 20px radius, soft cream BG, hover lifts + glows.
- Selected state: 4px outline in primary color, sticker-style "✓ Playing" badge top-right.

### Modals
- Centered, 24px radius, soft cream BG, dark warm text.
- Two-button pattern: cancel (secondary) left, confirm (primary or danger) right.

### Form inputs
- Large: 56px height, 16px radius, 2px border (`#7D7068` default → `#F4A56C` focus), 20px text.

## Iconography

- Use **Lucide** icons for consistency. Override stroke-width to 2.5 for kid-readable chunkiness.
- Key icons: Plus (add character), Pencil (edit), Trash (delete), Play (start), Pause, Volume/Mute, ArrowLeft (back), Heart (mother's day touches).

## Animation principles

- **Bouncy, not jerky.** Use `cubic-bezier(0.34, 1.56, 0.64, 1)` for entrances.
- **Idle micro-motion.** Backgrounds parallax slowly. Characters bob. Buttons pulse subtly.
- **Confirmations are celebrations.** Save character → confetti burst (small, 1s). Win screen → big confetti.
- **No screen-shake on enemy hits** — too aggressive for tone. Use puff clouds + 3px shake on enemy only.

## Sound direction

- Ambient: soft, melodic, no driving rhythm. Mountain = airy flute/strings. Cave = low strings + sparse harp/chime.
- SFX: organic, "wooden" — no synth zaps. Jump = soft "boing", hit = soft "thud", win = warm chord rise.
- Default volume: 50%. Mute toggle persists in localStorage.

## What to avoid

- Pure black (always warm dark `#2A1F1A`)
- Neon, fluorescent saturation
- Comic Sans or generic kid fonts
- Sharp vector outlines (we want painted)
- Cluttered HUD — minimal as possible
- Anything that reads as "scary" — enemies are silly, not menacing
