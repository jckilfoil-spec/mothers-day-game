/**
 * Main game runtime. Owns the canvas, the loop, the level state, and all rendering.
 *
 * Lifecycle:
 *   const game = new Game(canvas, { map, character }, { onWin, onPause });
 *   game.start();
 *   ...
 *   game.destroy();
 */

import { Input } from './input.js';
import {
  applyClickDamage,
  applyHazardBounce,
  makePlayer,
  reachedGoal,
  respawnIfFell,
  stepEnemies,
  stepHazards,
  stepPlayer,
} from './physics.js';
import { drawPlayer } from './player.js';
import { drawEnemy } from './enemy.js';
import {
  paintBeachScene,
  paintCar,
  paintCarScene,
  paintGoalParticles,
  paintPoop,
  paintCaveScene,
  paintCrystal,
  paintFlag,
  paintHotSand,
  paintHouse,
  paintMountainScene,
  paintRockPlatform,
  paintSharkTooth,
} from './render.js';
import type { LevelData, PlayerState } from './types.js';
import { sfx, stopAmbient } from '../audio/sounds.js';
import { loadImage } from '../util/face.js';
import { formatTime } from '../util/time.js';
import {
  deleteCharacter,
  getCharacter,
  getSelectedCharacter,
  getSettings,
  loseLife,
} from '../state.js';

function clamp(min: number, max: number, v: number): number {
  return Math.max(min, Math.min(max, v));
}

export interface GameOpts {
  level: LevelData;
  /** Cropped face data URL or null. */
  faceImage: string | null;
  characterName: string;
  characterId: string;
}

