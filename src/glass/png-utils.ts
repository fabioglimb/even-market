/** PNG encoding: 4-bit greyscale indexed PNG via UPNG + hash for diff detection. */
import UPNG from 'upng-js';

function rgbaToGreyscale4BitRGBA(data: Uint8ClampedArray, pixelCount: number): Uint8Array {
  const out = new Uint8Array(pixelCount * 4);
  for (let i = 0; i < pixelCount; i++) {
    const si = i * 4;
    const lum = Math.round(0.299 * data[si]! + 0.587 * data[si + 1]! + 0.114 * data[si + 2]!);
    const idx = Math.min(15, Math.round(lum / 17));
    const v = idx * 17;
    out[si] = v;
    out[si + 1] = v;
    out[si + 2] = v;
    out[si + 3] = 255;
  }
  return out;
}

/** FNV-1a 32-bit hash for fast diff comparison. */
function fnv32a(bytes: Uint8Array): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i]!;
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export interface EncodedTile {
  bytes: Uint8Array;
  hash: number;
}

/**
 * Crop, greyscale-quantize, encode as indexed PNG.
 * Returns Uint8Array (not number[]) + hash for diff detection.
 */
export function cropScaleToIndexedPng(
  canvas: HTMLCanvasElement,
  sx: number, sy: number, sw: number, sh: number,
  tw: number, th: number,
): EncodedTile {
  const tile = document.createElement('canvas');
  tile.width = tw;
  tile.height = th;
  const ctx = tile.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, tw, th);

  const imgData = ctx.getImageData(0, 0, tw, th);
  const greyRGBA = rgbaToGreyscale4BitRGBA(imgData.data, tw * th);
  const pngBuf = UPNG.encode([greyRGBA.buffer as ArrayBuffer], tw, th, 16);
  const bytes = new Uint8Array(pngBuf);

  return { bytes, hash: fnv32a(bytes) };
}
