import { describe, expect, it } from 'vitest';
import {
  applyClickDamage,
  applyHazardBounce,
  makePlayer,
  reachedGoal,
  rectsOverlap,
  respawnIfFell,
  stepEnemies,
  stepHazards,
  stepPlayer,
} from '../src/game/physics.js';
import { makeEnemy } from '../src/game/enemy.js';
import type { Hazard, InputState, Platform } from '../src/game/types.js';
import { PHYSICS } from '../src/game/types.js';

function noInput(): InputState {
  return {
    left: false,
    right: false,
    jump: false,
    down: false,
    jumpPressed: false,
    downPressed: false,
    clickWorld: null,
  };
}

const FLOOR: Platform = { x: 0, y: 500, w: 1000, h: 50 };
const ONE_WAY: Platform = { x: 100, y: 350, w: 200, h: 16, oneWay: true };

describe('rectsOverlap', () => {
  it('detects overlap', () => {
    expect(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
  });
  it('detects non-overlap', () => {
    expect(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 0, w: 10, h: 10 })).toBe(false);
  });
  it('treats edge-touching as non-overlap', () => {
    expect(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 })).toBe(false);
  });
});

describe('stepPlayer — gravity & landing', () => {
  it('falls under gravity until it lands on a platform', () => {
    const p = makePlayer(100, 0);
    for (let i = 0; i < 60; i++) stepPlayer(p, noInput(), [FLOOR], [], 1000);
    expect(p.grounded).toBe(true);
    expect(p.y + p.h).toBeCloseTo(FLOOR.y, 0);
    expect(p.vy).toBe(0);
  });

  it('caps vertical fall speed at maxFall', () => {
    const p = makePlayer(100, 0);
    // Fall in empty world for many frames
    for (let i = 0; i < 200; i++) stepPlayer(p, noInput(), [], [], 1000);
    expect(p.vy).toBeLessThanOrEqual(PHYSICS.maxFall + 0.01);
  });
});

describe('stepPlayer — movement & jumping', () => {
  it('moves right when right is pressed and grounded', () => {
    const p = makePlayer(100, FLOOR.y - 88);
    p.grounded = true;
    const input = noInput();
    input.right = true;
    stepPlayer(p, input, [FLOOR], [], 1000);
    expect(p.x).toBeGreaterThan(100);
    expect(p.facing).toBe(1);
  });

  it('moves left when left is pressed', () => {
    const p = makePlayer(200, FLOOR.y - 88);
    p.grounded = true;
    const input = noInput();
    input.left = true;
    stepPlayer(p, input, [FLOOR], [], 1000);
    expect(p.x).toBeLessThan(200);
    expect(p.facing).toBe(-1);
  });

  it('does not jump when not grounded and out of coyote time', () => {
    const p = makePlayer(100, 0); // floating
    p.airT = 100;
    const input = noInput();
    input.jump = true;
    input.jumpPressed = true;
    stepPlayer(p, input, [], [], 1000);
    expect(p.vy).toBeGreaterThanOrEqual(PHYSICS.gravity); // only gravity applied
  });

  it('jumps when grounded', () => {
    const p = makePlayer(100, FLOOR.y - 88);
    // Land first
    for (let i = 0; i < 30; i++) stepPlayer(p, noInput(), [FLOOR], [], 1000);
    expect(p.grounded).toBe(true);
    const input = noInput();
    input.jump = true;
    input.jumpPressed = true;
    stepPlayer(p, input, [FLOOR], [], 1000);
    expect(p.vy).toBeLessThan(0); // moving up
  });

  it('jumps within coyote time after walking off', () => {
    const p = makePlayer(100, FLOOR.y - 88);
    for (let i = 0; i < 30; i++) stepPlayer(p, noInput(), [FLOOR], [], 1000);
    // Walk off to a position with no platform below
    p.x = 1100; // outside the floor
    p.grounded = false;
    p.airT = 1; // just left ground
    const input = noInput();
    input.jump = true;
    input.jumpPressed = true;
    stepPlayer(p, input, [FLOOR], [], 2000);
    expect(p.vy).toBeLessThan(0);
  });

  it('honors jump-buffer (press just before landing still triggers jump)', () => {
    const p = makePlayer(100, FLOOR.y - 200);
    // Fall, but press jump 2 frames before landing
    let pressedAlready = false;
    for (let i = 0; i < 60; i++) {
      const input = noInput();
      // Press jump roughly when y is close to landing but still above.
      const aboutToLand = p.y > FLOOR.y - 110 && p.y < FLOOR.y - 88 && !p.grounded && !pressedAlready;
      if (aboutToLand) {
        input.jump = true;
        input.jumpPressed = true;
        pressedAlready = true;
      }
      stepPlayer(p, input, [FLOOR], [], 1000);
      if (p.grounded && pressedAlready) {
        // Next step should consume the buffer and jump
        const continueInput = noInput();
        stepPlayer(p, continueInput, [FLOOR], [], 1000);
        expect(p.vy).toBeLessThanOrEqual(0);
        return;
      }
    }
  });

  it('clamps to world bounds', () => {
    const p = makePlayer(0, FLOOR.y - 88);
    const input = noInput();
    input.left = true;
    for (let i = 0; i < 30; i++) stepPlayer(p, input, [FLOOR], [], 1000);
    expect(p.x).toBe(0);
    p.x = 950;
    input.left = false;
    input.right = true;
    for (let i = 0; i < 30; i++) stepPlayer(p, input, [FLOOR], [], 1000);
    expect(p.x).toBe(1000 - p.w);
  });
});

