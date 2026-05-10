/** Shared types for the game engine — kept dependency-free for testability. */

import type { MapId } from '../state.js';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Platform extends Rect {
  /** Optional cosmetic variant for rendering. */
  variant?: 'rock' | 'ledge' | 'cloud';
  /** When true, only collides on the way down — players can jump up through it
   *  (no head-bonk) and drop down through it by pressing the down key. */
  oneWay?: boolean;
}

export interface EnemyState {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  /** Pacing speed in px/frame. 0 = stationary. */
  speed: number;
  dir: 1 | -1;
  /** Patrol bounds (world X). */
  minX: number;
  maxX: number;
  /** Visual flash counter (frames remaining). */
  hitFlash: number;
  /** Defeat puff timer (frames). 0 = alive, > 0 = defeated and animating. */
  defeatT: number;
  variant: 'rock' | 'slime' | 'phone' | 'seagull';
  /** When false, the enemy is clickable but doesn't block player movement (seagulls overhead). */
  solid: boolean;
  /** Wall-clock ms (performance.now) for the next scheduled action. Seagulls use this for
   *  poop drops. Undefined for variants that don't schedule. */
  nextActionAt?: number;
  emoji: string;
}

export interface PlayerState {
  x: number;
  y: number;
  /** Y position at the start of the current frame — used for one-way platform crossing checks. */
  prevY: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  facing: 1 | -1;
  grounded: boolean;
  /** Frames since left ground (for coyote time). */
  airT: number;
  /** Frames remaining of jump-buffer (was the jump key pressed recently?). */
  jumpBuffer: number;
  /** Frames remaining where one-way platforms are ignored — set when the player taps Down. */
  dropThrough: number;
  /** Frames of "ouch" invincibility after touching a hazard. While > 0, hazards don't re-trigger. */
  hurtT: number;
  /** Current animation phase counter. */
  animT: number;
  /** Attack swing remaining (frames). */
  attackT: number;
  walking: boolean;
}

/** A non-killable obstacle. Touching it bounces the player up and away — no damage, no death,
 *  just a comedic "ouch" with a brief invincibility window so the player can escape. */
export interface Hazard extends Rect {
  variant: 'hot-sand' | 'car' | 'poop';
  /** Patrol speed (px/frame). 0 = stationary. */
  speed?: number;
  dir?: 1 | -1;
  minX?: number;
  maxX?: number;
  /** For cars: stable index into the color palette. Increments on each direction reversal,
   *  so cars stay one color until they bounce off a wall. */
  colorIndex?: number;
  /** Vertical velocity (px/frame). Used by falling hazards (poop). */
  vy?: number;
  /** When true, the hazard should be removed from the level next frame. */
  dead?: boolean;
}

/** Per-frame seagull drop scheduling. */
export interface SeagullExtra {
  nextDropAt?: number;
}

export interface LevelData {
  map: MapId;
  width: number;
  height: number;
  /** Player starting world position. */
  playerStart: Vec2;
  platforms: Platform[];
  enemies: EnemyState[];
  hazards: Hazard[];
  /** World position of the goal (flag center / crystal center / shark tooth / front door). */
  goal: Vec2;
  /** Direction the camera primarily scrolls. Mountain = up (-1), cave = down (1).
   *  For horizontal levels (beach/car), set 0 — camera will not bias vertically. */
  scrollDir: -1 | 0 | 1;
  /** Which axis the progress bar uses for "% to goal". Defaults to 'y' for legacy levels. */
  progressAxis?: 'x' | 'y';
}

export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  down: boolean;
  /** Edge-triggered jump (true on the frame jump was first pressed). */
  jumpPressed: boolean;
  /** Edge-triggered down (true on the frame down was first pressed). */
  downPressed: boolean;
  /** Click event in world coordinates this frame, consumed by reading. */
  clickWorld: Vec2 | null;
}

/** Tuned for "whimsical" — generous jump height, snappy movement, very forgiving coyote. */
export const PHYSICS = {
  gravity: 0.55,
  jumpVelocity: -17, // peak height ≈ 263px at g=0.55
  variableJumpCutoff: -8, // tap = small hop, hold = full jump
  moveSpeed: 5,
  groundFriction: 0.78,
  airDrag: 0.94,
  maxFall: 14,
  coyoteFrames: 10, // generous — ~165ms at 60fps
  jumpBufferFrames: 8,
  /** Frames the player ignores one-way platforms after pressing Down. */
  dropThroughFrames: 12,
  /** Bounce velocity when touching a hazard. */
  hazardBounce: -14,
  /** Frames of invincibility after a hazard touch. */
  hurtFrames: 45,
};