export interface GameCallbacks {
  onWin(elapsedMs: number): void;
  /** Called when the active character has lost all their lives in death mode and has
   *  been deleted from state. The host should navigate to character manager. */
  onCharacterLost?(): void;
}

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private level: LevelData;
  private player: PlayerState;
  private input: Input;
  private callbacks: GameCallbacks;

  private faceImg: HTMLImageElement | null = null;
  private camera = { x: 0, y: 0 };
  private viewport = { w: 800, h: 600 };
  private dpr = 1;
  /** Multiplier applied to the world rendering. 1.0 on phones; up to ~1.5 on desktop —
   *  scales sprites and platforms larger so wider screens don't make the action tiny. */
  private worldScale = 1;
  /** Whether the device exposes a coarse pointer (touch). Affects HUD margins so the
   *  on-screen movement buttons don't cover the progress-bar timer. */
  private isTouch = false;

  private running = false;
  private rafId = 0;
  private acc = 0;
  private last = 0;
  private readonly STEP = 1000 / 60;

  private won = false;
  private winT = 0;
  /** When true, update() is a no-op and the timer freezes. draw() still runs so the
   *  frozen frame is visible behind menus / settings overlays. */
  private paused = false;

  /** Wall-clock ms when the player first moved (or null until they have). */
  private startedAt: number | null = null;
  /** Wall-clock ms when the player reached the goal (or null until they have). */
  private completedAt: number | null = null;
  /** Wall-clock ms when pause started (used to credit the timer back on resume). */
  private pausedAt: number | null = null;

  // ---- Death mode ----
  private characterId: string;
  /** Maximum HP per life when death mode is on. */
  private readonly maxHp = 5;
  /** Current HP. Only used while settings.deathMode is true. */
  private hp = 5;
  /** Death animation counter (frames). 0 = alive. > 0 = animating, frozen. */
  private dyingT = 0;
  /** Cached current lives (read from character record on init / after death). */
  private livesLeft = 3;

  constructor(canvas: HTMLCanvasElement, opts: GameOpts, callbacks: GameCallbacks) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2d context');
    this.ctx = ctx;
    this.level = opts.level;
    this.player = makePlayer(opts.level.playerStart.x, opts.level.playerStart.y);
    this.callbacks = callbacks;
    this.characterId = opts.characterId;
    // Pull current lives from the character record; default to 3 if unset.
    const c = getCharacter(this.characterId);
    this.livesLeft = c?.livesLeft ?? 3;

    this.input = new Input(canvas, (cx, cy) => this.handleClick(cx, cy));

    if (opts.faceImage) {
      loadImage(opts.faceImage).then((img) => (this.faceImg = img)).catch(() => {});
    }

    this.resize();
    window.addEventListener('resize', this.resize);
    // Snap camera to player on start so the first frame shows the action,
    // not (0, 0) of the world.
    this.snapCameraToPlayer();
  }

  /** Effective viewport size in WORLD units (canvas px / worldScale). */
  private viewWorld(): { w: number; h: number } {
    return { w: this.viewport.w / this.worldScale, h: this.viewport.h / this.worldScale };
  }

  /** Pick a target camera X that centers the world if it fits, otherwise scrolls. */
  private clampCameraX(targetX: number): number {
    const { w: vw } = this.viewWorld();
    if (this.level.width <= vw) {
      // World is narrower than the (effective) viewport — center it always.
      return (this.level.width - vw) / 2;
    }
    return Math.max(0, Math.min(this.level.width - vw, targetX));
  }

  private clampCameraY(targetY: number): number {
    const { h: vh } = this.viewWorld();
    return Math.max(-200, Math.min(this.level.height - vh + 100, targetY));
  }

  private snapCameraToPlayer(): void {
    const px = this.player.x + this.player.w / 2;
    const py = this.player.y + this.player.h / 2;
    const { w: vw, h: vh } = this.viewWorld();
    const lookAheadX = this.player.facing * 100;
    const lookAheadY = this.level.scrollDir * -80;
    this.camera.x = this.clampCameraX(px + lookAheadX - vw / 2);
    this.camera.y = this.clampCameraY(py + lookAheadY - vh / 2);
  }

  bindTouchButton(button: HTMLElement, key: 'left' | 'right' | 'jump' | 'down'): void {
    this.input.bindButton(button, key);
  }

  private resize = (): void => {
    this.dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.viewport = { w, h };
    // Scale up the world rendering on wider viewports so desktop / large screens don't
    // leave the action looking tiny. Mobile (anything ≤ ~800px wide) stays at 1.0.
    // Capped at 1.3 so the bottom doesn't run out of room on horizontal levels and
    // the user has room left over for the live HUD + touch buttons.
    const base = Math.max(1, Math.min(1.3, w / 900));
    // Multiply by the user's saved zoom preference (defaults to 1.0; slider in
    // settings can tune in either direction).
    this.worldScale = clamp(0.6, 1.8, base * (getSettings().zoom ?? 1));
    if (typeof window !== 'undefined' && window.matchMedia) {
      this.isTouch = window.matchMedia('(pointer: coarse)').matches;
    }
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    // After resize, re-clamp camera so it doesn't hover over empty world.
    if (this.player) this.snapCameraToPlayer();
  };

  private handleClick(canvasX: number, canvasY: number): void {
    if (this.won) return;
    // First click counts as "started" — clicking enemies is gameplay too.
    if (this.startedAt === null) this.startedAt = performance.now();
    // Convert canvas pixels into world units, accounting for worldScale.
    const wx = canvasX / this.worldScale + this.camera.x;
    const wy = canvasY / this.worldScale + this.camera.y;
    const hit = applyClickDamage(this.level.enemies, wx, wy, 1);
    if (hit) {
      sfx.hit();
      this.player.attackT = 15;
      this.player.facing = wx > this.player.x + this.player.w / 2 ? 1 : -1;
      if (hit.hp === 0) sfx.defeat();
    }
  }

  /** Wall-clock ms elapsed since first input. 0 until the player moves. Frozen on win. */
  elapsedMs(): number {
    if (this.startedAt === null) return 0;
    const end = this.completedAt ?? performance.now();
    return Math.max(0, end - this.startedAt);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  /** Re-read settings (e.g. user changed zoom). Triggers a resize to recompute worldScale. */
  refresh(): void {
    this.resize();
  }

  /** Re-read the currently-selected character from state and swap the in-game face +
   *  characterId + livesLeft. Used when the user switches mid-run via the settings panel.
   *  The player's position/velocity/run progress is preserved. */
  refreshCharacter(): void {
    const selected = getSelectedCharacter();
    if (!selected || selected.id === this.characterId) return;
    this.characterId = selected.id;
    this.livesLeft = selected.livesLeft ?? 3;
    if (selected.faceImage) {
      loadImage(selected.faceImage)
        .then((img) => (this.faceImg = img))
        .catch(() => (this.faceImg = null));
    } else {
      this.faceImg = null;
    }
  }

  /** Begin the death animation. After 60 frames, handleLifeLost resolves it. */
  private startDying(): void {
    if (this.dyingT > 0) return;
    this.dyingT = 1;
    sfx.defeat();
  }

  /** Apply the consequences of a death: decrement lives in storage. If the character is
   *  out of lives, delete it and notify; otherwise, respawn at the level start. */
  private handleLifeLost(): void {
    this.dyingT = 0;
    const remaining = loseLife(this.characterId);
    this.livesLeft = remaining;
    if (remaining <= 0) {
      // Character is gone forever.
      deleteCharacter(this.characterId);
      this.callbacks.onCharacterLost?.();
      return;
    }
    // Respawn at start with full HP and a brief invincibility window.
    this.player.x = this.level.playerStart.x;
    this.player.y = this.level.playerStart.y;
    this.player.prevY = this.player.y;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.hurtT = 60;
    this.hp = this.maxHp;
    this.snapCameraToPlayer();
  }

  /** Freeze the simulation. The render loop continues so the frozen frame stays visible. */
  pause(): void {
    if (this.paused) return;
    this.paused = true;
    // Freeze the timer too — record the pause point so resuming restarts it cleanly.
    if (this.startedAt !== null && this.completedAt === null) {
      this.pausedAt = performance.now();
    }
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    if (this.pausedAt !== null && this.startedAt !== null) {
      // Shift startedAt forward by however long we were paused so elapsedMs is unaffected.
      this.startedAt += performance.now() - this.pausedAt;
    }
    this.pausedAt = null;
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.input.destroy();
    window.removeEventListener('resize', this.resize);
    stopAmbient();
  }

  private tick = (now: number): void => {
    if (!this.running) return;
    const dt = Math.min(48, now - this.last);
    this.last = now;
    this.acc += dt;
    while (this.acc >= this.STEP) {
      this.update();
      this.acc -= this.STEP;
    }
    this.draw();
    this.rafId = requestAnimationFrame(this.tick);
  };

  private update(): void {
    if (this.paused) return;
    this.input.beginFrame();
    if (this.won) {
      this.winT++;
      if (this.winT === 24) this.callbacks.onWin(this.elapsedMs());
      return;
    }
    // Death animation freezes input and physics until it resolves into either a
    // respawn or a character deletion.
    if (this.dyingT > 0) {
      this.dyingT++;
      if (this.dyingT === 60) this.handleLifeLost();
      return;
    }
    // Start the timer on the first frame the player moves or jumps.
    if (
      this.startedAt === null &&
      (this.input.state.left || this.input.state.right || this.input.state.jump || this.input.state.down)
    ) {
      this.startedAt = performance.now();
    }
    stepPlayer(this.player, this.input.state, this.level.platforms, this.level.enemies, this.level.width);
    stepEnemies(this.level.enemies);

    // Schedule new seagull poops on a per-bird timer; spawn directly into level.hazards.
    const now = performance.now();
    for (const e of this.level.enemies) {
      if (e.variant !== 'seagull' || e.defeatT > 0) continue;
      if (e.nextActionAt === undefined) {
        // First scheduling: stagger initial drops so they don't all fire at once.
        e.nextActionAt = now + 1500 + Math.random() * 2500;
        continue;
      }
      if (now >= e.nextActionAt) {
        this.level.hazards.push({
          x: e.x + e.w / 2 - 6,
          y: e.y + e.h - 4,
          w: 12,
          h: 12,
          variant: 'poop',
          vy: 1,
        });
        e.nextActionAt = now + 1800 + Math.random() * 2400;
      }
    }

    stepHazards(this.level.hazards, this.level.height - 32);
    // Sweep dead hazards (poop that hit the floor).
    if (this.level.hazards.some((h) => h.dead)) {
      this.level.hazards = this.level.hazards.filter((h) => !h.dead);
    }
    const bounced = applyHazardBounce(this.player, this.level.hazards);
    if (bounced) {
      if (bounced.variant === 'car') sfx.honk();
      else sfx.ouch();
      if (getSettings().deathMode) {
        this.hp = Math.max(0, this.hp - 1);
        if (this.hp === 0) this.startDying();
      }
    }
    respawnIfFell(this.player, this.level.platforms, this.level.height);
    if (reachedGoal(this.player, this.level.goal.x, this.level.goal.y)) {
      this.won = true;
      this.winT = 0;
      this.completedAt = performance.now();
      sfx.win();
      stopAmbient();
    }
    this.updateCamera();
  }

  private updateCamera(): void {
    const px = this.player.x + this.player.w / 2;
    const py = this.player.y + this.player.h / 2;
    const { w: vw, h: vh } = this.viewWorld();
    // X look-ahead based on facing — shows more of what's in front of the player.
    // Especially helps horizontal levels (beach, car) where direction-of-travel matters.
    const lookAheadX = this.player.facing * 100;
    const targetX = px + lookAheadX - vw / 2;
    // Y bias: zero for horizontal levels (scrollDir=0), otherwise look in scroll direction.
    const lookAheadY = this.level.scrollDir * -80;
    const targetY = py + lookAheadY - vh / 2;

    // Smooth follow toward the clamped target so the camera never overshoots into empty world.
    const clampedTargetX = this.clampCameraX(targetX);
    const clampedTargetY = this.clampCameraY(targetY);
    this.camera.x += (clampedTargetX - this.camera.x) * 0.12;
    this.camera.y += (clampedTargetY - this.camera.y) * 0.18;
  }

  private draw(): void {
    const { ctx } = this;
    const { w, h } = this.viewport;

    // Background scene
    const sceneOpts = { width: w, height: h, scrollY: this.camera.y, scrollX: this.camera.x };
    switch (this.level.map) {
      case 'mountain':
        paintMountainScene(ctx, { ...sceneOpts, seed: 7 });
        break;
      case 'cave':
        paintCaveScene(ctx, { ...sceneOpts, seed: 21 });
        break;
      case 'beach':
        paintBeachScene(ctx, { ...sceneOpts, seed: 42 });
        break;
      case 'car':
        paintCarScene(ctx, { ...sceneOpts, seed: 17 });
        break;
    }

    // World transform — scale up on bigger screens, then offset by the camera.
    // Order: scale first, then translate in WORLD units.
    ctx.save();
    ctx.scale(this.worldScale, this.worldScale);
    ctx.translate(-this.camera.x, -this.camera.y);

    // Platforms
    for (const p of this.level.platforms) {
      paintRockPlatform(ctx, p.x, p.y, p.w, p.h, this.level.map);
    }

    const t = performance.now();

    // Hazards (under enemies, over platforms — they're floor-level)
    for (const hz of this.level.hazards) {
      switch (hz.variant) {
        case 'hot-sand':
          paintHotSand(ctx, hz.x, hz.y, hz.w, hz.h, t);
          break;
        case 'car':
          paintCar(ctx, hz.x, hz.y, hz.w, hz.h, hz.dir ?? 1, hz.colorIndex ?? 0, t);
          break;
        case 'poop':
          paintPoop(ctx, hz.x, hz.y, hz.w, hz.h);
          break;
      }
    }

    // Goal — particles emanate first (so the goal sprite paints over the source point cleanly).
    paintGoalParticles(ctx, this.level.goal.x, this.level.goal.y, this.level.map, t);
    switch (this.level.map) {
      case 'mountain':
        paintFlag(ctx, this.level.goal.x, this.level.goal.y, t);
        break;
      case 'cave':
        paintCrystal(ctx, this.level.goal.x, this.level.goal.y, t);
        break;
      case 'beach':
        paintSharkTooth(ctx, this.level.goal.x, this.level.goal.y, t);
        break;
      case 'car':
        paintHouse(ctx, this.level.goal.x, this.level.goal.y, t);
        break;
    }

    // Enemies
    for (const e of this.level.enemies) {
      drawEnemy(ctx, e, t);
    }

    // Player
    drawPlayer(ctx, this.player, {
      faceImage: this.faceImg,
      variant: this.level.map,
      hurtT: this.player.hurtT,
    });

    ctx.restore();

    // Progress bar (screen-space, on top of the world)
    this.drawProgressBar();

    // Death-mode HUD: hearts + lives count, top-center.
    if (getSettings().deathMode) this.drawDeathModeHud();

    // Death animation overlay — red wash that ramps up while dying.
    if (this.dyingT > 0) {
      const k = Math.min(1, this.dyingT / 60);
      ctx.fillStyle = `rgba(199, 93, 93, ${k * 0.55})`;
      ctx.fillRect(0, 0, w, h);
      // "Ouch!" label
      ctx.fillStyle = '#FFFEF8';
      ctx.font = `bold ${Math.floor(48 * (0.6 + k * 0.6))}px Fredoka, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 12;
      const livesAfter = Math.max(0, this.livesLeft - 1);
      const msg = livesAfter === 0 ? 'gone… make a new hero' : `ouch! ${livesAfter} ${livesAfter === 1 ? 'life' : 'lives'} left`;
      ctx.fillText(msg, w / 2, h / 2);
      ctx.shadowBlur = 0;
    }

    // Win overlay (fade to white)
    if (this.won) {
      const k = Math.min(1, this.winT / 24);
      ctx.fillStyle = `rgba(255,254,248,${k})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  /** Hearts (current HP) + lives count, top-center. Only called when deathMode is on. */
  private drawDeathModeHud(): void {
    const { ctx } = this;
    const { w } = this.viewport;
    const cx = w / 2;
    const baseY = 26;
    ctx.save();
    // Hearts row
    const heartW = 22;
    const heartGap = 4;
    const totalW = this.maxHp * heartW + (this.maxHp - 1) * heartGap;
    const startX = cx - totalW / 2;
    for (let i = 0; i < this.maxHp; i++) {
      const x = startX + i * (heartW + heartGap) + heartW / 2;
      const filled = i < this.hp;
      drawHeart(ctx, x, baseY + 8, 9, filled);
    }
    // Lives below — small "Lives × N"
    ctx.font = '600 13px Fredoka, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(42, 31, 26, 0.85)';
    const label = `Lives × ${this.livesLeft}`;
    // soft white background pill
    const lbW = ctx.measureText(label).width + 18;
    ctx.fillStyle = 'rgba(255, 254, 248, 0.85)';
    roundedRect(ctx, cx - lbW / 2, baseY + 22, lbW, 18, 9);
    ctx.fill();
    ctx.fillStyle = 'rgba(42, 31, 26, 0.9)';
    ctx.fillText(label, cx, baseY + 24);
    ctx.restore();
  }

  /** Vertical "how close to the goal" bar pinned to the right side of the viewport.
   *  Mountain fills bottom-up (climbing). Cave fills top-down (descending). */
  private drawProgressBar(): void {
    const { ctx } = this;
    const { w, h } = this.viewport;
    const barX = w - 32;
    const topMargin = 110; // leave room for the HUD chip / mute / pause
    // On touch devices the on-screen Left/Right/Down/Jump cluster eats the bottom
    // ~100px. Push the progress-bar bottom up enough that the time + percentage
    // labels never sit behind those buttons.
    const bottomMargin = this.isTouch ? 170 : 90;
    const barY = topMargin;
    const barW = 14;
    const barH = Math.max(120, h - topMargin - bottomMargin);
    const radius = barW / 2;

    // Track
    ctx.save();
    ctx.fillStyle = 'rgba(255, 254, 248, 0.65)';
    ctx.strokeStyle = 'rgba(42,31,26,0.18)';
    ctx.lineWidth = 1;
    roundedRect(ctx, barX, barY, barW, barH, radius);
    ctx.fill();
    ctx.stroke();

    // Progress 0..1 toward the goal — uses progressAxis (defaults to 'y' for legacy levels).
    const axis = this.level.progressAxis ?? 'y';
    const startV = axis === 'x' ? this.level.playerStart.x : this.level.playerStart.y;
    const goalV = axis === 'x' ? this.level.goal.x : this.level.goal.y;
    const curV = axis === 'x' ? this.player.x : this.player.y;
    const denom = goalV - startV;
    const raw = denom === 0 ? 1 : (curV - startV) / denom;
    const progress = Math.max(0, Math.min(1, raw));

    // For descending levels (cave), the bar fills TOP→DOWN — visually mirroring the
    // player digging deeper. Everything else fills bottom→up.
    const fillsDown = this.level.scrollDir > 0;
    const fillColor = goalColor(this.level.map);
    const fillH = barH * progress;
    if (fillH > 0.5) {
      ctx.fillStyle = fillColor;
      const fillY = fillsDown ? barY : barY + barH - fillH;
      roundedRect(ctx, barX, fillY, barW, fillH, radius);
      ctx.fill();
    }

    // Goal cap — at the END the player is heading toward.
    const goalCx = barX + barW / 2;
    const goalCy = fillsDown ? barY + barH : barY;
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.arc(goalCx, goalCy, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFEF8';
    ctx.font = 'bold 11px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(goalEmoji(this.level.map), goalCx, goalCy);

    // "you are here" marker — at the leading edge of the fill.
    const youCy = fillsDown ? barY + fillH : barY + barH - fillH;
    ctx.fillStyle = '#FFFEF8';
    ctx.strokeStyle = fillColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(goalCx, youCy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Percentage label below the bar (screen reader friendly via label below)
    ctx.fillStyle = 'rgba(42, 31, 26, 0.78)';
    ctx.font = '600 12px Fredoka, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${Math.round(progress * 100)}%`, goalCx, barY + barH + 8);

    // Live time, only after the player moves.
    if (this.startedAt !== null) {
      ctx.fillStyle = 'rgba(42, 31, 26, 0.55)';
      ctx.font = '500 11px Fredoka, system-ui, sans-serif';
      ctx.fillText(formatTime(this.elapsedMs()), goalCx, barY + barH + 24);
    }

    ctx.restore();
  }
}

function drawHeart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  filled: boolean,
): void {
  const r = size * 0.55;
  ctx.save();
  ctx.fillStyle = filled ? '#C75D5D' : 'rgba(199, 93, 93, 0.18)';
  ctx.strokeStyle = '#C75D5D';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x - r * 0.55, y - r * 0.2, r, 0, Math.PI * 2);
  ctx.arc(x + r * 0.55, y - r * 0.2, r, 0, Math.PI * 2);
  ctx.moveTo(x - r * 1.2, y);
  ctx.lineTo(x, y + r * 1.5);
  ctx.lineTo(x + r * 1.2, y);
  ctx.closePath();
  ctx.fill();
  if (!filled) ctx.stroke();
  ctx.restore();
}

function goalColor(map: string): string {
  switch (map) {
    case 'mountain': return '#F4A56C';
    case 'cave': return '#6FB5A8';
    case 'beach': return '#5BA8B8';
    case 'car': return '#C75D5D';
    default: return '#F4A56C';
  }
}

function goalEmoji(map: string): string {
  switch (map) {
    case 'mountain': return '🚩';
    case 'cave': return '💎';
    case 'beach': return '🦈';
    case 'car': return '🏠';
    default: return '★';
  }
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}
