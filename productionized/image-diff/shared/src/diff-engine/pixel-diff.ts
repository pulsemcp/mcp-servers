/**
 * Pixel-level image comparison engine.
 *
 * Forked from pixelmatch by Mapbox (ISC License).
 * Original: https://github.com/mapbox/pixelmatch
 * Copyright (c) 2025, Mapbox
 *
 * Extended with:
 * - Per-pixel intensity map (Float32Array) for heatmap generation
 * - Structured diff metadata (counts, percentages)
 * - Anti-aliasing tracking separate from diff tracking
 *
 * The color distance algorithm uses YIQ NTSC transmission color space,
 * based on the paper "Measuring perceived color difference using YIQ NTSC
 * transmission color space in mobile applications" by Y. Kotsarenko and F. Ramos.
 */

export interface PixelDiffOptions {
  /** Matching threshold (0 to 1); smaller is more sensitive. Default: 0.1 */
  threshold?: number;
  /** Whether to count anti-aliased pixels as diffs. Default: false */
  includeAA?: boolean;
}

export interface PixelDiffResult {
  /** Total pixels in the image */
  totalPixels: number;
  /** Number of pixels that differ beyond the threshold */
  diffCount: number;
  /** Number of pixels detected as anti-aliasing */
  aaCount: number;
  /** Number of pixels that match within the threshold */
  matchCount: number;
  /** Percentage of pixels that differ (0-100) */
  diffPercentage: number;
  /**
   * Per-pixel intensity map. Values 0.0-1.0 where:
   * - 0.0 = identical pixel
   * - 1.0 = maximally different pixel
   * - -1.0 = anti-aliased pixel (excluded from diff)
   */
  intensityMap: Float32Array;
  /** Width of the images */
  width: number;
  /** Height of the images */
  height: number;
}

/** Maximum possible YIQ delta value (black vs white) */
const MAX_YIQ_DELTA = 35215;

/**
 * Compare two images pixel-by-pixel using YIQ perceptual color distance.
 *
 * Both images must be raw RGBA buffers of identical dimensions.
 */
export function pixelDiff(
  img1: Uint8Array,
  img2: Uint8Array,
  width: number,
  height: number,
  options: PixelDiffOptions = {}
): PixelDiffResult {
  const { threshold = 0.1, includeAA = false } = options;

  const len = width * height;
  if (img1.length !== len * 4 || img2.length !== len * 4) {
    throw new Error(
      `Image data size mismatch. Expected ${len * 4} bytes for ${width}x${height}, ` +
        `got img1=${img1.length}, img2=${img2.length}`
    );
  }

  const intensityMap = new Float32Array(len);

  // Fast path: check if images are identical using 32-bit comparison
  // Uint32Array requires 4-byte aligned offsets; copy to fresh buffer if misaligned
  const a32 =
    img1.byteOffset % 4 === 0
      ? new Uint32Array(img1.buffer, img1.byteOffset, len)
      : new Uint32Array(img1.slice().buffer);
  const b32 =
    img2.byteOffset % 4 === 0
      ? new Uint32Array(img2.buffer, img2.byteOffset, len)
      : new Uint32Array(img2.slice().buffer);
  let identical = true;
  for (let i = 0; i < len; i++) {
    if (a32[i] !== b32[i]) {
      identical = false;
      break;
    }
  }
  if (identical) {
    console.error('[pixel-diff] Images are identical (fast path)');
    return {
      totalPixels: len,
      diffCount: 0,
      aaCount: 0,
      matchCount: len,
      diffPercentage: 0,
      intensityMap,
      width,
      height,
    };
  }

  const maxDelta = MAX_YIQ_DELTA * threshold * threshold;
  let diffCount = 0;
  let aaCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const pos = i * 4;

      // Fast path for identical pixels (32-bit comparison)
      const delta = a32[i] === b32[i] ? 0 : colorDelta(img1, img2, pos, pos, false);

      if (Math.abs(delta) > maxDelta) {
        // Check anti-aliasing
        const isExcludedAA =
          !includeAA &&
          (antialiased(img1, x, y, width, height, a32, b32) ||
            antialiased(img2, x, y, width, height, b32, a32));

        if (isExcludedAA) {
          aaCount++;
          intensityMap[i] = -1.0; // Mark as AA
        } else {
          diffCount++;
          // Normalize intensity to 0.0-1.0
          intensityMap[i] = Math.min(1.0, Math.abs(delta) / MAX_YIQ_DELTA);
        }
      }
      // else: intensityMap[i] stays 0.0 (matching pixel)
    }
  }

  const matchCount = len - diffCount - aaCount;
  const diffPercentage = (diffCount / len) * 100;

  console.error(
    `[pixel-diff] Comparison complete: ${diffCount} diff pixels (${diffPercentage.toFixed(2)}%), ` +
      `${aaCount} AA pixels, ${matchCount} matching pixels out of ${len} total`
  );

  return {
    totalPixels: len,
    diffCount,
    aaCount,
    matchCount,
    diffPercentage,
    intensityMap,
    width,
    height,
  };
}

