/**
 * Image alignment module for comparing images of different sizes.
 *
 * When a smaller image (e.g., a Figma mock of a UI element) needs to be compared
 * against a larger image (e.g., a full-page screenshot), this module finds the
 * optimal position of the smaller image within the larger one.
 *
 * Strategy: OpenCV ZNCC coarse search on downsampled images, followed by
 * pixel-level ZNCC refinement at full resolution. This combines OpenCV's
 * efficient DFT-based template matching with pixel-precise accuracy.
 */

import sharp from 'sharp';

export interface AlignmentResult {
  /** X offset where the template best matches in the larger image */
  x: number;
  /** Y offset where the template best matches in the larger image */
  y: number;
  /** Confidence score (0-1, higher is better) */
  confidence: number;
  /** Which strategy was used */
  strategy: string;
  /** Time taken in milliseconds */
  timeMs: number;
}

export interface RawImageData {
  data: Uint8Array;
  width: number;
  height: number;
}

/**
 * Load an image file and return raw RGBA pixel data.
 */
export async function loadRawImage(imagePath: string): Promise<RawImageData> {
  const result = await sharp(imagePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return {
    data: new Uint8Array(result.data.buffer, result.data.byteOffset, result.data.length),
    width: result.info.width,
    height: result.info.height,
  };
}

/**
 * Determine which image is the template (smaller) and which is the scene (larger).
 * Returns ordered by total pixel count.
 */
export function orderBySize(
  img1: RawImageData,
  img2: RawImageData
): { scene: RawImageData; template: RawImageData; swapped: boolean } {
  const pixels1 = img1.width * img1.height;
  const pixels2 = img2.width * img2.height;
  if (pixels1 >= pixels2) {
    return { scene: img1, template: img2, swapped: false };
  }
  return { scene: img2, template: img1, swapped: true };
}

/**
 * Convert RGBA image data to grayscale Float32 using ITU-R BT.601 luminance weights.
 */
export function toGrayscale(data: Uint8Array, width: number, height: number): Float32Array {
  const len = width * height;
  const gray = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const pos = i * 4;
    gray[i] = data[pos] * 0.299 + data[pos + 1] * 0.587 + data[pos + 2] * 0.114;
  }
  return gray;
}

/**
 * Apply a 3x3 Sobel edge detection filter and return edge magnitude.
 */
export function sobelEdges(gray: Float32Array, width: number, height: number): Float32Array {
  const edges = new Float32Array(width * height);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const gx =
        -gray[(y - 1) * width + (x - 1)] +
        gray[(y - 1) * width + (x + 1)] -
        2 * gray[y * width + (x - 1)] +
        2 * gray[y * width + (x + 1)] -
        gray[(y + 1) * width + (x - 1)] +
        gray[(y + 1) * width + (x + 1)];

      const gy =
        -gray[(y - 1) * width + (x - 1)] -
        2 * gray[(y - 1) * width + x] -
        gray[(y - 1) * width + (x + 1)] +
        gray[(y + 1) * width + (x - 1)] +
        2 * gray[(y + 1) * width + x] +
        gray[(y + 1) * width + (x + 1)];

      edges[y * width + x] = Math.sqrt(gx * gx + gy * gy);
    }
  }

  return edges;
}

/**
 * Downsample a single-channel image by a factor using area averaging.
 */
export function downsample(
  data: Float32Array,
  width: number,
  height: number,
  factor: number
): { data: Float32Array; width: number; height: number } {
  const newWidth = Math.floor(width / factor);
  const newHeight = Math.floor(height / factor);
  const result = new Float32Array(newWidth * newHeight);

  for (let ny = 0; ny < newHeight; ny++) {
    for (let nx = 0; nx < newWidth; nx++) {
      let sum = 0;
      let count = 0;
      for (let dy = 0; dy < factor; dy++) {
        for (let dx = 0; dx < factor; dx++) {
          const sy = ny * factor + dy;
          const sx = nx * factor + dx;
          if (sy < height && sx < width) {
            sum += data[sy * width + sx];
            count++;
          }
        }
      }
      result[ny * newWidth + nx] = sum / count;
    }
  }

  return { data: result, width: newWidth, height: newHeight };
}

/**
 * Compute Zero-mean Normalized Cross-Correlation (ZNCC) at a specific position.
 * Returns a value from -1 (anti-correlated) to +1 (perfect match).
 * Near-zero variance regions (e.g., solid white) produce a score of 0.
 */
