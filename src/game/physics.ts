/**
 * Pure physics — no rendering, no DOM. All functions take state in, return new state out
 * (mutating in place for hot-path efficiency, but the contract is stateless).
 *
 * Tested in tests/physics.test.ts.
 */

import { PHYSICS, type EnemyState, type InputState, type Platform, type PlayerState, type Rect } from './types.js';

export function makePlayer(x: number, y: number): PlayerState {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    w: 44,
    h: 88,
    facing: 1,
    grounded: false,
    airT: 0,
    jumpBuffer: 0,
    animT: 0,
    attackT: 0,
    walking: false,
  };
}

/** AABB overlap. */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Resolve player against a single platform via the standard "smallest overlap axis" approach. */
function resolvePlatform(p: PlayerState, plat: Platform): { groundedNow: boolean } {
  const overlapX = Math.min(p.x + p.w, plat.x + plat.w) - Math.max(p.x, plat.x);
  const overlapY = Math.min(p.y + p.h, plat.y + plat.h) - Math.max(p.y, plat.y);
  if (overlapX <= 0 || overlapY <= 0) return { groundedNow: false };

  if (overlapY < overlapX) {
    // resolve along Y
    if (p.y < plat.y) {
      // hit from above → land
      p.y = plat.y - p.h;
      p.vy = 0;
      return { groundedNow: true };
    } else {
      // hit from below → bonk head
      p.y = plat.y + plat.h;
      p.vy = Math.max(0, p.vy);
      return { groundedNow: false };
    }
  } else {
    // resolve along X
    if (p.x < plat.x) {
      p.x = plat.x - p.w;
    } else {
      p.x = plat.x + plat.w;
    }
    p.vx = 0;
    return { groundedNow: false };
  }
}

/** Resolve player against one or more enemies as solid blocks (so they can't be jumped over). */
function resolveEnemyBlock(p: PlayerState, enemies: EnemyState[]): { groundedNow: boolean } {
  let grounded = false;
  for (const e of enemies) {
    if (e.defeatT > 0) continue;
    const platLike: Rect = { x: e.x, y: e.y, w: e.w, h: e.h };
    const { groundedNow } = resolvePlatform(p, platLike as Platform);
    if (groundedNow) grounded = true;
  }
  return { groundedNow: grounded };
}

/**
 * Step the physics one frame (1/60s). Mutates `player` in place; returns nothing.
 */
export function stepPlayer(
  player: PlayerState,
  input: InputState,
  platforms: Platform[],
  enemies: EnemyState[],
  worldWidth: number,
): void {
  // ---- Horizontal ----
  if (input.left && !input.right) {
    player.vx = -PHYSICS.moveSpeed;
    player.facing = -1;
  } else if (input.right && !input.left) {
    player.vx = PHYSICS.moveSpeed;
    player.facing = 1;
  } else {
    player.vx *= player.grounded ? PHYSICS.groundFriction : PHYSICS.airDrag;
    if (Math.abs(player.vx) < 0.05) player.vx = 0;
  }

  // ---- Jump (with coyote + buffer) ----
  if (input.jumpPressed) player.jumpBuffer = PHYSICS.jumpBufferFrames;
  if (player.jumpBuffer > 0) player.jumpBuffer--;

  const canJump = player.grounded || player.airT < PHYSICS.coyoteFrames;
  if (player.jumpBuffer > 0 && canJump) {
    player.vy = PHYSICS.jumpVelocity;
    player.grounded = false;
    player.airT = PHYSICS.coyoteFrames; // consume coyote
    player.jumpBuffer = 0;
  }

  // Variable jump: if jump released and still moving up, cap upward velocity.
  if (!input.jump && player.vy < PHYSICS.variableJumpCutoff) {
    player.vy = PHYSICS.variableJumpCutoff;
  }

  // ---- Gravity ----
  player.vy = Math.min(PHYSICS.maxFall, player.vy + PHYSICS.gravity);

  // ---- Integrate + resolve ----
  // Resolve X first, then Y, to avoid corner-snag bugs.
  player.x += player.vx;
  for (const plat of platforms) resolvePlatform(player, plat);
  resolveEnemyBlock(player, enemies);

  player.y += player.vy;
  let grounded = false;
  for (const plat of platforms) {
    const { groundedNow } = resolvePlatform(player, plat);
    if (groundedNow) grounded = true;
  }
  const e = resolveEnemyBlock(player, enemies);
  if (e.groundedNow) grounded = true;

  player.grounded = grounded;
  player.airT = grounded ? 0 : player.airT + 1;
  player.walking = grounded && Math.abs(player.vx) > 0.5;
  if (player.attackT > 0) player.attackT--;

  // World bounds horizontally
  if (player.x < 0) {
    player.x = 0;
    player.vx = 0;
  } else if (player.x + player.w > worldWidth) {
    player.x = worldWidth - player.w;
    player.vx = 0;
  }

  player.animT++;
}

/** Update enemy patrol motion. */
export function stepEnemies(enemies: EnemyState[]): void {
  for (const e of enemies) {
    if (e.defeatT > 0) {
      e.defeatT++;
      continue;
    }
    if (e.hitFlash > 0) e.hitFlash--;
    if (e.speed === 0) continue;
    e.x += e.speed * e.dir;
    if (e.x < e.minX) {
      e.x = e.minX;
      e.dir = 1;
    } else if (e.x + e.w > e.maxX) {
      e.x = e.maxX - e.w;
      e.dir = -1;
    }
  }
}

/** Returns true if the click hit any enemy and damage was applied. */
export function applyClickDamage(enemies: EnemyState[], wx: number, wy: number, damage = 1): EnemyState | null {
  for (const e of enemies) {
    if (e.defeatT > 0) continue;
    if (wx >= e.x && wx <= e.x + e.w && wy >= e.y && wy <= e.y + e.h) {
      e.hp = Math.max(0, e.hp - damage);
      e.hitFlash = 12;
      if (e.hp === 0) e.defeatT = 1;
      return e;
    }
  }
  return null;
}

/**
 * If the player has fallen off the bottom of the world, place them safely
 * back on the nearest platform above their last X position.
 */
export function respawnIfFell(player: PlayerState, platforms: Platform[], worldHeight: number): boolean {
  if (player.y < worldHeight + 200) return false;
  // Find the highest platform the player horizontally overlaps.
  let target: Platform | null = null;
  for (const plat of platforms) {
    const overlapsX = player.x + player.w > plat.x && player.x < plat.x + plat.w;
    if (!overlapsX) continue;
    if (!target || plat.y < target.y) target = plat;
  }
  if (!target) target = platforms[0] ?? null;
  if (!target) return false;
  player.x = target.x + target.w / 2 - player.w / 2;
  player.y = target.y - player.h - 1;
  player.vx = 0;
  player.vy = 0;
  player.grounded = true;
  player.airT = 0;
  return true;
}

/** Returns true if the player rect overlaps the goal point (within radius). */
export function reachedGoal(player: PlayerState, gx: number, gy: number, radius = 36): boolean {
  const cx = player.x + player.w / 2;
  const cy = player.y + player.h / 2;
  const dx = cx - gx;
  const dy = cy - gy;
  return dx * dx + dy * dy < (radius + Math.max(player.w, player.h) / 2) * (radius + Math.max(player.w, player.h) / 2);
}
