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
  variant?: 'rock' | 'ledge';
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
  variant: 'rock' | 'slime';
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
  /** Current animation phase counter. */
  animT: number;
  /** Attack swing remaining (frames). */
  attackT: number;
  walking: boolean;
}

export interface LevelData {
  map: MapId;
  width: number;
  height: number;
  /** Player starting world position. */
  playerStart: Vec2;
  platforms: Platform[];
  enemies: EnemyState[];
  /** World position of the goal (flag center / crystal center). */
  goal: Vec2;
  /** Direction the camera primarily scrolls. Mountain = up (-1), cave = down (1). */
  scrollDir: -1 | 1;
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
};
