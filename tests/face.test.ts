import { describe, expect, it } from 'vitest';
import { fileToDataUrl } from '../src/util/face.js';

/**
 * The cropFaceToDataUrl function uses HTMLCanvasElement.getContext('2d'), which jsdom
 * doesn't implement (it would require the native `canvas` package). It's exercised in
 * the browser via the editor flow; here we only test the file → data URL helper.
 */
describe('fileToDataUrl', () => {
  it('reads a Blob into a data URL', async () => {
    const blob = new Blob(['hello'], { type: 'text/plain' });
    const url = await fileToDataUrl(blob as File);
    expect(url.startsWith('data:')).toBe(true);
  });
});