describe('enemy interactions', () => {
  it('damages enemies on click within their bounds', () => {
    const e = makeEnemy(100, 100, 'rock');
    e.hp = 5;
    const hit = applyClickDamage([e], 110, 110);
    expect(hit).toBe(e);
    expect(e.hp).toBe(4);
    expect(e.hitFlash).toBeGreaterThan(0);
  });

  it('marks enemies as defeated when HP reaches 0', () => {
    const e = makeEnemy(100, 100, 'rock');
    e.hp = 1;
    applyClickDamage([e], 110, 110);
    expect(e.hp).toBe(0);
    expect(e.defeatT).toBe(1);
  });

  it('ignores clicks outside enemy bounds', () => {
    const e = makeEnemy(100, 100, 'rock');
    expect(applyClickDamage([e], 0, 0)).toBeNull();
    expect(e.hp).toBe(15);
  });

  it('skips defeated enemies', () => {
    const e = makeEnemy(100, 100, 'rock');
    e.defeatT = 5;
    expect(applyClickDamage([e], 110, 110)).toBeNull();
  });

  it('patrols within bounds', () => {
    const e = makeEnemy(100, 100, 'rock', 30);
    const original = e.x;
    stepEnemies([e]);
    expect(e.x).not.toBe(original);
    // Walk lots of frames — should not exceed maxX
    for (let i = 0; i < 200; i++) stepEnemies([e]);
    expect(e.x + e.w).toBeLessThanOrEqual(e.maxX);
    expect(e.x).toBeGreaterThanOrEqual(e.minX);
  });
});

describe('one-way platforms', () => {
  it('lets a player jump UP through a one-way platform without bonking head', () => {
    // Land player on the floor first, then jump.
    const p = makePlayer(150, FLOOR.y - 200);
    for (let i = 0; i < 30; i++) stepPlayer(p, noInput(), [FLOOR, ONE_WAY], [], 1000);
    expect(p.grounded).toBe(true);
    // Press jump — should rise past the one-way platform's top without snagging.
    const jump = noInput();
    jump.jump = true;
    jump.jumpPressed = true;
    let crossed = false;
    let peakY = p.y;
    for (let i = 0; i < 80; i++) {
      // Hold jump for the whole rise to get full jump height.
      const holdJump = noInput();
      holdJump.jump = true;
      if (i === 0) holdJump.jumpPressed = true;
      stepPlayer(p, holdJump, [FLOOR, ONE_WAY], [], 1000);
      if (p.y < peakY) peakY = p.y;
      if (p.y + p.h < ONE_WAY.y) crossed = true;
      if (p.vy > 0 && p.y + p.h > ONE_WAY.y) break; // already coming down past platform
    }
    expect(crossed).toBe(true);
  });

  it('lands the player on top of a one-way platform when falling onto it', () => {
    // Place player above the platform, falling.
    const p = makePlayer(150, ONE_WAY.y - 100);
    p.prevY = p.y;
    for (let i = 0; i < 120; i++) stepPlayer(p, noInput(), [FLOOR, ONE_WAY], [], 1000);
    expect(p.grounded).toBe(true);
    expect(p.y + p.h).toBeCloseTo(ONE_WAY.y, 0);
  });

  it('drops through a one-way platform when Down is pressed and grounded', () => {
    // Land first
    const p = makePlayer(150, ONE_WAY.y - 100);
    p.prevY = p.y;
    for (let i = 0; i < 60; i++) stepPlayer(p, noInput(), [FLOOR, ONE_WAY], [], 1000);
    expect(p.grounded).toBe(true);

    // Press Down for one frame to trigger drop-through.
    const down = noInput();
    down.down = true;
    down.downPressed = true;
    stepPlayer(p, down, [FLOOR, ONE_WAY], [], 1000);
    // Now release down and let physics fall a bit.
    for (let i = 0; i < 30; i++) {
      stepPlayer(p, noInput(), [FLOOR, ONE_WAY], [], 1000);
    }
    // Player has fallen below the one-way platform and landed on the FLOOR.
    expect(p.y + p.h).toBeCloseTo(FLOOR.y, 0);
  });

  it('does not get pushed sideways by a one-way platform when walking through it', () => {
    // Place player overlapping the platform horizontally but at the same Y
    // (i.e., walking through from the side). One-way should not resolve X.
    const p = makePlayer(80, ONE_WAY.y - 88); // bottom at platform top, x to the left
    p.prevY = p.y;
    p.grounded = true;
    const right = noInput();
    right.right = true;
    // Walk into the platform horizontally for many frames.
    for (let i = 0; i < 60; i++) stepPlayer(p, right, [FLOOR, ONE_WAY], [], 1000);
    // The player should have moved well past the platform's left edge — one-way
    // platforms don't block horizontal motion.
    expect(p.x).toBeGreaterThan(80);
  });
});

