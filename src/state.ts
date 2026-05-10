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

export type MapId = 'mountain' | 'cave' | 'beach' | 'car' | 'sky-beach';

/** Difficulty for the open-world prototype only. The 4 solid maps don't read this. */
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Character {
  id: string;
  name: string;
  /** Cropped 256x256 circular face as a data URL, or null for the default silhouette. */
  faceImage: string | null;
  customMessage: string;
  createdAt: number;
  /** Number of lives left. Only meaningful when settings.deathMode is on; decrements
   *  on death and the character is deleted when this hits 0. */
  livesLeft?: number;
}

export interface Settings {
  selectedCharacterId: string | null;
  muted: boolean;
  lastMap: MapId | null;
  /** User-controlled camera zoom multiplier on top of the auto-scale. 1.0 = no change. */
  zoom: number;
  /** When true, hazards damage the player. 5 HP per life, 3 lives per character —
   *  losing all 3 deletes the character. Default off; pure whimsy unless toggled. */
  deathMode: boolean;

  // ---------- Accessibility + UI state (added on launch night) ----------

  /** Disables non-essential motion (confetti rain, banner slide-in, bounce-in
   *  animations, parallax). Defaults to the OS `prefers-reduced-motion` value
   *  on first read; explicit toggles persist regardless of the OS pref. */
  reduceMotion: boolean;
  /** Body class `hc` — bumps DOM contrast (HUD chip, banner, settings panel).
   *  Canvas outlines (platforms/hero/enemies/goal) are a TODO at the render layer. */
  highContrast: boolean;
  /** Body class `lg-text` — bumps font-size on HUD/banner/settings/cookie banner
   *  by ~15%. Doesn't touch canvas text (timer pill etc.). */
  largeText: boolean;
  /** When false, future `Game.cameraShake()` will no-op. Camera shake isn't
   *  implemented yet; this toggle persists for forward-compat. */
  screenShake: boolean;
  /** When true, damage/goal stingers (ouch, honk, defeat, win) play through a
   *  separate gain node so they're audible even when master sound is muted. */
  audioCues: boolean;
  /** Which collapsible sections in the settings panel are expanded. Persisted
   *  so a user who opens 'a11y' once doesn't have to re-open it next session. */
  uiOpenSections: string[];
  /** Set true once the user clicks `×` on the in-game controls banner; the
   *  banner is then suppressed on every future run (controls live in gear ▸ Controls). */
  controlsBannerDismissed: boolean;

  /** Last-picked difficulty for the open-world prototype map. Persisted so the
   *  selector remembers across sessions. The 4 solid maps ignore this. */
  prototypeDifficulty: Difficulty;
}

const CHARACTERS_KEY = 'mdg.characters';
const SETTINGS_KEY = 'mdg.settings';
const SCHEMA_VERSION_KEY = 'mdg.schema';
const SCHEMA_VERSION = 1;

const DEFAULT_SETTINGS: Settings = {
  selectedCharacterId: null,
  muted: false,
  lastMap: null,
  zoom: 1,
  deathMode: false,
  // a11y defaults — reduceMotion is overridden by detectReduceMotion() below
  // when a user has no stored preference yet.
  reduceMotion: false,
  highContrast: false,
  largeText: false,
  screenShake: true,
  audioCues: true,
  uiOpenSections: [],
  controlsBannerDismissed: false,
  prototypeDifficulty: 'easy',
};

/** Read the OS-level `prefers-reduced-motion` media query. Returns false in any
 *  environment without `window.matchMedia` (tests, SSR). */
function detectReduceMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

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
    livesLeft: 3,
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

/** Decrement a character's lives by 1 (only used in death mode). Returns the new count. */
export function loseLife(id: string): number {
  const list = getCharacters();
  const c = list.find((x) => x.id === id);
  if (!c) return 0;
  const current = c.livesLeft ?? 3;
  c.livesLeft = Math.max(0, current - 1);
  writeJSON(CHARACTERS_KEY, list);
  return c.livesLeft;
}

/** Reset a character's lives to 3 (e.g. user reset action). */
export function resetLives(id: string): void {
  const list = getCharacters();
  const c = list.find((x) => x.id === id);
  if (!c) return;
  c.livesLeft = 3;
  writeJSON(CHARACTERS_KEY, list);
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
  const stored = readJSON<Partial<Settings>>(SETTINGS_KEY, {});
  const merged: Settings = { ...DEFAULT_SETTINGS, ...stored };
  // Honor the OS-level `prefers-reduced-motion` as the default, but only when
  // the user hasn't explicitly toggled our setting yet. Once they do, their
  // explicit value wins (so a user who opted INTO motion overrides their OS pref).
  if (stored.reduceMotion === undefined) {
    merged.reduceMotion = detectReduceMotion();
  }
  return merged;
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

export function setZoom(zoom: number): void {
  saveSettings({ ...getSettings(), zoom: Math.max(0.5, Math.min(2.0, zoom)) });
}

export function setDeathMode(deathMode: boolean): void {
  saveSettings({ ...getSettings(), deathMode });
}

// ---------- a11y + UI setters ----------

export function setReduceMotion(v: boolean): void {
  saveSettings({ ...getSettings(), reduceMotion: v });
}
export function setHighContrast(v: boolean): void {
  saveSettings({ ...getSettings(), highContrast: v });
}
export function setLargeText(v: boolean): void {
  saveSettings({ ...getSettings(), largeText: v });
}
export function setScreenShake(v: boolean): void {
  saveSettings({ ...getSettings(), screenShake: v });
}
export function setAudioCues(v: boolean): void {
  saveSettings({ ...getSettings(), audioCues: v });
}
export function setControlsBannerDismissed(v: boolean): void {
  saveSettings({ ...getSettings(), controlsBannerDismissed: v });
}
export function setPrototypeDifficulty(v: Difficulty): void {
  saveSettings({ ...getSettings(), prototypeDifficulty: v });
}
/** Toggle a collapsible-section id into / out of `uiOpenSections`. */
export function toggleUiSection(section: string): void {
  const s = getSettings();
  const open = new Set(s.uiOpenSections);
  if (open.has(section)) open.delete(section);
  else open.add(section);
  saveSettings({ ...s, uiOpenSections: [...open] });
}

export { DEFAULT_MESSAGE };
