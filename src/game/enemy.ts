/** Enemy rendering + factory. */

import type { EnemyState } from './types.js';

const EMOJIS = ['😈', '😠', '😤', '🙃', '😬'];

let id = 0;

interface MakeEnemyOpts {
  hp?: number;
  /** Width override (defaults per variant). */
  w?: number;
  /** Height override (defaults per variant). */
  h?: number;
  /** Default true; pass false for hovering enemies that don't block. */
  solid?: boolean;
}

const DEFAULTS: Record<EnemyState['variant'], { w: number; h: number; hp: number; solid: boolean }> = {
  rock: { w: 64, h: 56, hp: 15, solid: true },
  slime: { w: 64, h: 56, hp: 15, solid: true },
  // Phones stand upright on the road and go down quickly to spam-tapping.
  phone: { w: 30, h: 56, hp: 5, solid: true },
  // Seagulls hover above the player — pass-through, fragile, fast to kill.
  seagull: { w: 64, h: 36, hp: 4, solid: false },
};

export function makeEnemy(
  x: number,
  y: number,
  variant: EnemyState['variant'],
  patrol = 0,
  opts: MakeEnemyOpts = {},
): EnemyState {
  id++;
  const def = DEFAULTS[variant];
  const w = opts.w ?? def.w;
  const h = opts.h ?? def.h;
  const hp = opts.hp ?? def.hp;
  const solid = opts.solid ?? def.solid;
  return {
    id: 'e' + id,
    x,
    y,
    w,
    h,
    hp,
    maxHp: hp,
    speed: patrol > 0 ? 0.6 : 0,
    dir: 1,
    minX: x - patrol,
    maxX: x + patrol + w,
    hitFlash: 0,
    defeatT: 0,
    variant,
    solid,
    emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)] ?? '😈',
  };
}

