/** Level definitions for all maps.
 *
 *  All elevated platforms are one-way: players can jump up through them and drop
 *  down through them by tapping Down. Floors at world top/bottom are solid so the
 *  player can't accidentally fall out of the world. Spacing is tuned to ~180px,
 *  comfortably within the ~263px jump height (PHYSICS in types.ts). */

import { makeEnemy } from './enemy.js';
import type { Difficulty } from '../state.js';
import type { Hazard, LevelData, Platform } from './types.js';
// Seagull/phone variants live in the EnemyState union now; makeEnemy dispatches on variant.

const VERT_W = 720;
const VERT_H = 2400;
const STEP_Y = 170;
const STEPS = 12;

const HORIZ_W = 2800;
const HORIZ_H = 720;
const HORIZ_FLOOR = HORIZ_H - 32;

function jumpPlat(x: number, y: number, w = 150): Platform {
  return { x, y, w, h: 22, variant: 'rock', oneWay: true };
}

/** Mountain Ascent — start at base (high y), climb to flag at top (low y). */
export function makeMountainLevel(): LevelData {
  const platforms: Platform[] = [
    { x: 0, y: VERT_H - 32, w: VERT_W, h: 32 },
  ];

  const cols = [140, 360, 560];
  for (let i = 0; i < STEPS; i++) {
    const y = VERT_H - 32 - 200 - i * STEP_Y;
    const xIdx = i % 3;
    const x = cols[xIdx]!;
    const width = 150 + (i % 2 === 0 ? 30 : 0);
    platforms.push(jumpPlat(x - width / 2, y, width));
  }

  const goalY = VERT_H - 32 - 200 - STEPS * STEP_Y;
  const landingY = goalY - 30;
  platforms.push(jumpPlat(VERT_W / 2 - 130, landingY, 260));

  const enemies = [
    makeEnemy(cols[2]! - 32, VERT_H - 32 - 200 - 1 * STEP_Y - 56, 'rock', 0),
    makeEnemy(cols[1]! - 32, VERT_H - 32 - 200 - 5 * STEP_Y - 56, 'rock', 24),
    makeEnemy(cols[0]! - 32, VERT_H - 32 - 200 - 9 * STEP_Y - 56, 'rock', 0),
  ];

  return {
    map: 'mountain',
    width: VERT_W,
    height: VERT_H,
    playerStart: { x: VERT_W / 2 - 22, y: VERT_H - 32 - 88 },
    platforms,
    enemies,
    hazards: [],
    goal: { x: VERT_W / 2, y: landingY - 4 },
    scrollDir: -1,
    progressAxis: 'y',
  };
}

/** Cave Descent — start at top, descend to crystal at bottom. */
export function makeCaveLevel(): LevelData {
  const platforms: Platform[] = [
    { x: 0, y: 80, w: VERT_W, h: 22, variant: 'rock', oneWay: true },
    { x: 0, y: VERT_H - 32, w: VERT_W, h: 32 },
  ];

  const cols = [140, 360, 560];
  for (let i = 0; i < STEPS; i++) {
    const y = 240 + i * STEP_Y;
    const xIdx = (i + 1) % 3;
    const x = cols[xIdx]!;
    const width = 150 + (i % 2 === 0 ? 0 : 30);
    platforms.push(jumpPlat(x - width / 2, y, width));
  }

  const landingY = 240 + STEPS * STEP_Y;
  platforms.push(jumpPlat(VERT_W / 2 - 140, landingY, 280));

  const enemies = [
    makeEnemy(cols[2]! - 32, 240 + 1 * STEP_Y - 56, 'slime', 24),
    makeEnemy(cols[1]! - 32, 240 + 5 * STEP_Y - 56, 'slime', 0),
    makeEnemy(cols[0]! - 32, 240 + 9 * STEP_Y - 56, 'slime', 24),
  ];

  return {
    map: 'cave',
    width: VERT_W,
    height: VERT_H,
    playerStart: { x: VERT_W / 2 - 22, y: 80 - 88 },
    platforms,
    enemies,
    hazards: [],
    goal: { x: VERT_W / 2, y: landingY - 4 },
    scrollDir: 1,
    progressAxis: 'y',
  };
}

/** Beach — horizontal traverse. Avoid hot sand patches (bouncy hazards) by jumping
 *  over them or hopping onto driftwood. Goal: shark's tooth at the far right. */
