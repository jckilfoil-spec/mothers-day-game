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

/** A rock/sand/road platform sprite. The actual collision rect is provided by the level. */
export function paintRockPlatform(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  variant: 'mountain' | 'cave' | 'beach' | 'car',
): void {
  // Wide horizontal floors (beach sand, road) get bespoke painters.
  if (variant === 'beach' && w > 400) {
    paintBeachFloor(ctx, x, y, w, h);
    return;
  }
  if (variant === 'car' && w > 400) {
    paintRoadFloor(ctx, x, y, w, h);
    return;
  }

  ctx.save();
  const top =
    variant === 'mountain' ? C.mtnSnow
    : variant === 'cave' ? C.caveStalactite
    : variant === 'beach' ? '#F2D8A8'
    : /* car (curb / mailbox) */ '#A6A6A6';
  const body =
    variant === 'mountain' ? C.mtnRock
    : variant === 'cave' ? '#3F2A1E'
    : variant === 'beach' ? '#8B5E3C' /* driftwood */
    : /* car */ '#5C5C5C';
  const shadow =
    variant === 'mountain' ? '#5A4F47'
    : variant === 'cave' ? '#1F140E'
    : variant === 'beach' ? '#5C3A28'
    : '#3A3A3A';

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

function paintBeachFloor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.save();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#F2D8A8');
  g.addColorStop(0.5, '#E8C788');
  g.addColorStop(1, '#C9A56A');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  // Specks of sand
  ctx.fillStyle = 'rgba(92, 58, 40, 0.25)';
  const seed = (x + y) | 0;
  const r = rng(seed);
  for (let i = 0; i < Math.floor(w / 18); i++) {
    const px = x + r() * w;
    const py = y + 4 + r() * (h - 6);
    ctx.fillRect(px, py, 2, 2);
  }
  ctx.restore();
}

function paintRoadFloor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.save();
  // Asphalt
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#3D3D3D');
  g.addColorStop(1, '#2A2A2A');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  // Center lane dashes
  ctx.fillStyle = '#FBC34A';
  const dashW = 30;
  const gap = 22;
  for (let dx = 12; dx < w; dx += dashW + gap) {
    ctx.fillRect(x + dx, y + h / 2 - 2, dashW, 4);
  }
  // Curb highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fillRect(x, y, w, 2);
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

/** Beach scene — horizontal sky + ocean + sun + distant palms. */
export function paintBeachScene(ctx: CanvasRenderingContext2D, opts: SceneOpts): void {
  const { width: w, height: h } = opts;
  const seed = opts.seed ?? 42;
  const scrollX = opts.scrollX ?? 0;

  // Sky
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#A8DFEB');
  g.addColorStop(0.55, '#FBEFD9');
  g.addColorStop(1, '#FFE0B5');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Sun
  const sunX = w * 0.78;
  const sunY = h * 0.22;
  const sunR = Math.min(w, h) * 0.16;
  const rg = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR);
  rg.addColorStop(0, 'rgba(255, 220, 120, 0.95)');
  rg.addColorStop(0.5, 'rgba(255, 184, 112, 0.4)');
  rg.addColorStop(1, 'rgba(255, 184, 112, 0)');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, w, h);

  // Ocean band — shimmery teal
  const oceanY = h * 0.62;
  const oceanH = h * 0.18;
  const og = ctx.createLinearGradient(0, oceanY, 0, oceanY + oceanH);
  og.addColorStop(0, '#5BA8B8');
  og.addColorStop(1, '#2E6878');
  ctx.fillStyle = og;
  ctx.fillRect(0, oceanY, w, oceanH);
  // Foam highlights
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  const r = rng(seed);
  for (let i = 0; i < 14; i++) {
    const fx = (r() * w * 1.5 + scrollX * 0.05) % w;
    const fy = oceanY + r() * oceanH * 0.85;
    ctx.fillRect(fx, fy, 22, 1.5);
  }

  // Palm silhouettes (parallax slow)
  for (let i = 0; i < 4; i++) {
    const px = (i * w * 0.35 + 60 + scrollX * 0.2) % (w + 200) - 100;
    const py = h * 0.62;
    paintPalm(ctx, px, py, 0.6 + i * 0.08);
  }
}