function znccAtPosition(
  scene: Float32Array,
  sceneWidth: number,
  template: Float32Array,
  templateWidth: number,
  templateHeight: number,
  offsetX: number,
  offsetY: number
): number {
  let sumST = 0;
  let sumS2 = 0;
  let sumT2 = 0;
  let sumS = 0;
  let sumT = 0;
  let count = 0;

  for (let ty = 0; ty < templateHeight; ty++) {
    for (let tx = 0; tx < templateWidth; tx++) {
      const sv = scene[(offsetY + ty) * sceneWidth + (offsetX + tx)];
      const tv = template[ty * templateWidth + tx];
      sumS += sv;
      sumT += tv;
      sumST += sv * tv;
      sumS2 += sv * sv;
      sumT2 += tv * tv;
      count++;
    }
  }

  const meanS = sumS / count;
  const meanT = sumT / count;
  const numerator = sumST - count * meanS * meanT;
  const denomS = Math.sqrt(Math.max(0, sumS2 - count * meanS * meanS));
  const denomT = Math.sqrt(Math.max(0, sumT2 - count * meanT * meanT));

  if (denomS < 1e-6 || denomT < 1e-6) {
    return 0;
  }

  return numerator / (denomS * denomT);
}

interface Candidate {
  x: number;
  y: number;
  score: number;
}

// ============================================================================
// Primary Strategy: OpenCV ZNCC coarse search + pixel-level refinement
// ============================================================================

// Minimal OpenCV type definitions
interface CvMat {
  delete(): void;
}

interface CvPoint {
  x: number;
  y: number;
}

interface CvMinMaxResult {
  minVal: number;
  maxVal: number;
  minLoc: CvPoint;
  maxLoc: CvPoint;
}

interface CvModule {
  Mat: new (rows: number, cols: number, type: number) => CvMat;
  matFromArray: (
    rows: number,
    cols: number,
    type: number,
    data: number[] | Float32Array | Uint8Array
  ) => CvMat;
  CV_8UC1: number;
  CV_32FC1: number;
  TM_CCOEFF_NORMED: number;
  matchTemplate: (image: CvMat, template: CvMat, result: CvMat, method: number) => void;
  minMaxLoc: (src: CvMat) => CvMinMaxResult;
}

// Top-level eager import to avoid dynamic-import deadlock when called from pipeline.
// The WASM binary loads once at module initialization. This adds ~50ms to startup
// but is necessary because dynamic import('opencv-wasm') from within async functions
// deadlocks in certain module resolution scenarios.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _opencvWasmModule: any;
try {
  _opencvWasmModule = await import('opencv-wasm');
} catch {
  // opencv-wasm may not be available in all environments
  _opencvWasmModule = null;
}

function getOpenCV(): CvModule {
  if (!_opencvWasmModule) {
    throw new Error('opencv-wasm is not available. Install it with: npm install opencv-wasm');
  }
  return (_opencvWasmModule.cv || _opencvWasmModule.default?.cv) as CvModule;
}

/** Convert RGBA to single-channel Uint8 grayscale for OpenCV. */
function rgbaToGrayU8(data: Uint8Array, width: number, height: number): Uint8Array {
  const len = width * height;
  const gray = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    const pos = i * 4;
    gray[i] = Math.round(data[pos] * 0.299 + data[pos + 1] * 0.587 + data[pos + 2] * 0.114);
  }
  return gray;
}

