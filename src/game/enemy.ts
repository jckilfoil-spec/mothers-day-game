/** Enemy rendering + factory. */

import type { EnemyState } from './types.js';

const EMOJIS = ['😈', '😠', '😤', '🙃', '😬'];

let id = 0;

export function makeEnemy(
  x: number,
  y: number,
  variant: 'rock' | 'slime',
  patrol = 0,
): EnemyState {
  id++;
  return {
    id: 'e' + id,
    x,
    y,
    w: 64,
    h: 56,
    hp: 15,
    maxHp: 15,
    speed: patrol > 0 ? 0.6 : 0,
    dir: 1,
    minX: x - patrol,
    maxX: x + patrol + 64,
    hitFlash: 0,
    defeatT: 0,
    variant,
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

  // Body wobble
  const wobble = Math.sin(t * 0.005 + e.x * 0.1) * 1.5;
  const bodyW = e.w / 2;
  const bodyH = e.h / 2;

  // Body
  if (e.variant === 'rock') {
    // Gray rounded rock
    ctx.fillStyle = '#7D7068';
    ctx.beginPath();
    ctx.ellipse(0, 4 + wobble, bodyW, bodyH, 0, 0, Math.PI * 2);
    ctx.fill();
    // Highlight
    ctx.fillStyle = '#A29688';
    ctx.beginPath();
    ctx.ellipse(-8, -6 + wobble, bodyW * 0.6, bodyH * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Purple slime
    ctx.fillStyle = '#7E5BA0';
    ctx.beginPath();
    ctx.ellipse(0, 6 + wobble, bodyW, bodyH * 0.95, 0, 0, Math.PI * 2);
    ctx.fill();
    // Glossy highlight
    ctx.fillStyle = '#A87BC5';
    ctx.beginPath();
    ctx.ellipse(-10, -4 + wobble, bodyW * 0.6, bodyH * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Hit flash overlay
  if (e.hitFlash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(0, 4 + wobble, bodyW, bodyH, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Face emoji
  ctx.font = '28px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(e.emoji, 0, 2 + wobble);

  ctx.restore();

  // HP bar
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
