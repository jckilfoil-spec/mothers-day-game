import { describe, expect, it } from 'vitest';
import { rng } from '../src/game/rng.js';

describe('rng', () => {
  it('is deterministic for the same seed', () => {
    const a = rng(42);
    const b = rng(42);
    for (let i = 0; i < 20; i++) {
      expect(a()).toBe(b());
    }
  });

  it('produces different sequences for different seeds', () => {
    const a = rng(1);
    const b = rng(2);
    let allEqual = true;
    for (let i = 0; i < 5; i++) {
      if (a() !== b()) allEqual = false;
    }
    expect(allEqual).toBe(false);
  });

  it('returns values in [0, 1)', () => {
    const r = rng(123);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