/** Downsample RGBA image data by a factor using sharp. */
async function downsampleRGBA(
  data: Uint8Array,
  width: number,
  height: number,
  factor: number
): Promise<RawImageData> {
  const newWidth = Math.max(1, Math.round(width / factor));
  const newHeight = Math.max(1, Math.round(height / factor));
  const result = await sharp(Buffer.from(data.buffer, data.byteOffset, data.byteLength), {
    raw: { width, height, channels: 4 },
  })
    .resize(newWidth, newHeight, { kernel: 'lanczos3' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    data: new Uint8Array(result.data.buffer, result.data.byteOffset, result.data.length),
    width: result.info.width,
    height: result.info.height,
  };
}

/**
 * Run OpenCV matchTemplate on grayscale U8 images.
 * Returns the top match position and score.
 */
function opencvMatchTemplate(
  cv: CvModule,
  sceneGray: Uint8Array,
  sceneWidth: number,
  sceneHeight: number,
  templateGray: Uint8Array,
  templateWidth: number,
  templateHeight: number
): Candidate {
  const sceneMat = cv.matFromArray(sceneHeight, sceneWidth, cv.CV_8UC1, sceneGray);
  const templateMat = cv.matFromArray(templateHeight, templateWidth, cv.CV_8UC1, templateGray);
  const resultMat = new cv.Mat(
    sceneHeight - templateHeight + 1,
    sceneWidth - templateWidth + 1,
    cv.CV_32FC1
  );

  try {
    cv.matchTemplate(sceneMat, templateMat, resultMat, cv.TM_CCOEFF_NORMED);
    const minMax = cv.minMaxLoc(resultMat);
    return { x: minMax.maxLoc.x, y: minMax.maxLoc.y, score: minMax.maxVal };
  } finally {
    sceneMat.delete();
    templateMat.delete();
    resultMat.delete();
  }
}

/**
 * Hybrid alignment: OpenCV ZNCC on downsampled images + pixel-level refinement.
 *
 * 1. Downsample both images (scale chosen to keep WASM fast)
 * 2. Run OpenCV TM_CCOEFF_NORMED at reduced resolution (fast, DFT-based)
 * 3. Scale the best match back to full-resolution coordinates
 * 4. Refine in a small neighborhood at full resolution using pixel ZNCC
 *
 * This gives OpenCV-quality accuracy with sub-second performance even on
 * large images (e.g., 1280x900 scene with 600x80 template).
 */
export async function alignImages(
  scene: RawImageData,
  template: RawImageData
): Promise<AlignmentResult> {
  const startTime = performance.now();

  if (template.width > scene.width || template.height > scene.height) {
    throw new Error(
      `Template (${template.width}x${template.height}) is larger than scene ` +
        `(${scene.width}x${scene.height}) in at least one dimension.`
    );
  }

  const cv = getOpenCV();

  // Choose downscale factor to keep WASM fast
  // Target: keep the result matrix under ~100K pixels for WASM performance
  const resultW = scene.width - template.width + 1;
  const resultH = scene.height - template.height + 1;
  const resultPixels = resultW * resultH;
  const MAX_RESULT_PIXELS = 100_000;

  let scale: number;
  if (resultPixels <= MAX_RESULT_PIXELS) {
    scale = 1;
  } else {
    scale = Math.ceil(Math.sqrt(resultPixels / MAX_RESULT_PIXELS));
  }

  console.error(
    `[alignment] Search space: ${resultW}x${resultH} = ${resultPixels} positions, scale=1/${scale}`
  );

  let coarseX: number;
  let coarseY: number;
  let coarseScore: number;

  if (scale === 1) {
    // Small enough for direct OpenCV at full resolution
    const sceneGray = rgbaToGrayU8(scene.data, scene.width, scene.height);
    const templateGray = rgbaToGrayU8(template.data, template.width, template.height);
    const match = opencvMatchTemplate(
      cv,
      sceneGray,
      scene.width,
      scene.height,
      templateGray,
      template.width,
      template.height
    );
    coarseX = match.x;
    coarseY = match.y;
    coarseScore = match.score;
  } else {
    // Downsample and run OpenCV
    const smallScene = await downsampleRGBA(scene.data, scene.width, scene.height, scale);
    const smallTemplate = await downsampleRGBA(
      template.data,
      template.width,
      template.height,
      scale
    );

    const sceneGray = rgbaToGrayU8(smallScene.data, smallScene.width, smallScene.height);
    const templateGray = rgbaToGrayU8(
      smallTemplate.data,
      smallTemplate.width,
      smallTemplate.height
    );
    const match = opencvMatchTemplate(
      cv,
      sceneGray,
      smallScene.width,
      smallScene.height,
      templateGray,
      smallTemplate.width,
      smallTemplate.height
    );

    // Scale back to full resolution
    coarseX = Math.round(match.x * scale);
    coarseY = Math.round(match.y * scale);
    coarseScore = match.score;
  }

  console.error(
    `[alignment] Coarse match: (${coarseX}, ${coarseY}) score=${coarseScore.toFixed(3)}`
  );

  // Refine at full resolution using pixel ZNCC in a neighborhood
  const sceneGrayFull = toGrayscale(scene.data, scene.width, scene.height);
  const templateGrayFull = toGrayscale(template.data, template.width, template.height);

  const maxX = scene.width - template.width;
  const maxY = scene.height - template.height;
  const radius = Math.max(scale + 1, 3); // Search ±radius around coarse position

  let bestX = Math.min(maxX, Math.max(0, coarseX));
  let bestY = Math.min(maxY, Math.max(0, coarseY));
  let bestScore = -Infinity;

  const startRX = Math.max(0, coarseX - radius);
  const endRX = Math.min(maxX, coarseX + radius);
  const startRY = Math.max(0, coarseY - radius);
  const endRY = Math.min(maxY, coarseY + radius);

  for (let y = startRY; y <= endRY; y++) {
    for (let x = startRX; x <= endRX; x++) {
      const score = znccAtPosition(
        sceneGrayFull,
        scene.width,
        templateGrayFull,
        template.width,
        template.height,
        x,
        y
      );
      if (score > bestScore) {
        bestScore = score;
        bestX = x;
        bestY = y;
      }
    }
  }

  const timeMs = performance.now() - startTime;
  const confidence = Math.max(0, Math.min(1, (bestScore + 1) / 2));

  console.error(
    `[alignment] Final: (${bestX}, ${bestY}) confidence=${confidence.toFixed(3)} time=${Math.round(timeMs)}ms`
  );

  return {
    x: bestX,
    y: bestY,
    confidence: Math.round(confidence * 1000) / 1000,
    strategy: 'opencv-zncc-hybrid',
    timeMs: Math.round(timeMs * 100) / 100,
  };
}

// ============================================================================
// Alternative: Pure multi-scale edge-weighted search (no OpenCV dependency)
// ============================================================================

/**
 * Multi-scale edge-weighted alignment strategy.
 * Kept as an alternative that doesn't require opencv-wasm.
 */
export function alignMultiScale(scene: RawImageData, template: RawImageData): AlignmentResult {
  const startTime = performance.now();

  if (template.width > scene.width || template.height > scene.height) {
    throw new Error(
      `Template (${template.width}x${template.height}) is larger than scene ` +
        `(${scene.width}x${scene.height}) in at least one dimension.`
    );
  }

  const sceneGray = toGrayscale(scene.data, scene.width, scene.height);
  const templateGray = toGrayscale(template.data, template.width, template.height);
  const sceneEdges = sobelEdges(sceneGray, scene.width, scene.height);
  const templateEdges = sobelEdges(templateGray, template.width, template.height);

  const searchW = scene.width - template.width + 1;
  const searchH = scene.height - template.height + 1;
  const searchPositions = searchW * searchH;

  let factor: number;
  if (searchPositions <= 50000) {
    factor = 1;
  } else if (searchPositions <= 200000) {
    factor = 2;
  } else if (searchPositions <= 800000) {
    factor = 4;
  } else {
    factor = Math.min(8, Math.ceil(Math.sqrt(searchPositions / 50000)));
  }

  console.error(
    `[alignment:multi-scale] Search: ${searchW}x${searchH} = ${searchPositions} positions, factor=${factor}`
  );

  let bestCandidate: Candidate;

  if (factor === 1) {
    bestCandidate = exhaustiveSearch(
      sceneEdges,
      scene.width,
      scene.height,
      templateEdges,
      template.width,
      template.height,
      sceneGray,
      templateGray
    );
  } else {
    const coarseScene = downsample(sceneEdges, scene.width, scene.height, factor);
    const coarseTemplate = downsample(templateEdges, template.width, template.height, factor);

    const coarseCandidates = topKSearch(
      coarseScene.data,
      coarseScene.width,
      coarseScene.height,
      coarseTemplate.data,
      coarseTemplate.width,
      coarseTemplate.height,
      10
    );

    console.error(
      `[alignment:multi-scale] ${coarseCandidates.length} coarse candidates, refining...`
    );

    bestCandidate = refineCoarseCandidates(
      coarseCandidates,
      factor,
      sceneEdges,
      scene.width,
      scene.height,
      templateEdges,
      template.width,
      template.height,
      sceneGray,
      templateGray
    );
  }

  const timeMs = performance.now() - startTime;
  const confidence = Math.max(0, Math.min(1, (bestCandidate.score + 1) / 2));

  console.error(
    `[alignment:multi-scale] Result: (${bestCandidate.x}, ${bestCandidate.y}) ` +
      `confidence=${confidence.toFixed(3)} time=${Math.round(timeMs)}ms`
  );

  return {
    x: bestCandidate.x,
    y: bestCandidate.y,
    confidence: Math.round(confidence * 1000) / 1000,
    strategy: 'multi-scale',
    timeMs: Math.round(timeMs * 100) / 100,
  };
}

/** Exhaustive search using combined edge + pixel ZNCC. */
function exhaustiveSearch(
  sceneEdges: Float32Array,
  sceneWidth: number,
  sceneHeight: number,
  templateEdges: Float32Array,
  templateWidth: number,
  templateHeight: number,
  sceneGray: Float32Array,
  templateGray: Float32Array
): Candidate {
  const maxX = sceneWidth - templateWidth;
  const maxY = sceneHeight - templateHeight;
  let best: Candidate = { x: 0, y: 0, score: -Infinity };

  for (let y = 0; y <= maxY; y++) {
    for (let x = 0; x <= maxX; x++) {
      const edgeScore = znccAtPosition(
        sceneEdges,
        sceneWidth,
        templateEdges,
        templateWidth,
        templateHeight,
        x,
        y
      );
      const pixelScore = znccAtPosition(
        sceneGray,
        sceneWidth,
        templateGray,
        templateWidth,
        templateHeight,
        x,
        y
      );
      const combined = edgeScore * 0.7 + pixelScore * 0.3;
      if (combined > best.score) {
        best = { x, y, score: combined };
      }
    }
  }

  return best;
}

/** Find top-K candidates using ZNCC on a single channel (edges). */
function topKSearch(
  sceneData: Float32Array,
  sceneWidth: number,
  sceneHeight: number,
  templateData: Float32Array,
  templateWidth: number,
  templateHeight: number,
  topK: number
): Candidate[] {
  const maxX = sceneWidth - templateWidth;
  const maxY = sceneHeight - templateHeight;

  if (maxX < 0 || maxY < 0) {
    return [{ x: 0, y: 0, score: 0 }];
  }

  const candidates: Candidate[] = [];

  for (let y = 0; y <= maxY; y++) {
    for (let x = 0; x <= maxX; x++) {
      const score = znccAtPosition(
        sceneData,
        sceneWidth,
        templateData,
        templateWidth,
        templateHeight,
        x,
        y
      );
      candidates.push({ x, y, score });
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  const minDist = Math.max(2, Math.floor(Math.min(templateWidth, templateHeight) / 4));
  const filtered: Candidate[] = [];
  for (const c of candidates) {
    if (filtered.length >= topK) break;
    const tooClose = filtered.some(
      (f) => Math.abs(f.x - c.x) <= minDist && Math.abs(f.y - c.y) <= minDist
    );
    if (!tooClose) {
      filtered.push(c);
    }
  }

  return filtered;
}

/** Refine coarse candidates at full resolution with combined edge + pixel score. */
function refineCoarseCandidates(
  coarseCandidates: Candidate[],
  factor: number,
  sceneEdges: Float32Array,
  sceneWidth: number,
  sceneHeight: number,
  templateEdges: Float32Array,
  templateWidth: number,
  templateHeight: number,
  sceneGray: Float32Array,
  templateGray: Float32Array
): Candidate {
  const maxX = sceneWidth - templateWidth;
  const maxY = sceneHeight - templateHeight;
  const radius = factor + 1;
  let best: Candidate = { x: 0, y: 0, score: -Infinity };

  for (const candidate of coarseCandidates) {
    const centerX = candidate.x * factor;
    const centerY = candidate.y * factor;

    const startX = Math.max(0, centerX - radius);
    const endX = Math.min(maxX, centerX + radius);
    const startY = Math.max(0, centerY - radius);
    const endY = Math.min(maxY, centerY + radius);

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        const edgeScore = znccAtPosition(
          sceneEdges,
          sceneWidth,
          templateEdges,
          templateWidth,
          templateHeight,
          x,
          y
        );
        const pixelScore = znccAtPosition(
          sceneGray,
          sceneWidth,
          templateGray,
          templateWidth,
          templateHeight,
          x,
          y
        );
        const combined = edgeScore * 0.7 + pixelScore * 0.3;
        if (combined > best.score) {
          best = { x, y, score: combined };
        }
      }
    }
  }

  return best;
}
