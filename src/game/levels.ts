/** Level definitions for all maps.
 *
 *  All elevated platforms are one-way: players can jump up through them and drop
 *  down through them by tapping Down. Floors at world top/bottom are solid so the
 *  player can't accidentally fall out of the world. Spacing is tuned to ~180px,
 *  comfortably within the ~263px jump height (PHYSICS in types.ts). */

import { makeEnemy } from './enemy.js';
import type { Hazard, LevelData, Platform } from './types.js';

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

  return {
    map: 'beach',
    width: HORIZ_W,
    height: HORIZ_H,
    playerStart: { x: 80, y: HORIZ_FLOOR - 88 },
    platforms,
    enemies: [],
    hazards,
    goal: { x: 2700, y: HORIZ_FLOOR - 32 },
    scrollDir: 0,
    progressAxis: 'x',
  };
}

/** Car — horizontal traverse. Avoid dropped cell phones (stationary) and patrolling cars.
 *  Goal: home + family at the far right. */
export function makeCarLevel(): LevelData {
  const platforms: Platform[] = [
    // Road (solid).
    { x: 0, y: HORIZ_FLOOR, w: HORIZ_W, h: 32 },
    // Mailboxes / curb posts as safe step-up platforms.
    jumpPlat(660, 580, 110),
    jumpPlat(1330, 580, 110),
    jumpPlat(2030, 580, 110),
  ];

  const phone = (x: number): Hazard => ({
    x,
    y: HORIZ_FLOOR - 14,
    w: 32,
    h: 14,
    variant: 'cell-phone',
  });

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
  });

  const hazards: Hazard[] = [
    phone(500),
    phone(1200),
    phone(1880),
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
    enemies: [],
    hazards,
    goal: { x: 2700, y: HORIZ_FLOOR - 60 },
    scrollDir: 0,
    progressAxis: 'x',
  };
}
