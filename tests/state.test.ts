import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  _setStoreForTests,
  addCharacter,
  deleteCharacter,
  getCharacter,
  getCharacters,
  getSelectedCharacter,
  getSettings,
  loseLife,
  resetLives,
  selectCharacter,
  setDeathMode,
  setMuted,
  setZoom,
  updateCharacter,
} from '../src/state.js';

function inMemoryStore(): { get(k: string): string | null; set(k: string, v: string): void; remove(k: string): void } {
  const m = new Map<string, string>();
  return {
    get: (k) => (m.has(k) ? (m.get(k) as string) : null),
    set: (k, v) => void m.set(k, v),
    remove: (k) => void m.delete(k),
  };
}

describe('state CRUD', () => {
  beforeEach(() => {
    _setStoreForTests(inMemoryStore());
  });
  afterEach(() => {
    _setStoreForTests();
  });

  it('starts with no characters', () => {
    expect(getCharacters()).toEqual([]);
    expect(getSelectedCharacter()).toBeNull();
  });

  it('adds a character and auto-selects the first one', () => {
    const c = addCharacter({ name: 'Mommy', faceImage: null });
    expect(c.name).toBe('Mommy');
    expect(c.id).toBeTruthy();
    expect(getCharacters()).toHaveLength(1);
    expect(getSelectedCharacter()?.id).toBe(c.id);
  });

  it('does not change the selected character when adding subsequent ones', () => {
    const a = addCharacter({ name: 'A', faceImage: null });
    addCharacter({ name: 'B', faceImage: null });
    expect(getSelectedCharacter()?.id).toBe(a.id);
  });

  it('trims names and falls back to "Mom"', () => {
    const c = addCharacter({ name: '   ', faceImage: null });
    expect(c.name).toBe('Mom');
  });

  it('updates name and message', () => {
    const c = addCharacter({ name: 'A', faceImage: null });
    const updated = updateCharacter(c.id, { name: 'Anna', customMessage: 'Hi mom' });
    expect(updated?.name).toBe('Anna');
    expect(updated?.customMessage).toBe('Hi mom');
    // Persisted
    expect(getCharacter(c.id)?.name).toBe('Anna');
  });

  it('keeps the existing name if patch is empty/whitespace', () => {
    const c = addCharacter({ name: 'A', faceImage: null });
    const updated = updateCharacter(c.id, { name: '   ' });
    expect(updated?.name).toBe('A');
  });

  it('returns null when updating a non-existent id', () => {
    expect(updateCharacter('does-not-exist', { name: 'X' })).toBeNull();
  });

  it('deletes a character and reselects the first remaining one', () => {
    const a = addCharacter({ name: 'A', faceImage: null });
    const b = addCharacter({ name: 'B', faceImage: null });
    selectCharacter(a.id);
    deleteCharacter(a.id);
    expect(getCharacters()).toHaveLength(1);
    expect(getSelectedCharacter()?.id).toBe(b.id);
  });

  it('deleting the only character clears the selection', () => {
    const a = addCharacter({ name: 'A', faceImage: null });
    deleteCharacter(a.id);
    expect(getSelectedCharacter()).toBeNull();
  });

  it('persists mute setting', () => {
    setMuted(true);
    expect(getSettings().muted).toBe(true);
    setMuted(false);
    expect(getSettings().muted).toBe(false);
  });

  it('select can be set to null', () => {
    addCharacter({ name: 'A', faceImage: null });
    selectCharacter(null);
    expect(getSelectedCharacter()).toBeNull();
  });

  it('new characters start with 3 lives (used by death mode)', () => {
    const c = addCharacter({ name: 'A', faceImage: null });
    expect(c.livesLeft).toBe(3);
  });

  it('loseLife decrements, clamps to 0', () => {
    const c = addCharacter({ name: 'A', faceImage: null });
    expect(loseLife(c.id)).toBe(2);
    expect(loseLife(c.id)).toBe(1);
    expect(loseLife(c.id)).toBe(0);
    expect(loseLife(c.id)).toBe(0);
    expect(getCharacter(c.id)?.livesLeft).toBe(0);
  });

  it('resetLives restores to 3', () => {
    const c = addCharacter({ name: 'A', faceImage: null });
    loseLife(c.id);
    loseLife(c.id);
    resetLives(c.id);
    expect(getCharacter(c.id)?.livesLeft).toBe(3);
  });

  it('persists zoom + deathMode', () => {
    setZoom(1.2);
    setDeathMode(true);
    expect(getSettings().zoom).toBe(1.2);
    expect(getSettings().deathMode).toBe(true);
    setZoom(0.1); // out of range, clamped to 0.5
    expect(getSettings().zoom).toBe(0.5);
    setZoom(99); // clamped to 2.0
    expect(getSettings().zoom).toBe(2);
  });
});