function paintPalm(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  // Trunk
  ctx.strokeStyle = '#5C3A28';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-6, -50, 4, -110);
  ctx.stroke();
  // Fronds
  ctx.fillStyle = '#4A6B3A';
  for (let a = -0.6; a <= 0.6; a += 0.3) {
    ctx.save();
    ctx.translate(4, -110);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.ellipse(0, -16, 50, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/** Car/road scene — sky + distant suburb + cloud + power lines. */
export function paintCarScene(ctx: CanvasRenderingContext2D, opts: SceneOpts): void {
  const { width: w, height: h } = opts;
  const scrollX = opts.scrollX ?? 0;
  const seed = opts.seed ?? 17;
  const r = rng(seed);

  // Sky
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#B8D8E8');
  g.addColorStop(1, '#FBEFD9');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Soft clouds
  for (let i = 0; i < 5; i++) {
    const cx = (r() * w * 1.5 + scrollX * 0.06) % (w + 300) - 150;
    const cy = h * (0.12 + r() * 0.18);
    const cl = 50 + r() * 60;
    softBlob(ctx, cx, cy, cl, cl * 0.35, '#FFFFFF', 0.55);
  }

  // Distant suburban silhouette
  const skylineY = h * 0.7;
  ctx.fillStyle = '#7B8DAA';
  for (let i = 0; i < 12; i++) {
    const bx = i * (w / 8) - 40 + (scrollX * 0.15) % (w / 8);
    const bw = 50 + r() * 40;
    const bh = 50 + r() * 80;
    ctx.fillRect(bx, skylineY - bh, bw, bh);
    // Roof: triangle for some
    if (r() > 0.5) {
      ctx.beginPath();
      ctx.moveTo(bx - 6, skylineY - bh);
      ctx.lineTo(bx + bw / 2, skylineY - bh - 20);
      ctx.lineTo(bx + bw + 6, skylineY - bh);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Closer treeline
  ctx.fillStyle = '#4A6B3A';
  for (let i = 0; i < 10; i++) {
    const tx = (i * (w / 6) + scrollX * 0.3 + 80) % (w + 200) - 100;
    const ty = h * 0.85;
    ctx.beginPath();
    ctx.arc(tx, ty - 30, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5C3A28';
    ctx.fillRect(tx - 2, ty - 12, 4, 14);
    ctx.fillStyle = '#4A6B3A';
  }
}

/** Goal: shark's tooth on a small driftwood pedestal. */
export function paintSharkTooth(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  ctx.save();
  // Soft white glow halo around the tooth
  const pulse = 0.85 + 0.15 * Math.sin(t * 0.004);
  const rg = ctx.createRadialGradient(x, y - 28, 0, x, y - 28, 60 * pulse);
  rg.addColorStop(0, 'rgba(255, 255, 255, 0.65)');
  rg.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(x, y - 28, 60 * pulse, 0, Math.PI * 2);
  ctx.fill();

  // Driftwood pedestal
  ctx.fillStyle = '#8B5E3C';
  ctx.fillRect(x - 26, y, 52, 8);
  ctx.fillStyle = '#5C3A28';
  ctx.fillRect(x - 26, y + 6, 52, 2);

  // === Shark tooth ===
  // Real shark teeth: dark "root" at the base (twin lobes), curved enamel crown
  // tapering to a point with serrated edges. Slight asymmetric lean for character.

  // Root (broader brown base, two lobes)
  ctx.fillStyle = '#9E8568';
  ctx.beginPath();
  ctx.moveTo(x - 14, y - 4);
  ctx.quadraticCurveTo(x - 16, y - 16, x - 6, y - 16);
  ctx.lineTo(x + 6, y - 16);
  ctx.quadraticCurveTo(x + 16, y - 16, x + 14, y - 4);
  ctx.quadraticCurveTo(x + 4, y - 1, x, y - 6);
  ctx.quadraticCurveTo(x - 4, y - 1, x - 14, y - 4);
  ctx.closePath();
  ctx.fill();
  // Root shadow (darker right lobe)
  ctx.fillStyle = '#7C6A52';
  ctx.beginPath();
  ctx.moveTo(x + 2, y - 16);
  ctx.lineTo(x + 6, y - 16);
  ctx.quadraticCurveTo(x + 16, y - 16, x + 14, y - 4);
  ctx.quadraticCurveTo(x + 8, y - 2, x + 5, y - 6);
  ctx.closePath();
  ctx.fill();

  // Crown (white enamel, curved, leans slightly left at the tip)
  ctx.fillStyle = '#FFFEF8';
  ctx.beginPath();
  ctx.moveTo(x - 14, y - 14);
  // Left edge — gently curved up to the leaning tip
  ctx.bezierCurveTo(x - 18, y - 28, x - 8, y - 42, x - 2, y - 50);
  // Tip
  ctx.quadraticCurveTo(x + 1, y - 51, x + 3, y - 50);
  // Right edge — sharper curve back down
  ctx.bezierCurveTo(x + 12, y - 40, x + 16, y - 26, x + 14, y - 14);
  ctx.closePath();
  ctx.fill();

  // Inner shading (right side darker — light comes from upper-left)
  ctx.fillStyle = '#E0DACA';
  ctx.beginPath();
  ctx.moveTo(x + 14, y - 14);
  ctx.bezierCurveTo(x + 16, y - 26, x + 12, y - 40, x + 3, y - 50);
  ctx.lineTo(x + 1, y - 50);
  ctx.bezierCurveTo(x + 6, y - 38, x + 10, y - 24, x + 6, y - 14);
  ctx.closePath();
  ctx.fill();

  // Serrations — small notches on both edges, evenly spaced
  ctx.strokeStyle = '#C9C2AE';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const t = 0.18 + i * 0.16;
    // Left edge points (approximate quadratic of the bezier)
    const lx = x - 14 + (-4) * Math.sin(t * Math.PI) - t * 12;
    const ly = y - 14 - t * 36;
    ctx.moveTo(lx, ly);
    ctx.lineTo(lx + 2, ly + 1);
    // Right edge points
    const rx = x + 14 - (-2) * Math.sin(t * Math.PI) - t * 11;
    const ry = y - 14 - t * 36;
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx - 2, ry + 1);
  }
  ctx.stroke();

  // Sparkle shimmer near the tip
  ctx.fillStyle = '#FFFFFF';
  ctx.globalAlpha = 0.95 * pulse;
  ctx.beginPath();
  ctx.arc(x - 3, y - 38, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 3.5, y - 41, 1, 6);
  ctx.fillRect(x - 6, y - 38, 6, 1);

  ctx.restore();
}

/** Goal: little house with smiling family silhouettes inside. */
export function paintHouse(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  ctx.save();
  // Glow
  const pulse = 0.85 + 0.15 * Math.sin(t * 0.003);
  const rg = ctx.createRadialGradient(x, y - 30, 0, x, y - 30, 70 * pulse);
  rg.addColorStop(0, 'rgba(255, 184, 112, 0.5)');
  rg.addColorStop(1, 'rgba(255, 184, 112, 0)');
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(x, y - 30, 70 * pulse, 0, Math.PI * 2);
  ctx.fill();

  // Walls
  ctx.fillStyle = '#F4A56C';
  ctx.fillRect(x - 50, y - 56, 100, 60);
  // Trim
  ctx.fillStyle = '#FBEFD9';
  ctx.fillRect(x - 50, y, 100, 4);

  // Roof
  ctx.fillStyle = '#5C3A28';
  ctx.beginPath();
  ctx.moveTo(x - 60, y - 56);
  ctx.lineTo(x, y - 96);
  ctx.lineTo(x + 60, y - 56);
  ctx.closePath();
  ctx.fill();

  // Chimney
  ctx.fillStyle = '#7D7068';
  ctx.fillRect(x + 22, y - 92, 12, 22);
  // Smoke
  ctx.fillStyle = 'rgba(255, 254, 248, 0.7)';
  for (let i = 0; i < 3; i++) {
    const sy = y - 100 - i * 14 - (t * 0.02) % 14;
    const sx = x + 28 + Math.sin((t + i * 80) * 0.005) * 4;
    ctx.beginPath();
    ctx.arc(sx, sy, 6 + i * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Door
  ctx.fillStyle = '#5C3A28';
  ctx.fillRect(x - 12, y - 32, 24, 32);
  ctx.fillStyle = '#FBC34A';
  ctx.beginPath();
  ctx.arc(x + 8, y - 14, 1.6, 0, Math.PI * 2);
  ctx.fill();

  // Windows with warm light + family silhouettes
  for (const wx of [x - 36, x + 24]) {
    ctx.fillStyle = '#FFB870';
    ctx.fillRect(wx, y - 50, 18, 18);
    ctx.fillStyle = '#FBEFD9';
    ctx.fillRect(wx, y - 50, 18, 2);
    // Heads
    ctx.fillStyle = '#2A1F1A';
    ctx.beginPath();
    ctx.arc(wx + 6, y - 38, 3, 0, Math.PI * 2);
    ctx.arc(wx + 13, y - 36, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Heart over the chimney
  ctx.fillStyle = '#C75D5D';
  const heartY = y - 110 + Math.sin(t * 0.006) * 3;
  ctx.font = 'bold 18px serif';
  ctx.textAlign = 'center';
  ctx.fillText('♥', x, heartY);
  ctx.restore();
}

/** Hot sand patch — shimmering red/orange ground hazard. */
export function paintHotSand(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  t: number,
): void {
  ctx.save();
  // Base
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#F58A4D');
  g.addColorStop(1, '#C95224');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  // Shimmer lines moving with t
  ctx.fillStyle = 'rgba(255, 220, 120, 0.55)';
  for (let i = 0; i < Math.ceil(w / 16); i++) {
    const px = x + ((i * 16 + t * 0.06) % w);
    ctx.fillRect(px, y + 2 + (i % 2) * 4, 6, 2);
  }
  // Tiny "ouch" wavy lines above
  ctx.strokeStyle = 'rgba(255, 220, 120, 0.6)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let wx = x + 6; wx < x + w - 6; wx += 18) {
    const wy = y - 4 + Math.sin((t + wx * 12) * 0.008) * 2;
    ctx.moveTo(wx, wy);
    ctx.quadraticCurveTo(wx + 4, wy - 5, wx + 8, wy);
    ctx.quadraticCurveTo(wx + 12, wy + 5, wx + 16, wy);
  }
  ctx.stroke();
  ctx.restore();
}

/** Cell phone — small dark rect with a glowing screen. */
export function paintCellPhone(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  t: number,
): void {
  ctx.save();
  // Body
  ctx.fillStyle = '#2A1F1A';
  roundedRect(ctx, x, y, w, h, 4);
  ctx.fill();
  // Screen
  const glow = 0.6 + 0.4 * Math.sin(t * 0.012);
  ctx.fillStyle = `rgba(168, 224, 255, ${0.55 + glow * 0.3})`;
  ctx.fillRect(x + 3, y + 2, w - 6, h - 4);
  // Notch
  ctx.fillStyle = '#2A1F1A';
  ctx.fillRect(x + w / 2 - 3, y + 2, 6, 1.5);
  // Halo
  const rg = ctx.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, w);
  rg.addColorStop(0, 'rgba(168, 224, 255, 0.35)');
  rg.addColorStop(1, 'rgba(168, 224, 255, 0)');
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h / 2, w, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Distracted-driver car — colored body, windshield, wheels, headlights pointing in dir. */
export function paintCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  dir: 1 | -1,
  t: number,
): void {
  ctx.save();
  // Pick a stable color from the world position
  const palette = ['#C75D5D', '#7BA888', '#E89554', '#7E5BA0', '#5BA8B8'];
  const color = palette[Math.floor((x + y) / 47) % palette.length] ?? '#C75D5D';

  // Wheels (drawn first so the body sits on them)
  const wheelR = h * 0.28;
  const wheelY = y + h - wheelR + 1;
  ctx.fillStyle = '#1A1A1A';
  ctx.beginPath();
  ctx.arc(x + w * 0.22, wheelY, wheelR, 0, Math.PI * 2);
  ctx.arc(x + w * 0.78, wheelY, wheelR, 0, Math.PI * 2);
  ctx.fill();
  // Hubcaps
  ctx.fillStyle = '#888';
  ctx.beginPath();
  ctx.arc(x + w * 0.22, wheelY, wheelR * 0.45, 0, Math.PI * 2);
  ctx.arc(x + w * 0.78, wheelY, wheelR * 0.45, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = color;
  roundedRect(ctx, x, y + 18, w, h - 18 - wheelR + 2, 8);
  ctx.fill();
  // Cabin
  ctx.beginPath();
  ctx.moveTo(x + w * 0.18, y + 18);
  ctx.lineTo(x + w * 0.34, y);
  ctx.lineTo(x + w * 0.7, y);
  ctx.lineTo(x + w * 0.85, y + 18);
  ctx.closePath();
  ctx.fill();

  // Windshield — light blue
  ctx.fillStyle = 'rgba(168, 224, 255, 0.85)';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.22, y + 17);
  ctx.lineTo(x + w * 0.36, y + 3);
  ctx.lineTo(x + w * 0.68, y + 3);
  ctx.lineTo(x + w * 0.82, y + 17);
  ctx.closePath();
  ctx.fill();

  // Headlights / taillights
  ctx.fillStyle = dir === 1 ? '#FBEFD9' : '#C75D5D';
  ctx.fillRect(x + w - 6, y + h * 0.5, 6, 4);
  ctx.fillStyle = dir === 1 ? '#C75D5D' : '#FBEFD9';
  ctx.fillRect(x, y + h * 0.5, 6, 4);

  // Honk wobble — subtle frame-to-frame jiggle so the car feels alive
  const wobble = Math.sin(t * 0.03 + x * 0.1) * 0.6;
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h + 2 + wobble, w / 2, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
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
