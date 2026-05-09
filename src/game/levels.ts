/** Level definitions for Mountain Ascent + Cave Descent.
 *
 *  All elevated platforms are one-way: players can jump up through them and drop
 *  down through them by tapping Down. Floors at world top/bottom are solid so the
 *  player can't accidentally fall out of the world. Spacing is tuned to ~180px,
 *  comfortably within the ~263px jump height (PHYSICS in types.ts). */

import { makeEnemy } from './enemy.js';
import type { LevelData, Platform } from './types.js';

const WORLD_W = 720;
const WORLD_H = 2400;
const STEP_Y = 170; // vertical gap between zigzag platforms
const STEPS = 12;

function jumpPlat(x: number, y: number, w = 150): Platform {
  return { x, y, w, h: 22, variant: 'rock', oneWay: true };
}

/** Mountain Ascent — start at base (high y), climb to flag at top (low y). */
export function makeMountainLevel(): LevelData {
  const platforms: Platform[] = [
    // Solid floor at the bottom of the world — never fall out.
    { x: 0, y: WORLD_H - 32, w: WORLD_W, h: 32 },
  ];

  // 12 zigzag platforms going up. Three columns for a classic mountain-trail feel.
  const cols = [140, 360, 560];
  for (let i = 0; i < STEPS; i++) {
    const y = WORLD_H - 32 - 200 - i * STEP_Y;
    const xIdx = i % 3;
    const x = cols[xIdx]!;
    const width = 150 + (i % 2 === 0 ? 30 : 0);
    platforms.push(jumpPlat(x - width / 2, y, width));
  }

  // Wider landing right under the flag.
  const goalY = WORLD_H - 32 - 200 - STEPS * STEP_Y; // ~128
  const landingY = goalY - 30;
  platforms.push(jumpPlat(WORLD_W / 2 - 130, landingY, 260));

  // Enemies sit on the zigzag platforms — silly chokepoints, not strict blockers.
  const enemies = [
    makeEnemy(cols[2]! - 32, WORLD_H - 32 - 200 - 1 * STEP_Y - 56, 'rock', 0),
    makeEnemy(cols[1]! - 32, WORLD_H - 32 - 200 - 5 * STEP_Y - 56, 'rock', 24),
    makeEnemy(cols[0]! - 32, WORLD_H - 32 - 200 - 9 * STEP_Y - 56, 'rock', 0),
  ];

  return {
    map: 'mountain',
    width: WORLD_W,
    height: WORLD_H,
    playerStart: { x: WORLD_W / 2 - 22, y: WORLD_H - 32 - 88 },
    platforms,
    enemies,
    goal: { x: WORLD_W / 2, y: landingY - 4 },
    scrollDir: -1,
  };
}

/** Cave Descent — start at top, descend to crystal at bottom. */
export function makeCaveLevel(): LevelData {
  const platforms: Platform[] = [
    // Cave-mouth ledge at top — one-way so the player can also drop through it.
    { x: 0, y: 80, w: WORLD_W, h: 22, variant: 'rock', oneWay: true },
    // Solid floor at the bottom — never fall out.
    { x: 0, y: WORLD_H - 32, w: WORLD_W, h: 32 },
  ];

  const cols = [140, 360, 560];
  for (let i = 0; i < STEPS; i++) {
    const y = 240 + i * STEP_Y;
    const xIdx = (i + 1) % 3;
    const x = cols[xIdx]!;
    const width = 150 + (i % 2 === 0 ? 0 : 30);
    platforms.push(jumpPlat(x - width / 2, y, width));
  }

  // Crystal landing — one-way so you can also drop onto it from above.
  const landingY = 240 + STEPS * STEP_Y; // ~2280
  platforms.push(jumpPlat(WORLD_W / 2 - 140, landingY, 280));

  const enemies = [
    makeEnemy(cols[2]! - 32, 240 + 1 * STEP_Y - 56, 'slime', 24),
    makeEnemy(cols[1]! - 32, 240 + 5 * STEP_Y - 56, 'slime', 0),
    makeEnemy(cols[0]! - 32, 240 + 9 * STEP_Y - 56, 'slime', 24),
  ];

  return {
    map: 'cave',
    width: WORLD_W,
    height: WORLD_H,
    playerStart: { x: WORLD_W / 2 - 22, y: 80 - 88 },
    platforms,
    enemies,
    goal: { x: WORLD_W / 2, y: landingY - 4 },
    scrollDir: 1,
  };
}