export function makeBeachLevel(): LevelData {
  const platforms: Platform[] = [
    // Sand floor (solid).
    { x: 0, y: HORIZ_FLOOR, w: HORIZ_W, h: 32 },
    // Driftwood / sandcastle ledges over the hot patches — optional skip routes.
    jumpPlat(380, 568, 160),
    jumpPlat(820, 528, 200),
    jumpPlat(1460, 568, 160),
    jumpPlat(2060, 528, 200),
  ];

  const hot = (x: number, w: number): Hazard => ({
    x,
    y: HORIZ_FLOOR - 14,
    w,
    h: 14,
    variant: 'hot-sand',
  });

  const hazards: Hazard[] = [
    hot(380, 160),
    hot(820, 200),
    hot(1460, 160),
    hot(2060, 200),
  ];

  // Seagulls patrol overhead — pass-through, but the player can spam-click to defeat them
  // before they drop poop on the run. Tuned LOW enough that they're easy to tap on
  // a desktop where the whole world fits in the viewport.
  const enemies = [
    makeEnemy(420, 410, 'seagull', 200),
    makeEnemy(1180, 380, 'seagull', 240),
    makeEnemy(1980, 420, 'seagull', 220),
  ];

  return {
    map: 'beach',
    width: HORIZ_W,
    height: HORIZ_H,
    playerStart: { x: 80, y: HORIZ_FLOOR - 88 },
    platforms,
    enemies,
    hazards,
    goal: { x: 2700, y: HORIZ_FLOOR - 32 },
    scrollDir: 0,
    progressAxis: 'x',
  };
}

/** Car — horizontal traverse. Phones are spam-clickable enemies on the road; cars are
 *  bouncy patrolling hazards you can't kill. Goal: home + family at the far right. */
export function makeCarLevel(): LevelData {
  const platforms: Platform[] = [
    // Road (solid).
    { x: 0, y: HORIZ_FLOOR, w: HORIZ_W, h: 32 },
    // Mailboxes / curb posts as safe step-up platforms.
    jumpPlat(660, 580, 110),
    jumpPlat(1330, 580, 110),
    jumpPlat(2030, 580, 110),
  ];

  // Phones are now click-destroyable enemies (low HP), standing upright on the road.
  const enemies = [
    makeEnemy(500, HORIZ_FLOOR - 56, 'phone', 0),
    makeEnemy(1200, HORIZ_FLOOR - 56, 'phone', 0),
    makeEnemy(1880, HORIZ_FLOOR - 56, 'phone', 0),
  ];

  let nextCarColor = 0;
  const car = (x: number, range: number, speed: number, dir: 1 | -1): Hazard => ({
    x,
    y: HORIZ_FLOOR - 50,
    w: 110,
    h: 50,
    variant: 'car',
    speed,
    dir,
    minX: x - range,
    maxX: x + range + 110,
    // Initial color picked stably; rotates on each wall-bounce via stepHazards.
    colorIndex: nextCarColor++,
  });

  const hazards: Hazard[] = [
    car(360, 220, 1.6, 1),
    car(1100, 200, 1.4, -1),
    car(1820, 240, 1.8, 1),
  ];

  return {
    map: 'car',
    width: HORIZ_W,
    height: HORIZ_H,
    playerStart: { x: 80, y: HORIZ_FLOOR - 88 },
    platforms,
    enemies,
    hazards,
    goal: { x: 2700, y: HORIZ_FLOOR - 60 },
    scrollDir: 0,
    progressAxis: 'x',
  };
}

/** Sky Beach — vertical-extended beach prototype. Same horizontal traverse goal
 *  (shark tooth at the right), but the world is 2400px tall with 10 cloud platform
 *  layers spaced ~200px apart so each layer is reachable from the one below
 *  (player jump apex ≈ 263px). Upper-layer gulls don't poop — only the lowest
 *  4 layers drop, so the climb stays clean. */
