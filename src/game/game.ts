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
import { applyClickDamage, makePlayer, reachedGoal, respawnIfFell, stepEnemies, stepPlayer } from './physics.js';
import { drawPlayer } from './player.js';
import { drawEnemy } from './enemy.js';
import {
  paintCaveScene,
  paintCrystal,
  paintFlag,
  paintMountainScene,
  paintRockPlatform,
} from './render.js';
import type { LevelData, PlayerState } from './types.js';
import { sfx, stopAmbient } from '../audio/sounds.js';
import { loadImage } from '../util/face.js';

export interface GameOpts {
  level: LevelData;
  /** Cropped face data URL or null. */
  faceImage: string | null;
  characterName: string;
}

export interface GameCallbacks {
  onWin(): void;
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

  private running = false;
  private rafId = 0;
  private acc = 0;
  private last = 0;
  private readonly STEP = 1000 / 60;

  private won = false;
  private winT = 0;

  constructor(canvas: HTMLCanvasElement, opts: GameOpts, callbacks: GameCallbacks) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2d context');
    this.ctx = ctx;
    this.level = opts.level;
    this.player = makePlayer(opts.level.playerStart.x, opts.level.playerStart.y);
    this.callbacks = callbacks;

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

  private snapCameraToPlayer(): void {
    const px = this.player.x + this.player.w / 2;
    const py = this.player.y + this.player.h / 2;
    const lookAhead = this.level.scrollDir === -1 ? -80 : 80;
    this.camera.x = Math.max(
      0,
      Math.min(this.level.width - this.viewport.w, px - this.viewport.w / 2),
    );
    this.camera.y = Math.max(
      -200,
      Math.min(this.level.height - this.viewport.h + 100, py + lookAhead - this.viewport.h / 2),
    );
  }

  bindTouchButton(button: HTMLElement, key: 'left' | 'right' | 'jump' | 'down'): void {
    this.input.bindButton(button, key);
  }

  private resize = (): void => {
    this.dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.viewport = { w, h };
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
    const wx = canvasX + this.camera.x;
    const wy = canvasY + this.camera.y;
    const hit = applyClickDamage(this.level.enemies, wx, wy, 1);
    if (hit) {
      sfx.hit();
      this.player.attackT = 15;
      this.player.facing = wx > this.player.x + this.player.w / 2 ? 1 : -1;
      if (hit.hp === 0) sfx.defeat();
    }
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
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
    this.input.beginFrame();
    if (this.won) {
      this.winT++;
      if (this.winT === 24) this.callbacks.onWin();
      return;
    }
    stepPlayer(this.player, this.input.state, this.level.platforms, this.level.enemies, this.level.width);
    stepEnemies(this.level.enemies);
    respawnIfFell(this.player, this.level.platforms, this.level.height);
    if (reachedGoal(this.player, this.level.goal.x, this.level.goal.y)) {
      this.won = true;
      this.winT = 0;
      sfx.win();
      stopAmbient();
    }
    this.updateCamera();
  }

  private updateCamera(): void {
    const px = this.player.x + this.player.w / 2;
    const py = this.player.y + this.player.h / 2;
    // Center on player horizontally, clamped to world bounds.
    const targetX = px - this.viewport.w / 2;
    // Y bias: small look-ahead in the scroll direction (mountain looks up, cave looks down)
    const lookAhead = this.level.scrollDir === -1 ? -80 : 80;
    const targetY = py + lookAhead - this.viewport.h / 2;

    // Smooth follow
    this.camera.x += (targetX - this.camera.x) * 0.18;
    this.camera.y += (targetY - this.camera.y) * 0.18;

    // Clamp to world
    const maxX = Math.max(0, this.level.width - this.viewport.w);
    this.camera.x = Math.max(0, Math.min(maxX, this.camera.x));
    const maxY = Math.max(-200, this.level.height - this.viewport.h + 100);
    this.camera.y = Math.max(-200, Math.min(maxY, this.camera.y));
  }

  private draw(): void {
    const { ctx } = this;
    const { w, h } = this.viewport;

    // Background scene (parallax handled inside paint*Scene via scrollY)
    if (this.level.map === 'mountain') {
      paintMountainScene(ctx, { width: w, height: h, scrollY: this.camera.y, seed: 7 });
    } else {
      paintCaveScene(ctx, { width: w, height: h, scrollY: this.camera.y, seed: 21 });
    }

    // World transform
    ctx.save();
    ctx.translate(-this.camera.x, -this.camera.y);

    // Platforms
    for (const p of this.level.platforms) {
      paintRockPlatform(ctx, p.x, p.y, p.w, p.h, this.level.map);
    }

    // Goal
    const t = performance.now();
    if (this.level.map === 'mountain') {
      paintFlag(ctx, this.level.goal.x, this.level.goal.y, t);
    } else {
      paintCrystal(ctx, this.level.goal.x, this.level.goal.y, t);
    }

    // Enemies
    for (const e of this.level.enemies) {
      drawEnemy(ctx, e, t);
    }

    // Player
    drawPlayer(ctx, this.player, {
      faceImage: this.faceImg,
      variant: this.level.map,
    });

    ctx.restore();

    // Progress bar (screen-space, on top of the world)
    this.drawProgressBar();

    // Win overlay (fade to white)
    if (this.won) {
      const k = Math.min(1, this.winT / 24);
      ctx.fillStyle = `rgba(255,254,248,${k})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  /** Vertical "how close to the goal" bar pinned to the right side of the viewport.
   *  Mountain fills bottom-up (climbing). Cave fills top-down (descending). */
  private drawProgressBar(): void {
    const { ctx } = this;
    const { w, h } = this.viewport;
    const barX = w - 32;
    const topMargin = 110; // leave room for the HUD chip / mute / pause
    const bottomMargin = 90; // leave room for touch controls / banner
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

    // Progress 0..1 toward the goal
    const startY = this.level.playerStart.y;
    const goalY = this.level.goal.y;
    const playerY = this.player.y;
    const denom = goalY - startY;
    const raw = denom === 0 ? 1 : (playerY - startY) / denom;
    const progress = Math.max(0, Math.min(1, raw));

    // Fill — direction-aware
    const fillColor = this.level.scrollDir === -1 ? '#F4A56C' : '#6FB5A8';
    const fillH = barH * progress;
    if (fillH > 0.5) {
      ctx.fillStyle = fillColor;
      if (this.level.scrollDir === -1) {
        // Mountain: fill from the bottom up
        roundedRect(ctx, barX, barY + barH - fillH, barW, fillH, radius);
      } else {
        // Cave: fill from the top down
        roundedRect(ctx, barX, barY, barW, fillH, radius);
      }
      ctx.fill();
    }

    // Goal cap — circle at the goal end of the bar
    const goalCx = barX + barW / 2;
    const goalCy = this.level.scrollDir === -1 ? barY : barY + barH;
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.arc(goalCx, goalCy, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFEF8';
    ctx.font = 'bold 11px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.level.scrollDir === -1 ? '🚩' : '💎', goalCx, goalCy);

    // "you are here" marker
    const youCy = this.level.scrollDir === -1 ? barY + barH - fillH : barY + fillH;
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

    ctx.restore();
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
