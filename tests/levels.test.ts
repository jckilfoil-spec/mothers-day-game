import { describe, expect, it } from 'vitest';
import { makeCaveLevel, makeMountainLevel } from '../src/game/levels.js';
import { reachedGoal, stepPlayer, makePlayer, respawnIfFell } from '../src/game/physics.js';
import type { InputState } from '../src/game/types.js';

function noInput(): InputState {
  return { left: false, right: false, jump: false, jumpPressed: false, clickWorld: null };
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
