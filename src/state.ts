/**
 * Persistent state for characters and settings.
 *
 * Two localStorage keys are owned by this module:
 *   - mdg.characters : Character[]
 *   - mdg.settings   : Settings
 *
 * Everything is synchronous; localStorage failures (private mode, quota) fall back
 * to an in-memory store so the game stays playable but won't survive a reload.
 */

export type MapId = 'mountain' | 'cave';

export interface Character {
  id: string;
  name: string;
  /** Cropped 256x256 circular face as a data URL, or null for the default silhouette. */
  faceImage: string | null;
  customMessage: string;
  createdAt: number;
}

export interface Settings {
  selectedCharacterId: string | null;
  muted: boolean;
  lastMap: MapId | null;
}

const CHARACTERS_KEY = 'mdg.characters';
const SETTINGS_KEY = 'mdg.settings';
const SCHEMA_VERSION_KEY = 'mdg.schema';
const SCHEMA_VERSION = 1;

const DEFAULT_SETTINGS: Settings = {
  selectedCharacterId: null,
  muted: false,
  lastMap: null,
};

const DEFAULT_MESSAGE =
  'Thank you so much for everything mom, you gave me the world and I love you so much.';

/** Tiny in-memory fallback used when localStorage is unavailable. */
type Store = { get(k: string): string | null; set(k: string, v: string): void; remove(k: string): void };

function makeMemoryStore(): Store {
  const m = new Map<string, string>();
  return {
    get: (k) => (m.has(k) ? (m.get(k) as string) : null),
    set: (k, v) => void m.set(k, v),
    remove: (k) => void m.delete(k),
  };
}

function makeStore(): Store {
  try {
    if (typeof localStorage === 'undefined') return makeMemoryStore();
    const probe = '__mdg_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return {
      get: (k) => localStorage.getItem(k),
      set: (k, v) => localStorage.setItem(k, v),
      remove: (k) => localStorage.removeItem(k),
    };
  } catch {
    return makeMemoryStore();
  }
}

let store: Store = makeStore();

/** Test-only: swap the storage layer (and reset settings cache). */
export function _setStoreForTests(custom?: Store): void {
  store = custom ?? makeStore();
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'c_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function readJSON<T>(key: string, fallback: T): T {
  const raw = store.get(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    store.set(key, JSON.stringify(value));
  } catch {
    // Quota exceeded: silently drop. The character may not persist past reload.
  }
}

function ensureSchema(): void {
  const v = store.get(SCHEMA_VERSION_KEY);
  if (v !== String(SCHEMA_VERSION)) {
    store.set(SCHEMA_VERSION_KEY, String(SCHEMA_VERSION));
  }
}

// ---------------- Characters ----------------

export function getCharacters(): Character[] {
  ensureSchema();
  const list = readJSON<Character[]>(CHARACTERS_KEY, []);
  // Defensive: filter out anything that doesn't look like a character.
  return list.filter((c) => c && typeof c.id === 'string' && typeof c.name === 'string');
}

export function getCharacter(id: string): Character | null {
  return getCharacters().find((c) => c.id === id) ?? null;
}

export interface NewCharacterInput {
  name: string;
  faceImage: string | null;
  customMessage?: string;
}

export function addCharacter(input: NewCharacterInput): Character {
  const c: Character = {
    id: uuid(),
    name: input.name.trim() || 'Mom',
    faceImage: input.faceImage,
    customMessage: (input.customMessage ?? DEFAULT_MESSAGE).trim() || DEFAULT_MESSAGE,
    createdAt: Date.now(),
  };
  const list = getCharacters();
  list.push(c);
  writeJSON(CHARACTERS_KEY, list);
  // First character becomes selected automatically.
  if (!getSettings().selectedCharacterId) {
    selectCharacter(c.id);
  }
  return c;
}

export type CharacterPatch = Partial<Pick<Character, 'name' | 'faceImage' | 'customMessage'>>;

export function updateCharacter(id: string, patch: CharacterPatch): Character | null {
  const list = getCharacters();
  const idx = list.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  const existing = list[idx];
  if (!existing) return null;
  const updated: Character = {
    ...existing,
    ...(patch.name !== undefined ? { name: patch.name.trim() || existing.name } : {}),
    ...(patch.faceImage !== undefined ? { faceImage: patch.faceImage } : {}),
    ...(patch.customMessage !== undefined
      ? { customMessage: patch.customMessage.trim() || existing.customMessage }
      : {}),
  };
  list[idx] = updated;
  writeJSON(CHARACTERS_KEY, list);
  return updated;
}

export function deleteCharacter(id: string): void {
  const list = getCharacters().filter((c) => c.id !== id);
  writeJSON(CHARACTERS_KEY, list);
  const settings = getSettings();
  if (settings.selectedCharacterId === id) {
    const next = list[0]?.id ?? null;
    saveSettings({ ...settings, selectedCharacterId: next });
  }
}

// ---------------- Settings ----------------

export function getSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...readJSON<Partial<Settings>>(SETTINGS_KEY, {}) };
}

export function saveSettings(s: Settings): void {
  writeJSON(SETTINGS_KEY, s);
}

export function selectCharacter(id: string | null): void {
  saveSettings({ ...getSettings(), selectedCharacterId: id });
}

export function getSelectedCharacter(): Character | null {
  const id = getSettings().selectedCharacterId;
  return id ? getCharacter(id) : null;
}

export function setMuted(muted: boolean): void {
  saveSettings({ ...getSettings(), muted });
}

export function setLastMap(map: MapId): void {
  saveSettings({ ...getSettings(), lastMap: map });
}

export { DEFAULT_MESSAGE };
