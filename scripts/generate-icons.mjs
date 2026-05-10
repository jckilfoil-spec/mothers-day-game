#!/usr/bin/env node
/**
 * Generate icon PNGs from public/icon.svg.
 *
 * Outputs:
 *   - public/icon-180.png  (180×180, iOS apple-touch-icon)
 *   - public/og-image.png  (1200×1200, square unfurl card for iMessage/Slack/Discord)
 *
 * Sharp is intentionally NOT a permanent devDependency — only needed when the
 * source SVG changes. Run with:
 *
 *   npm install --no-save sharp && node scripts/generate-icons.mjs
 */

import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const svgPath = join(root, 'public', 'icon.svg');
const svg = await readFile(svgPath);

async function rasterize(size, outName) {
  // density=384 = 5x the 72 DPI default → crisp gradient edges at 180/1200.
  const buf = await sharp(svg, { density: 384 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();
  const out = join(root, 'public', outName);
  await writeFile(out, buf);
  console.log(`  ${outName.padEnd(16)} ${size}x${size}  ${buf.length.toLocaleString()} bytes`);
}

console.log('Generating icons from public/icon.svg:');
await rasterize(180, 'icon-180.png');
await rasterize(1200, 'og-image.png');
console.log('Done. Both PNGs ship to dist/ on the next `npm run build`.');
