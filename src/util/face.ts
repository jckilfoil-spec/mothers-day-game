/**
 * Crop an image to a circle and return a 256x256 PNG data URL.
 * Pure utility — no DOM mutation, no state.
 *
 * @param img    Loaded HTMLImageElement source.
 * @param cx     Center X of the crop in image pixels.
 * @param cy     Center Y of the crop in image pixels.
 * @param radius Radius of the crop in image pixels.
 * @returns      data:image/png base64 URL of a 256x256 circular crop, transparent outside the circle.
 */
export function cropFaceToDataUrl(
  img: HTMLImageElement,
  cx: number,
  cy: number,
  radius: number,
): string {
  const SIZE = 256;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Apply circular mask, then draw the source square that contains it.
  ctx.save();
  ctx.beginPath();
  ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  const sx = cx - radius;
  const sy = cy - radius;
  const sSize = radius * 2;
  ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, SIZE, SIZE);
  ctx.restore();

  return canvas.toDataURL('image/png');
}

/** Promise wrapper for image loading. Resolves on `load`, rejects on `error`. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

/** Convert a File to a data URL. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsDataURL(file);
  });
}