describe('hazards', () => {
  const hotSand: Hazard = { x: 100, y: 480, w: 80, h: 12, variant: 'hot-sand' };

  it('bounces the player up on first contact', () => {
    const p = makePlayer(120, 400);
    const hit = applyHazardBounce(p, [hotSand]);
    expect(hit).toBe(hotSand);
    expect(p.vy).toBe(PHYSICS.hazardBounce);
    expect(p.hurtT).toBeGreaterThan(0);
  });

  it('does not re-trigger while the player is still in the hurt window', () => {
    const p = makePlayer(120, 400);
    applyHazardBounce(p, [hotSand]);
    const second = applyHazardBounce(p, [hotSand]);
    expect(second).toBeNull();
  });

  it('ignores hazards the player does not overlap', () => {
    const p = makePlayer(0, 0);
    expect(applyHazardBounce(p, [hotSand])).toBeNull();
    expect(p.hurtT).toBe(0);
  });

  it('patrols cars between minX and maxX', () => {
    const car: Hazard = {
      x: 200,
      y: 400,
      w: 100,
      h: 50,
      variant: 'car',
      speed: 2,
      dir: 1,
      minX: 100,
      maxX: 600,
    };
    const startX = car.x;
    stepHazards([car]);
    expect(car.x).toBeGreaterThan(startX);
    for (let i = 0; i < 1000; i++) stepHazards([car]);
    expect(car.x + car.w).toBeLessThanOrEqual(car.maxX!);
    expect(car.x).toBeGreaterThanOrEqual(car.minX!);
  });

  it('stationary hazards (no speed) do not move', () => {
    const phone: Hazard = { x: 50, y: 100, w: 30, h: 14, variant: 'cell-phone' };
    stepHazards([phone]);
    expect(phone.x).toBe(50);
  });
});

describe('respawnIfFell', () => {
  it('respawns the player on the platform above when fallen off', () => {
    const p = makePlayer(100, 9000);
    const platforms: Platform[] = [
      { x: 0, y: 100, w: 200, h: 20 },
      { x: 80, y: 300, w: 200, h: 20 },
    ];
    const respawned = respawnIfFell(p, platforms, 1000);
    expect(respawned).toBe(true);
    // Implementation places player just above the platform (small epsilon to avoid re-collision)
    expect(p.y + p.h).toBeLessThanOrEqual(100);
    expect(p.y + p.h).toBeGreaterThanOrEqual(98);
    expect(p.vy).toBe(0);
  });

  it('does nothing while still inside the world', () => {
    const p = makePlayer(100, 200);
    const platforms: Platform[] = [{ x: 0, y: 300, w: 200, h: 20 }];
    expect(respawnIfFell(p, platforms, 1000)).toBe(false);
  });
});

describe('reachedGoal', () => {
  it('detects when player overlaps goal point', () => {
    const p = makePlayer(100, 100);
    expect(reachedGoal(p, p.x + p.w / 2, p.y + p.h / 2, 4)).toBe(true);
  });
  it('rejects far-away goals', () => {
    const p = makePlayer(0, 0);
    expect(reachedGoal(p, 1000, 1000, 10)).toBe(false);
  });
});
