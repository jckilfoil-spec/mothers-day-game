/**
 * Painted-feel canvas helpers.
 *
 * Two main scene painters: paintMountainScene (warm sunrise + airy peaks)
 * and paintCaveScene (warm-dark earth tones + glowing crystal). Both are
 * deterministic given a seed and accept a parallax offset so they can be
 * reused for backgrounds, map-select previews, and parallax mid-game.
 */

import { rng } from './rng.js';

export interface SceneOpts {
  width: number;
  height: number;
  /** Vertical scroll offset in world pixels. 0 = bottom of map at viewport bottom. */
  scrollY?: number;
  /** Horizontal sway offset for menu screens. */
  scrollX?: number;
  seed?: number;
}

const C = {
  mtnSkyTop: '#B8D8E8',
  mtnSkyHorizon: '#FBEFD9',
  mtnSunset: '#F4A56C',
  mtnFar: '#8B7AA8',
  mtnNear: '#6B8CAE',
  mtnSnow: '#FAFAFA',
  mtnRock: '#7D7068',
  caveDeep: '#2A1F1A',
  caveWall: '#5C3A28',
  caveStalactite: '#8B5E3C',
  caveCrystal: '#6FB5A8',
  caveCrystalHi: '#A8E6DC',
  caveTorch: '#FFB870',
  caveMoss: '#4A6B3A',
};

/** Soft-edged blob — the watercolor primitive. */
function softBlob(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  fill: string,
  alpha = 1,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Sky gradient + sun glow.
 */
function paintMountainSky(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, C.mtnSkyTop);
  g.addColorStop(0.7, C.mtnSkyHorizon);
  g.addColorStop(1, '#F8E1B5');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Sun glow: soft radial cream behind the peaks
  const sunX = w * 0.7;
  const sunY = h * 0.55;
  const sunR = Math.min(w, h) * 0.35;
  const rg = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR);
  rg.addColorStop(0, 'rgba(244,165,108,0.55)');
  rg.addColorStop(0.4, 'rgba(244,165,108,0.18)');
  rg.addColorStop(1, 'rgba(244,165,108,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, w, h);
}

function paintMountainPeaks(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  baseY: number,
  color: string,
  amplitude: number,
  segments: number,
  seed: number,
  alpha = 1,
): void {
  const r = rng(seed);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, baseY);
  for (let i = 0; i <= segments; i++) {
    const x = (i / segments) * w;
    const y = baseY - amplitude * (0.4 + r() * 0.6) * Math.sin(i * 0.85 + seed);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, baseY);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Tiny wisps of cloud. */
function paintClouds(ctx: CanvasRenderingContext2D, w: number, h: number, scrollX = 0, seed = 11): void {
  const r = rng(seed);
  const count = 5;
  for (let i = 0; i < count; i++) {
    const baseX = ((r() * w + scrollX * (0.05 + i * 0.02)) % (w + 200)) - 100;
    const y = h * (0.12 + r() * 0.25);
    const len = 60 + r() * 100;
    const ht = 12 + r() * 8;
    softBlob(ctx, baseX, y, len, ht, '#FFFFFF', 0.55);
    softBlob(ctx, baseX - len * 0.3, y + ht * 0.4, len * 0.7, ht * 0.7, '#FFFFFF', 0.4);
  }
}

export function paintMountainScene(ctx: CanvasRenderingContext2D, opts: SceneOpts): void {
  const { width: w, height: h } = opts;
  const scrollY = opts.scrollY ?? 0;
  const scrollX = opts.scrollX ?? 0;
  const seed = opts.seed ?? 7;

  paintMountainSky(ctx, w, h);
  paintClouds(ctx, w, h, scrollX, seed);
  // Far peaks (slowest parallax)
  paintMountainPeaks(ctx, w, h, h * 0.7 - scrollY * 0.05, C.mtnFar, 80, 12, seed + 1, 0.55);
  // Mid peaks
  paintMountainPeaks(ctx, w, h, h * 0.78 - scrollY * 0.12, C.mtnNear, 110, 10, seed + 2, 0.78);
  // Snow caps for mid peaks (lighter overlay)
  paintMountainPeaks(ctx, w, h, h * 0.79 - scrollY * 0.12, C.mtnSnow, 90, 10, seed + 2, 0.18);
  // Near peaks
  paintMountainPeaks(ctx, w, h, h * 0.92 - scrollY * 0.22, '#5A6F87', 130, 8, seed + 3, 0.92);
}