/**
 * Check if a pixel is likely part of anti-aliasing.
 * Based on "Anti-aliased Pixel and Intensity Slope Detector" by V. Vysniauskas, 2009.
 */
function antialiased(
  img: Uint8Array,
  x1: number,
  y1: number,
  width: number,
  height: number,
  a32: Uint32Array,
  b32: Uint32Array
): boolean {
  const x0 = Math.max(x1 - 1, 0);
  const y0 = Math.max(y1 - 1, 0);
  const x2 = Math.min(x1 + 1, width - 1);
  const y2 = Math.min(y1 + 1, height - 1);
  const pos = y1 * width + x1;
  let zeroes = x1 === x0 || x1 === x2 || y1 === y0 || y1 === y2 ? 1 : 0;
  let min = 0;
  let max = 0;
  let minX = 0;
  let minY = 0;
  let maxX = 0;
  let maxY = 0;

  for (let x = x0; x <= x2; x++) {
    for (let y = y0; y <= y2; y++) {
      if (x === x1 && y === y1) continue;

      const delta = colorDelta(img, img, pos * 4, (y * width + x) * 4, true);

      if (delta === 0) {
        zeroes++;
        if (zeroes > 2) return false;
      } else if (delta < min) {
        min = delta;
        minX = x;
        minY = y;
      } else if (delta > max) {
        max = delta;
        maxX = x;
        maxY = y;
      }
    }
  }

  if (min === 0 || max === 0) return false;

  return (
    (hasManySiblings(a32, minX, minY, width, height) &&
      hasManySiblings(b32, minX, minY, width, height)) ||
    (hasManySiblings(a32, maxX, maxY, width, height) &&
      hasManySiblings(b32, maxX, maxY, width, height))
  );
}

/** Check if a pixel has 3+ adjacent pixels of the same color. */
function hasManySiblings(
  img: Uint32Array,
  x1: number,
  y1: number,
  width: number,
  height: number
): boolean {
  const x0 = Math.max(x1 - 1, 0);
  const y0 = Math.max(y1 - 1, 0);
  const x2 = Math.min(x1 + 1, width - 1);
  const y2 = Math.min(y1 + 1, height - 1);
  const val = img[y1 * width + x1];
  let zeroes = x1 === x0 || x1 === x2 || y1 === y0 || y1 === y2 ? 1 : 0;

  for (let x = x0; x <= x2; x++) {
    for (let y = y0; y <= y2; y++) {
      if (x === x1 && y === y1) continue;
      zeroes += +(val === img[y * width + x]);
      if (zeroes > 2) return true;
    }
  }
  return false;
}

/**
 * Calculate color difference using YIQ NTSC transmission color space.
 *
 * Based on "Measuring perceived color difference using YIQ NTSC transmission
 * color space in mobile applications" by Y. Kotsarenko and F. Ramos.
 */
function colorDelta(
  img1: Uint8Array,
  img2: Uint8Array,
  k: number,
  m: number,
  yOnly: boolean
): number {
  const r1 = img1[k];
  const g1 = img1[k + 1];
  const b1 = img1[k + 2];
  const a1 = img1[k + 3];
  const r2 = img2[m];
  const g2 = img2[m + 1];
  const b2 = img2[m + 2];
  const a2 = img2[m + 3];

  let dr = r1 - r2;
  let dg = g1 - g2;
  let db = b1 - b2;
  const da = a1 - a2;

  if (!dr && !dg && !db && !da) return 0;

  // Blend semi-transparent pixels against a patterned background
  if (a1 < 255 || a2 < 255) {
    const rb = 48 + 159 * (k % 2);
    const gb = 48 + 159 * (((k / 1.618033988749895) | 0) % 2);
    const bb = 48 + 159 * (((k / 2.618033988749895) | 0) % 2);
    dr = (r1 * a1 - r2 * a2 - rb * da) / 255;
    dg = (g1 * a1 - g2 * a2 - gb * da) / 255;
    db = (b1 * a1 - b2 * a2 - bb * da) / 255;
  }

  const y = dr * 0.29889531 + dg * 0.58662247 + db * 0.11448223;

  if (yOnly) return y;

  const i = dr * 0.59597799 - dg * 0.2741761 - db * 0.32180189;
  const q = dr * 0.21147017 - dg * 0.52261711 + db * 0.31114694;

  const delta = 0.5053 * y * y + 0.299 * i * i + 0.1957 * q * q;

  // Encode whether img2 pixel is darker/lighter in the sign
  return y > 0 ? -delta : delta;
}
