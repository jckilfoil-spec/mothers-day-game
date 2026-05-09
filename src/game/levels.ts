/** Level definitions for Mountain Ascent + Cave Descent. */

import { makeEnemy } from './enemy.js';
import type { LevelData, Platform } from './types.js';

const WORLD_W = 720;
const WORLD_H = 3600;

function plat(x: number, y: number, w = 120, h = 22): Platform {
  return { x, y, w, h, variant: 'rock' };
}

/** Mountain Ascent — start at base (high y), climb to flag at top (low y). */
export function makeMountainLevel(): LevelData {
  // 6 screens tall. Player starts at the bottom, flag at top.
  // Floor at y=WORLD_H-32 spans full width.
  const platforms: Platform[] = [
    // Floor
    { x: 0, y: WORLD_H - 32, w: WORLD_W, h: 32 },
  ];

  // 12 zigzag platforms going up. Width WORLD_W = 720, so columns at ~120, 360, 600.
  const cols = [120, 360, 540];
  const ascentSteps = 12;
  for (let i = 0; i < ascentSteps; i++) {
    const y = WORLD_H - 220 - i * 250;
    const xIdx = i % 3;
    const x = cols[xIdx]!;
    const width = 140 + (i % 2 === 0 ? 30 : 0);
    platforms.push(plat(x - width / 2, y, width, 22));
  }

  // A wider landing right under the flag
  platforms.push(plat(WORLD_W / 2 - 110, 200, 220, 28));

  // Enemies as chokepoints — sit in the middle of certain platforms
  const enemies = [
    // Lower chokepoint
    makeEnemy(cols[2]! - 32, WORLD_H - 220 - 0 * 250 - 56, 'rock', 0),
    // Mid chokepoint
    makeEnemy(cols[1]! - 32, WORLD_H - 220 - 5 * 250 - 56, 'rock', 30),
    // Upper chokepoint just below the goal landing
    makeEnemy(cols[0]! - 32, WORLD_H - 220 - 9 * 250 - 56, 'rock', 0),
  ];

  return {
    map: 'mountain',
    width: WORLD_W,
    height: WORLD_H,
    playerStart: { x: WORLD_W / 2 - 22, y: WORLD_H - 32 - 88 },
    platforms,
    enemies,
    goal: { x: WORLD_W / 2, y: 200 - 4 },
    scrollDir: -1,
  };
}

/** Cave Descent — start at top, descend to crystal at bottom. */
export function makeCaveLevel(): LevelData {
  const platforms: Platform[] = [
    // Cave mouth ledge at top
    { x: 0, y: 80, w: WORLD_W, h: 24 },
  ];
  const cols = [140, 380, 560];
  const descentSteps = 12;
  for (let i = 0; i < descentSteps; i++) {
    const y = 220 + i * 250;
    const xIdx = (i + 1) % 3;
    const x = cols[xIdx]!;
    const width = 140 + (i % 2 === 0 ? 0 : 30);
    platforms.push(plat(x - width / 2, y, width, 22));
  }
  // Final crystal landing
  platforms.push(plat(WORLD_W / 2 - 130, WORLD_H - 240, 260, 28));
  // A floor just under the crystal landing so you can't fall past it
  platforms.push({ x: 0, y: WORLD_H - 32, w: WORLD_W, h: 32 });

  const enemies = [
    makeEnemy(cols[2]! - 32, 220 + 1 * 250 - 56, 'slime', 30),
    makeEnemy(cols[1]! - 32, 220 + 5 * 250 - 56, 'slime', 0),
    makeEnemy(cols[0]! - 32, 220 + 9 * 250 - 56, 'slime', 30),
  ];

  return {
    map: 'cave',
    width: WORLD_W,
    height: WORLD_H,
    playerStart: { x: WORLD_W / 2 - 22, y: 80 - 88 },
    platforms,
    enemies,
    goal: { x: WORLD_W / 2, y: WORLD_H - 240 - 4 },
    scrollDir: 1,
  };
}
