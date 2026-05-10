import { describe, expect, it } from 'vitest';
import {
  makeBeachLevel,
  makeCarLevel,
  makeCaveLevel,
  makeMountainLevel,
  makeSkyBeachLevel,
} from '../src/game/levels.js';
import { reachedGoal, stepPlayer, makePlayer, respawnIfFell } from '../src/game/physics.js';
import type { InputState } from '../src/game/types.js';

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

describe('Mountain level', () => {
  it('places the player above the floor at start', () => {
    const lvl = makeMountainLevel();
    expect(lvl.playerStart.y).toBeLessThan(lvl.height);
    expect(lvl.playerStart.y).toBeGreaterThan(0);
  });

  it('has a flag/goal near the top of the world', () => {
    const lvl = makeMountainLevel();
    expect(lvl.goal.y).toBeLessThan(lvl.height * 0.2);
  });

  it('player lands on the floor without falling out of the world', () => {
    const lvl = makeMountainLevel();
    const p = makePlayer(lvl.playerStart.x, lvl.playerStart.y);
    for (let i = 0; i < 120; i++) {
      stepPlayer(p, noInput(), lvl.platforms, lvl.enemies, lvl.width);
      respawnIfFell(p, lvl.platforms, lvl.height);
    }
    expect(p.grounded).toBe(true);
    expect(p.y).toBeLessThan(lvl.height);
  });

  it('reaching the goal coordinates triggers a win', () => {
    const lvl = makeMountainLevel();
    const p = makePlayer(lvl.goal.x - 22, lvl.goal.y - 80);
    expect(reachedGoal(p, lvl.goal.x, lvl.goal.y)).toBe(true);
  });
});

describe('Cave level', () => {
  it('places the player near the top and goal near the bottom (descent)', () => {
    const lvl = makeCaveLevel();
    expect(lvl.playerStart.y).toBeLessThan(lvl.height * 0.2);
    expect(lvl.goal.y).toBeGreaterThan(lvl.height * 0.7);
    expect(lvl.scrollDir).toBe(1);
  });

  it('has at least one platform', () => {
    const lvl = makeCaveLevel();
    expect(lvl.platforms.length).toBeGreaterThan(5);
  });

  it('has slime enemies', () => {
    const lvl = makeCaveLevel();
    expect(lvl.enemies.every((e) => e.variant === 'slime')).toBe(true);
  });
});

describe('Beach level', () => {
  it('is wider than tall (horizontal traverse)', () => {
    const lvl = makeBeachLevel();
    expect(lvl.width).toBeGreaterThan(lvl.height * 2);
    expect(lvl.scrollDir).toBe(0);
    expect(lvl.progressAxis).toBe('x');
  });

  it('places player at the left and goal at the right', () => {
    const lvl = makeBeachLevel();
    expect(lvl.playerStart.x).toBeLessThan(lvl.width * 0.1);
    expect(lvl.goal.x).toBeGreaterThan(lvl.width * 0.9);
  });

  it('has hot-sand hazards (no death; bouncy)', () => {
    const lvl = makeBeachLevel();
    expect(lvl.hazards.length).toBeGreaterThan(0);
    expect(lvl.hazards.every((h) => h.variant === 'hot-sand')).toBe(true);
  });

  it('player lands on the sand floor without falling out', () => {
    const lvl = makeBeachLevel();
    const p = makePlayer(lvl.playerStart.x, lvl.playerStart.y);
    for (let i = 0; i < 60; i++) {
      stepPlayer(p, noInput(), lvl.platforms, lvl.enemies, lvl.width);
      respawnIfFell(p, lvl.platforms, lvl.height);
    }
    expect(p.grounded).toBe(true);
    expect(p.y).toBeLessThan(lvl.height);
  });
});