export function drawEnemy(ctx: CanvasRenderingContext2D, e: EnemyState, t: number): void {
  if (e.defeatT > 30) return;

  // Defeat puff: scale down + fade
  const defeatFade = e.defeatT > 0 ? 1 - e.defeatT / 30 : 1;
  const defeatScale = 1 + (e.defeatT > 0 ? e.defeatT / 30 : 0) * 0.4;

  const shake = e.hitFlash > 0 ? Math.sin(e.hitFlash * 1.4) * 2 : 0;
  ctx.save();
  ctx.translate(e.x + e.w / 2 + shake, e.y + e.h / 2);
  ctx.globalAlpha = defeatFade;
  ctx.scale(defeatScale, defeatScale);

  // Red "danger / clickable" glow halo behind every enemy. Pulses noticeably so
  // first-time players can spot what's clickable from across the screen.
  if (e.defeatT === 0) {
    const glowR = Math.max(e.w, e.h) * 1.15;
    const pulse = 0.55 + 0.22 * Math.sin(t * 0.006 + e.x * 0.1);
    const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);
    rg.addColorStop(0, `rgba(255, 95, 95, ${pulse})`);
    rg.addColorStop(0.45, `rgba(232, 80, 80, ${pulse * 0.6})`);
    rg.addColorStop(1, 'rgba(199, 93, 93, 0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(0, 0, glowR, 0, Math.PI * 2);
    ctx.fill();
  }

  // Body wobble
  const wobble = Math.sin(t * 0.005 + e.x * 0.1) * 1.5;
  const bodyW = e.w / 2;
  const bodyH = e.h / 2;

  // Body
  if (e.variant === 'rock') {
    ctx.fillStyle = '#7D7068';
    ctx.beginPath();
    ctx.ellipse(0, 4 + wobble, bodyW, bodyH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#A29688';
    ctx.beginPath();
    ctx.ellipse(-8, -6 + wobble, bodyW * 0.6, bodyH * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    drawHitFlash(ctx, 0, 4 + wobble, bodyW, bodyH, e.hitFlash);
    drawEmojiFace(ctx, e.emoji, 0, 2 + wobble);
  } else if (e.variant === 'slime') {
    ctx.fillStyle = '#7E5BA0';
    ctx.beginPath();
    ctx.ellipse(0, 6 + wobble, bodyW, bodyH * 0.95, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#A87BC5';
    ctx.beginPath();
    ctx.ellipse(-10, -4 + wobble, bodyW * 0.6, bodyH * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    drawHitFlash(ctx, 0, 4 + wobble, bodyW, bodyH, e.hitFlash);
    drawEmojiFace(ctx, e.emoji, 0, 2 + wobble);
  } else if (e.variant === 'phone') {
    drawPhone(ctx, e.w, e.h, e.hitFlash, t);
  } else if (e.variant === 'seagull') {
    drawSeagull(ctx, e.w, e.h, e.hitFlash, e.dir, t);
  }

  ctx.restore();

  // HP bar (only after first hit)
  if (e.defeatT === 0 && e.hp < e.maxHp) {
    const barW = e.w;
    const barH = 6;
    const bx = e.x;
    const by = e.y - 14;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    roundedRect(ctx, bx, by, barW, barH, 3);
    ctx.fill();
    const pct = e.hp / e.maxHp;
    ctx.fillStyle = pct > 0.5 ? '#7BA888' : pct > 0.2 ? '#F4A56C' : '#C75D5D';
    roundedRect(ctx, bx, by, barW * pct, barH, 3);
    ctx.fill();
    ctx.restore();
  }

  // "Click me!" chevron above untouched enemies — gentle bob. Once hit, the HP bar
  // takes over the same slot, so the visual gracefully hands off.
  if (e.defeatT === 0 && e.hp === e.maxHp) {
    const ax = e.x + e.w / 2;
    const ay = e.y - 18 + Math.sin(t * 0.008 + e.x * 0.05) * 3;
    ctx.save();
    // Drop shadow for contrast against any background
    ctx.fillStyle = 'rgba(42, 31, 26, 0.4)';
    ctx.beginPath();
    ctx.moveTo(ax - 8, ay - 7 + 1.5);
    ctx.lineTo(ax + 8, ay - 7 + 1.5);
    ctx.lineTo(ax, ay + 1.5);
    ctx.closePath();
    ctx.fill();
    // Chevron body — bright yellow, points down at the enemy
    ctx.fillStyle = '#FBC34A';
    ctx.beginPath();
    ctx.moveTo(ax - 8, ay - 7);
    ctx.lineTo(ax + 8, ay - 7);
    ctx.lineTo(ax, ay);
    ctx.closePath();
    ctx.fill();
    // Top highlight stroke for definition
    ctx.strokeStyle = '#FFFEF8';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(ax - 6, ay - 6);
    ctx.lineTo(ax + 6, ay - 6);
    ctx.stroke();
    ctx.restore();
  }

  // Defeat puff cloud
  if (e.defeatT > 0 && e.defeatT < 30) {
    const k = e.defeatT / 30;
    ctx.save();
    ctx.globalAlpha = (1 - k) * 0.7;
    ctx.fillStyle = '#FFFEF8';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const dist = 10 + k * 30;
      ctx.beginPath();
      ctx.arc(e.x + e.w / 2 + Math.cos(a) * dist, e.y + e.h / 2 + Math.sin(a) * dist, 8 - k * 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawHitFlash(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  flash: number,
): void {
  if (flash <= 0) return;
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawEmojiFace(ctx: CanvasRenderingContext2D, emoji: string, x: number, y: number): void {
  ctx.font = '28px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, x, y);
}

/** Vertical phone, screen aglow, hairline cracks once damaged. Local coords centered. */
function drawPhone(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  hitFlash: number,
  t: number,
): void {
  const x = -w / 2;
  const y = -h / 2;
  // Body
  ctx.fillStyle = '#1A1410';
  roundedRect(ctx, x, y, w, h, 5);
  ctx.fill();
  // Bezel
  ctx.strokeStyle = '#3A3A3A';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Screen
  const sx = x + 3;
  const sy = y + 6;
  const sw = w - 6;
  const sh = h - 12;
  const glow = 0.55 + 0.45 * Math.sin(t * 0.012);
  ctx.fillStyle = `rgba(168, 224, 255, ${0.55 + glow * 0.3})`;
  ctx.fillRect(sx, sy, sw, sh);
  // App icons grid
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 2; col++) {
      ctx.fillRect(sx + 2 + col * 6, sy + 4 + row * 8, 4, 4);
    }
  }
  // Notch
  ctx.fillStyle = '#1A1410';
  ctx.fillRect(x + w / 2 - 3, y + 2, 6, 2);
  // Speaker dot
  ctx.fillRect(x + w / 2 - 1, y + 3, 2, 1);
  // Home indicator at bottom
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillRect(x + w / 2 - 5, y + h - 4, 10, 1.5);
  // Hit flash overlay
  if (hitFlash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    roundedRect(ctx, x, y, w, h, 5);
    ctx.fill();
  }
}

/** Top-down seagull silhouette: white body, beak in facing direction, flapping wings. */
function drawSeagull(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  hitFlash: number,
  dir: 1 | -1,
  t: number,
): void {
  // Wing flap phase (faster than body)
  const flap = Math.sin(t * 0.012) * 0.6;
  // Body
  ctx.fillStyle = '#FAFAFA';
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.32, h * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  // Underbelly shadow
  ctx.fillStyle = '#D6D6D6';
  ctx.beginPath();
  ctx.ellipse(0, 4, w * 0.28, h * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wings — two ellipses extending from sides; rotate by flap.
  ctx.save();
  ctx.translate(-w * 0.18, -2);
  ctx.rotate(-flap);
  ctx.fillStyle = '#FAFAFA';
  ctx.beginPath();
  ctx.ellipse(-w * 0.16, 0, w * 0.22, h * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#A6A6A6';
  ctx.beginPath();
  ctx.ellipse(-w * 0.22, 1, w * 0.14, h * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(w * 0.18, -2);
  ctx.rotate(flap);
  ctx.fillStyle = '#FAFAFA';
  ctx.beginPath();
  ctx.ellipse(w * 0.16, 0, w * 0.22, h * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#A6A6A6';
  ctx.beginPath();
  ctx.ellipse(w * 0.22, 1, w * 0.14, h * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Head + beak in facing direction
  const facing = dir === 1 ? 1 : -1;
  ctx.fillStyle = '#FAFAFA';
  ctx.beginPath();
  ctx.arc(facing * w * 0.22, -2, h * 0.18, 0, Math.PI * 2);
  ctx.fill();
  // Beak (orange triangle)
  ctx.fillStyle = '#F4A56C';
  ctx.beginPath();
  ctx.moveTo(facing * (w * 0.32), -2);
  ctx.lineTo(facing * (w * 0.46), -1);
  ctx.lineTo(facing * (w * 0.32), 2);
  ctx.closePath();
  ctx.fill();
  // Eye (small dark dot)
  ctx.fillStyle = '#1A1410';
  ctx.beginPath();
  ctx.arc(facing * (w * 0.26), -3, 1.2, 0, Math.PI * 2);
  ctx.fill();
  // Tiny mean eyebrow
  ctx.strokeStyle = '#1A1410';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(facing * (w * 0.22), -6);
  ctx.lineTo(facing * (w * 0.30), -5);
  ctx.stroke();

  // Hit flash overlay
  if (hitFlash > 0) {
    ctx.fillStyle = 'rgba(255,200,80,0.55)';
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.5, h * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
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