export function makeSkyBeachLevel(difficulty: Difficulty): LevelData {
  const SKY_W = 2800;
  const SKY_H = 2400;
  const SKY_FLOOR = SKY_H - 32;

  // Cloud layer Y positions (top → bottom). Spaced ≤234px apart so each layer
  // is reachable from the one below in a single jump (player apex ≈ 263px).
  // 10 layers — every other one is a "main" wide layer, intermediate ones are
  // narrower stepping stones to bridge the climb.
  const layerYs = [350, 525, 700, 900, 1100, 1300, 1500, 1700, 1900, 2134];

  // Spread cloud platforms across X per layer. Each layer uses a different
  // pattern so the jump puzzle stays interesting (avoid columns stacking up).
  const layerXs: number[][] = [
    [220, 1000, 1700, 2400],   // y=350  (top)
    [600, 1400, 2200],         // y=525
    [200, 900, 1600, 2300],    // y=700  (main)
    [500, 1300, 2100],         // y=900
    [120, 800, 1500, 2200, 2600], // y=1100 (main)
    [400, 1100, 1900],         // y=1300
    [200, 950, 1650, 2350],    // y=1500 (main)
    [550, 1250, 2000],         // y=1700
    [180, 880, 1580, 2280],    // y=1900 (main)
    [350, 1050, 1750, 2450],   // y=2134 (lowest — easy first hop from floor)
  ];

  const cloud = (x: number, y: number, w: number): Platform => ({
    x,
    y,
    w,
    h: 22,
    variant: 'cloud',
    oneWay: true,
  });

  const platforms: Platform[] = [
    // Sand floor (solid, full width).
    { x: 0, y: SKY_FLOOR, w: SKY_W, h: 32 },
  ];

  // Build cloud layers. Even layers (0,2,4,6,8) are "main" with wider clouds
  // (160-200px). Odd layers are stepping stones (140-160px).
  for (let li = 0; li < layerYs.length; li++) {
    const y = layerYs[li]!;
    const xs = layerXs[li]!;
    const isMain = li % 2 === 0;
    for (let xi = 0; xi < xs.length; xi++) {
      const x = xs[xi]!;
      const baseWidth = isMain ? 160 : 140;
      const width = baseWidth + ((li + xi) % 3) * 20; // some variety
      platforms.push(cloud(x, y, width));
    }
  }

  // Hot-sand patches on the ground — same shape as makeBeachLevel.
  const hot = (x: number, w: number): Hazard => ({
    x,
    y: SKY_FLOOR - 14,
    w,
    h: 14,
    variant: 'hot-sand',
  });

  const hazards: Hazard[] = [
    hot(420, 160),
    hot(900, 200),
    hot(1500, 160),
    hot(2080, 200),
  ];

  // Difficulty-scaled enemy counts. With 10 cloud layers now, we keep totals
  // similar by spreading seagulls across more layers (1-2 per layer at easy).
  // easy:   3 ground rocks + ~1.3 seagulls/layer (3 + 13 = 16)
  // medium: 6 ground rocks + ~2.5 seagulls/layer (6 + 25 = 31)
  // hard:   8 ground rocks + ~3.7 seagulls/layer (8 + 37 = 45)
  const groundCount = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 6 : 8;
  // Per-layer seagull spread (10 layers, top → bottom). Lower layers (bottom 4)
  // get higher counts because those are the ones that DO poop.
  const seagullSpread =
    difficulty === 'easy'
      ? [1, 1, 1, 1, 1, 2, 2, 2, 1, 1]
      : difficulty === 'medium'
      ? [2, 2, 3, 2, 3, 3, 3, 3, 2, 2]
      : [3, 3, 4, 4, 4, 4, 4, 4, 4, 3];

  const enemies = [];

  // Ground patrols (rock variant) — evenly spaced across the floor.
  const groundY = SKY_FLOOR - 56;
  for (let i = 0; i < groundCount; i++) {
    const x = 220 + ((SKY_W - 440) / Math.max(1, groundCount - 1)) * i;
    enemies.push(makeEnemy(x, groundY, 'rock', 32));
  }

  // Seagulls per cloud layer — hovering ~50px above each layer's top.
  // ONLY the lowest 4 layers (li >= 6 → y >= 1500) drop poop. Upper layers are
  // cosmetic flock — visible from below but won't rain on the climb.
  for (let li = 0; li < layerYs.length; li++) {
    const layerY = layerYs[li]!;
    const count = seagullSpread[li]!;
    const seagullY = layerY - 60;
    const noPoop = li < 6; // top 6 layers are silent
    for (let i = 0; i < count; i++) {
      const stride = (SKY_W - 200) / Math.max(1, count);
      const x = 100 + stride * i + (li % 2 === 0 ? 0 : stride / 2);
      const e = makeEnemy(x, seagullY, 'seagull', 220);
      if (noPoop) e.noPoop = true;
      enemies.push(e);
    }
  }

  return {
    map: 'sky-beach',
    width: SKY_W,
    height: SKY_H,
    playerStart: { x: 80, y: 2280 },
    platforms,
    enemies,
    hazards,
    goal: { x: 2700, y: 2336 },
    scrollDir: 0,
    progressAxis: 'x',
  };
}