export function paintCaveScene(ctx: CanvasRenderingContext2D, opts: SceneOpts): void {
  const { width: w, height: h } = opts;
  const scrollY = opts.scrollY ?? 0;
  const seed = opts.seed ?? 21;
  const r = rng(seed);

  // Deep gradient — warm dark to slightly less dark
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#1A120E');
  g.addColorStop(0.5, C.caveDeep);
  g.addColorStop(1, '#3A2820');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Cave wall — large soft brown shapes on the sides (parallax slow)
  for (let i = 0; i < 6; i++) {
    const side = i % 2 === 0 ? 'left' : 'right';
    const x = side === 'left' ? r() * w * 0.25 : w - r() * w * 0.25;
    const y = ((r() * h + scrollY * 0.08) % (h + 200)) - 50;
    const rad = 80 + r() * 120;
    softBlob(ctx, x, y, rad, rad * 0.9, C.caveWall, 0.6);
  }

  // Stalactites from top (stronger parallax)
  for (let i = 0; i < 10; i++) {
    const x = (i + 0.5) * (w / 10) + (r() - 0.5) * 40;
    const yTop = -10 - scrollY * 0.18;
    const length = 50 + r() * 90;
    drawStalactite(ctx, x, yTop, length, 18 + r() * 10);
  }

  // Glow from torches dotted along the walls (small, warm)
  for (let i = 0; i < 4; i++) {
    const x = i % 2 === 0 ? 40 + r() * 30 : w - 40 - r() * 30;
    const y = (i * h * 0.3 + r() * 50 + scrollY * 0.3) % (h + 200);
    const rg = ctx.createRadialGradient(x, y, 0, x, y, 100);
    rg.addColorStop(0, 'rgba(255,184,112,0.55)');
    rg.addColorStop(0.5, 'rgba(255,184,112,0.18)');
    rg.addColorStop(1, 'rgba(255,184,112,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(x, y, 100, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawStalactite(
  ctx: CanvasRenderingContext2D,
  x: number,
  yTop: number,
  length: number,
  width: number,
): void {
  ctx.save();
  const g = ctx.createLinearGradient(0, yTop, 0, yTop + length);
  g.addColorStop(0, '#5C3A28');
  g.addColorStop(0.6, C.caveStalactite);
  g.addColorStop(1, '#3F2A1E');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - width / 2, yTop);
  ctx.lineTo(x + width / 2, yTop);
  ctx.lineTo(x, yTop + length);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** A rock platform sprite. The actual collision rect is provided by the level; this just paints. */
export function paintRockPlatform(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  variant: 'mountain' | 'cave',
): void {
  ctx.save();
  const top = variant === 'mountain' ? C.mtnSnow : C.caveStalactite;
  const body = variant === 'mountain' ? C.mtnRock : '#3F2A1E';
  const shadow = variant === 'mountain' ? '#5A4F47' : '#1F140E';

  // Body — rounded irregular blob
  ctx.fillStyle = body;
  roundedBlob(ctx, x, y, w, h, 10);
  ctx.fill();

  // Top highlight (snow cap or moss)
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.moveTo(x + 4, y + 4);
  ctx.lineTo(x + w - 4, y + 4);
  ctx.quadraticCurveTo(x + w - 1, y + 8, x + w - 6, y + 14);
  ctx.lineTo(x + 6, y + 14);
  ctx.quadraticCurveTo(x + 1, y + 8, x + 4, y + 4);
  ctx.closePath();
  ctx.fill();

  // Bottom shadow blob
  ctx.fillStyle = shadow;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h - 2, w / 2 - 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function roundedBlob(
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

/** Goal flag (mountain). */
export function paintFlag(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  ctx.save();
  // pole
  ctx.strokeStyle = '#5C3A28';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 64);
  ctx.stroke();
  // pennant (waving)
  const wave = Math.sin(t * 0.005) * 4;
  ctx.fillStyle = C.mtnSunset;
  ctx.beginPath();
  ctx.moveTo(x + 2, y - 60);
  ctx.lineTo(x + 38 + wave, y - 50);
  ctx.lineTo(x + 2, y - 40);
  ctx.closePath();
  ctx.fill();
  // little cream stripe
  ctx.fillStyle = C.mtnSkyHorizon;
  ctx.beginPath();
  ctx.moveTo(x + 4, y - 56);
  ctx.lineTo(x + 24 + wave * 0.7, y - 50);
  ctx.lineTo(x + 4, y - 44);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Goal crystal (cave). */
export function paintCrystal(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  ctx.save();
  const pulse = 0.85 + 0.15 * Math.sin(t * 0.003);
  // Outer glow
  const rg = ctx.createRadialGradient(x, y, 0, x, y, 70 * pulse);
  rg.addColorStop(0, 'rgba(168,230,220,0.55)');
  rg.addColorStop(0.5, 'rgba(111,181,168,0.25)');
  rg.addColorStop(1, 'rgba(111,181,168,0)');
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(x, y, 70 * pulse, 0, Math.PI * 2);
  ctx.fill();

  // Crystal facets
  ctx.fillStyle = C.caveCrystal;
  ctx.beginPath();
  ctx.moveTo(x, y - 28);
  ctx.lineTo(x + 18, y);
  ctx.lineTo(x + 8, y + 22);
  ctx.lineTo(x - 8, y + 22);
  ctx.lineTo(x - 18, y);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = C.caveCrystalHi;
  ctx.beginPath();
  ctx.moveTo(x, y - 28);
  ctx.lineTo(x - 18, y);
  ctx.lineTo(x - 4, y);
  ctx.closePath();
  ctx.fill();

  // Sparkle
  ctx.fillStyle = '#FFFFFF';
  ctx.globalAlpha = 0.8 * pulse;
  ctx.fillRect(x - 6, y - 14, 2, 6);
  ctx.fillRect(x - 8, y - 12, 6, 2);
  ctx.restore();
}