describe('Car level', () => {
  it('is wider than tall (horizontal traverse)', () => {
    const lvl = makeCarLevel();
    expect(lvl.width).toBeGreaterThan(lvl.height * 2);
    expect(lvl.progressAxis).toBe('x');
  });

  it('has clickable phone enemies and patrolling car hazards', () => {
    const lvl = makeCarLevel();
    const phones = lvl.enemies.filter((e) => e.variant === 'phone');
    const cars = lvl.hazards.filter((h) => h.variant === 'car');
    expect(phones.length).toBeGreaterThan(0);
    expect(cars.length).toBeGreaterThan(0);
    // Phones should be low-HP (designed to be spam-clicked).
    expect(phones.every((p) => p.maxHp <= 10)).toBe(true);
    // Cars patrol and have a stable colorIndex.
    expect(cars.every((c) => (c.speed ?? 0) > 0)).toBe(true);
    expect(cars.every((c) => c.colorIndex !== undefined)).toBe(true);
  });

  it('places goal (home) at the right side', () => {
    const lvl = makeCarLevel();
    expect(lvl.goal.x).toBeGreaterThan(lvl.width * 0.9);
  });
});

describe('reachedGoal works for horizontal levels', () => {
  it('detects when player overlaps the shark tooth', () => {
    const lvl = makeBeachLevel();
    const p = makePlayer(lvl.goal.x - 22, lvl.goal.y - 60);
    expect(reachedGoal(p, lvl.goal.x, lvl.goal.y)).toBe(true);
  });
  it('detects when player overlaps the house', () => {
    const lvl = makeCarLevel();
    const p = makePlayer(lvl.goal.x - 22, lvl.goal.y - 60);
    expect(reachedGoal(p, lvl.goal.x, lvl.goal.y)).toBe(true);
  });
});

describe('makeSkyBeachLevel', () => {
  it('is 2800x2400 with sand floor and horizontal progress', () => {
    const lvl = makeSkyBeachLevel('easy');
    expect(lvl.width).toBe(2800);
    expect(lvl.height).toBe(2400);
    expect(lvl.scrollDir).toBe(0);
    expect(lvl.progressAxis).toBe('x');
    expect(lvl.map).toBe('sky-beach');
  });

  it('places the player on or above the sand floor at start', () => {
    const lvl = makeSkyBeachLevel('easy');
    const floorY = lvl.height - 32;
    expect(lvl.playerStart.y).toBeLessThanOrEqual(floorY);
    expect(lvl.playerStart.x).toBeGreaterThanOrEqual(0);
    expect(lvl.playerStart.x).toBeLessThan(lvl.width);
  });

  it('places the goal on the floor at the right side', () => {
    const lvl = makeSkyBeachLevel('easy');
    const floorY = lvl.height - 32;
    expect(lvl.goal.x).toBeGreaterThan(lvl.width * 0.9);
    // Goal sits within ~100px of the sand floor.
    expect(lvl.goal.y).toBeGreaterThanOrEqual(floorY - 100);
    expect(lvl.goal.y).toBeLessThanOrEqual(floorY);
  });

  it('all elevated cloud platforms have variant=cloud and oneWay=true', () => {
    const lvl = makeSkyBeachLevel('medium');
    const floorY = lvl.height - 32;
    const clouds = lvl.platforms.filter((p) => p.y < floorY);
    expect(clouds.length).toBeGreaterThan(0);
    expect(clouds.every((p) => p.variant === 'cloud')).toBe(true);
    expect(clouds.every((p) => p.oneWay === true)).toBe(true);
  });

  it('all enemies are within world bounds', () => {
    const lvl = makeSkyBeachLevel('hard');
    expect(lvl.enemies.length).toBeGreaterThan(0);
    for (const e of lvl.enemies) {
      expect(e.x).toBeGreaterThanOrEqual(0);
      expect(e.x + e.w).toBeLessThanOrEqual(lvl.width);
      expect(e.y).toBeGreaterThanOrEqual(0);
      expect(e.y + e.h).toBeLessThanOrEqual(lvl.height);
    }
  });

  it('enemy count strictly increases with difficulty', () => {
    const easy = makeSkyBeachLevel('easy');
    const medium = makeSkyBeachLevel('medium');
    const hard = makeSkyBeachLevel('hard');
    expect(easy.enemies.length).toBeLessThan(medium.enemies.length);
    expect(medium.enemies.length).toBeLessThan(hard.enemies.length);
  });

  it('has hot-sand hazards on the ground', () => {
    const lvl = makeSkyBeachLevel('easy');
    expect(lvl.hazards.length).toBeGreaterThan(0);
    expect(lvl.hazards.every((h) => h.variant === 'hot-sand')).toBe(true);
  });
});
