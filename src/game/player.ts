/** Player rendering — robe body, slipper feet, staff with rotation pivot, masked face. */

import type { PlayerState } from './types.js';

interface RenderOpts {
  /** Cropped circular face data URL, or null for the silhouette default. */
  faceImage: HTMLImageElement | null;
  /** 'mountain' uses pale teal staff orb, 'cave' uses warm amber. */
  variant: 'mountain' | 'cave';
}

/** Draws the character into world coords. The caller should already have applied the camera transform. */
export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: PlayerState,
  opts: RenderOpts,
): void {
  const baseX = player.x + player.w / 2;
  const baseY = player.y + player.h;

  const idleBob = Math.sin(player.animT * 0.1) * 1.5;
  const walkBob = player.walking ? Math.sin(player.animT * 0.3) * 2 : 0;
  const bob = player.grounded ? idleBob + walkBob : 0;

  ctx.save();
  ctx.translate(baseX, baseY + bob);

  // Mirror by facing
  if (player.facing === -1) ctx.scale(-1, 1);

  drawRobe(ctx);
  drawFeet(ctx, player);
  drawHead(ctx, opts.faceImage);
  drawStaff(ctx, player, opts.variant);

  ctx.restore();
}

function drawRobe(ctx: CanvasRenderingContext2D): void {
  // Robe body: A-line silhouette ~64x88, anchored at feet (0,0) at bottom-center.
  ctx.save();
  // Outer (warm cream/orange)
  ctx.fillStyle = '#F4A56C';
  ctx.beginPath();
  // shoulders
  ctx.moveTo(-14, -78);
  ctx.quadraticCurveTo(-22, -60, -28, -10);
  ctx.lineTo(-32, 4);
  ctx.lineTo(32, 4);
  ctx.quadraticCurveTo(28, -28, 22, -60);
  ctx.quadraticCurveTo(20, -72, 14, -78);
  ctx.closePath();
  ctx.fill();

  // Inner robe shading (left side)
  ctx.fillStyle = '#E89554';
  ctx.beginPath();
  ctx.moveTo(-14, -78);
  ctx.quadraticCurveTo(-22, -60, -28, -10);
  ctx.lineTo(-32, 4);
  ctx.lineTo(-6, 4);
  ctx.lineTo(-2, -78);
  ctx.closePath();
  ctx.fill();

  // Cream sash across the belly
  ctx.fillStyle = '#FBEFD9';
  ctx.beginPath();
  ctx.moveTo(-26, -38);
  ctx.lineTo(26, -42);
  ctx.lineTo(28, -32);
  ctx.lineTo(-28, -28);
  ctx.closePath();
  ctx.fill();

  // Tiny knot
  ctx.fillStyle = '#5C3A28';
  ctx.beginPath();
  ctx.arc(8, -36, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawFeet(ctx: CanvasRenderingContext2D, player: PlayerState): void {
  const stepLeft = player.walking ? Math.sin(player.animT * 0.3) * 1.5 : 0;
  const stepRight = -stepLeft;
  ctx.save();
  ctx.fillStyle = '#5C3A28';
  // Left slipper
  ctx.beginPath();
  ctx.ellipse(-10, 4 + stepLeft, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Right slipper
  ctx.beginPath();
  ctx.ellipse(10, 4 + stepRight, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHead(ctx: CanvasRenderingContext2D, faceImage: HTMLImageElement | null): void {
  ctx.save();
  // Soft cream outline ring
  ctx.fillStyle = '#FBEFD9';
  ctx.beginPath();
  ctx.arc(0, -84, 26, 0, Math.PI * 2);
  ctx.fill();

  if (faceImage && faceImage.complete && faceImage.naturalWidth > 0) {
    // Mask the face image into a circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, -84, 24, 0, Math.PI * 2);
    ctx.clip();
    // The cropped face image is square; draw it filling the circle.
    ctx.drawImage(faceImage, -24, -108, 48, 48);
    ctx.restore();
  } else {
    // Silhouette default
    ctx.fillStyle = '#7D7068';
    ctx.beginPath();
    ctx.arc(0, -84, 24, 0, Math.PI * 2);
    ctx.fill();
    // simple smile
    ctx.fillStyle = '#FBEFD9';
    ctx.beginPath();
    ctx.arc(-6, -88, 2, 0, Math.PI * 2);
    ctx.arc(6, -88, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FBEFD9';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -82, 6, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  }

  ctx.restore();
}

function drawStaff(
  ctx: CanvasRenderingContext2D,
  player: PlayerState,
  variant: 'mountain' | 'cave',
): void {
  // Pivot at chest (~y=-42).
  const baseAngle = player.walking
    ? -0.26 + Math.sin(player.animT * 0.3 + Math.PI) * 0.09 // walk: gentle counter-sway
    : -0.26 + Math.sin(player.animT * 0.1) * 0.05; // idle sway

  let attackAngle = 0;
  if (player.attackT > 0) {
    // Map attack timer (0..15) into a smooth swing forward then back.
    const k = 1 - player.attackT / 15;
    const swing = Math.sin(k * Math.PI);
    attackAngle = swing * 1.2;
  }

  ctx.save();
  ctx.translate(8, -42);
  ctx.rotate(baseAngle + attackAngle);

  // Shaft
  ctx.strokeStyle = '#8B5E3C';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 22);
  ctx.lineTo(0, -56);
  ctx.stroke();

  // Knots
  ctx.fillStyle = '#5C3A28';
  ctx.beginPath();
  ctx.arc(0, -10, 3, 0, Math.PI * 2);
  ctx.arc(0, -34, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Gnarled top + glowing orb
  const orbColor = variant === 'mountain' ? '#A8E6DC' : '#FFB870';
  const orbGlow = variant === 'mountain' ? 'rgba(168,230,220,0.55)' : 'rgba(255,184,112,0.55)';
  // glow
  const rg = ctx.createRadialGradient(0, -62, 0, 0, -62, 18);
  rg.addColorStop(0, orbGlow);
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(0, -62, 18, 0, Math.PI * 2);
  ctx.fill();
  // orb
  ctx.fillStyle = orbColor;
  ctx.beginPath();
  ctx.arc(0, -62, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
