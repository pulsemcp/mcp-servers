/**
 * Image diff engine entry point.
 *
 * Orchestrates the full pipeline:
 * 1. Load and normalize images with sharp (decode, ensure RGBA)
 * 2. Validate dimensions match
 * 3. Run pixel-level comparison (forked pixelmatch algorithm)
 * 4. Cluster diff regions using Connected Component Labeling
 * 5. Generate heatmap visualization
 */

import sharp from 'sharp';
import { existsSync } from 'fs';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { pixelDiff } from './pixel-diff.js';
import type { PixelDiffOptions } from './pixel-diff.js';
import { findDiffClusters } from './clustering.js';
import type { DiffCluster } from './clustering.js';
import { generateHeatmap, generateCompositeHeatmap } from './heatmap.js';

export type { DiffCluster } from './clustering.js';
export type { PixelDiffOptions, PixelDiffResult } from './pixel-diff.js';

export interface ImageDiffOptions {
  /** Pixel matching threshold (0 to 1); smaller is more sensitive. Default: 0.1 */
  threshold?: number;
  /** Whether to count anti-aliased pixels as diffs. Default: false */
  includeAA?: boolean;
  /** Minimum cluster size in pixels to include in results. Default: 4 */
  minClusterSize?: number;
  /** Directory to save heatmap output. Default: os.tmpdir() */
  outputDir?: string;
  /** Whether to generate the composite heatmap (overlaid on source). Default: true */
  generateComposite?: boolean;
}

export interface ImageDiffResult {
  /** Whether the images are identical (zero diff pixels and zero clusters) */
  identical: boolean;
  /** Overall diff summary */
  summary: {
    totalPixels: number;
    diffPixels: number;
    diffPercentage: number;
    antiAliasedPixels: number;
    matchingPixels: number;
    clusterCount: number;
    /** Quick human-readable summary */
    description: string;
  };
  /** Array of diff clusters, sorted by size (largest first) */
  clusters: DiffCluster[];
  /** Path to the standalone heatmap image (transparent background) */
  heatmapPath: string;
  /** Path to the composite heatmap (overlaid on source image), if generated */
  compositePath?: string;
  /** Dimensions of the compared images */
  dimensions: {
    width: number;
    height: number;
  };
}

/**
 * Compare two images and produce a structured diff result with heatmap.
 *
 * @param sourcePath Path to the source/reference image
 * @param targetPath Path to the target/comparison image
 * @param options Configuration options
 */
export async function diffImages(
  sourcePath: string,
  targetPath: string,
  options: ImageDiffOptions = {}
): Promise<ImageDiffResult> {
  const {
    threshold = 0.1,
    includeAA = false,
    minClusterSize = 4,
    outputDir = tmpdir(),
    generateComposite = true,
  } = options;

  console.error(`[diff-engine] Starting image diff`);
  console.error(`[diff-engine]   source: ${sourcePath}`);
  console.error(`[diff-engine]   target: ${targetPath}`);
  console.error(
    `[diff-engine]   options: threshold=${threshold}, includeAA=${includeAA}, minClusterSize=${minClusterSize}`
  );

  // Validate inputs
  if (!existsSync(sourcePath)) {
    throw new Error(`Source image not found: ${sourcePath}`);
  }
  if (!existsSync(targetPath)) {
    throw new Error(`Target image not found: ${targetPath}`);
  }

  // Step 1: Load images and extract raw RGBA buffers
  console.error('[diff-engine] Loading images...');
  const [sourceData, targetData] = await Promise.all([
    sharp(sourcePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(targetPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);

  const { width: w1, height: h1 } = sourceData.info;
  const { width: w2, height: h2 } = targetData.info;

  console.error(`[diff-engine] Source: ${w1}x${h1}, Target: ${w2}x${h2}`);

  // Step 2: Validate dimensions match
  if (w1 !== w2 || h1 !== h2) {
    throw new Error(
      `Image dimensions do not match. Source: ${w1}x${h1}, Target: ${w2}x${h2}. ` +
        `Both images must have identical dimensions.`
    );
  }

  const width = w1;
  const height = h1;

  // Step 2b: Guard against extremely large images that could OOM
  const MAX_PIXELS = 100_000_000; // ~10K x 10K
  const totalPixels = width * height;
  if (totalPixels > MAX_PIXELS) {
    throw new Error(
      `Image too large: ${width}x${height} = ${totalPixels.toLocaleString()} pixels. ` +
        `Maximum supported: ${MAX_PIXELS.toLocaleString()} pixels.`
    );
  }

  // Step 3: Run pixel-level comparison
  console.error('[diff-engine] Running pixel comparison...');
  const pixelDiffOptions: PixelDiffOptions = { threshold, includeAA };
  const diffResult = pixelDiff(
    new Uint8Array(sourceData.data.buffer, sourceData.data.byteOffset, sourceData.data.length),
    new Uint8Array(targetData.data.buffer, targetData.data.byteOffset, targetData.data.length),
    width,
    height,
    pixelDiffOptions
  );

  // Step 4: Cluster diff regions
  console.error('[diff-engine] Clustering diff regions...');
  const clusters = findDiffClusters(diffResult.intensityMap, width, height, minClusterSize);

  // Step 5: Generate heatmap output
  console.error('[diff-engine] Generating heatmap...');
  const outputSubDir = join(outputDir, 'image-diff-output');
  await mkdir(outputSubDir, { recursive: true });

  const timestamp = Date.now();
  const heatmapPath = join(outputSubDir, `heatmap-${timestamp}.png`);
  const heatmapBuffer = await generateHeatmap(diffResult.intensityMap, width, height);
  await writeFile(heatmapPath, heatmapBuffer);
  console.error(`[diff-engine] Heatmap saved to: ${heatmapPath}`);

  let compositePath: string | undefined;
  if (generateComposite) {
    compositePath = join(outputSubDir, `composite-${timestamp}.png`);
    const compositeBuffer = await generateCompositeHeatmap(
      sourcePath,
      diffResult.intensityMap,
      width,
      height
    );
    await writeFile(compositePath, compositeBuffer);
    console.error(`[diff-engine] Composite heatmap saved to: ${compositePath}`);
  }

  // Build summary description
  const description = buildDescription(diffResult.diffPercentage, diffResult.diffCount, clusters);

  const result: ImageDiffResult = {
    identical: diffResult.diffCount === 0 && clusters.length === 0,
    summary: {
      totalPixels: diffResult.totalPixels,
      diffPixels: diffResult.diffCount,
      diffPercentage: Math.round(diffResult.diffPercentage * 1000) / 1000,
      antiAliasedPixels: diffResult.aaCount,
      matchingPixels: diffResult.matchCount,
      clusterCount: clusters.length,
      description,
    },
    clusters,
    heatmapPath,
    compositePath,
    dimensions: { width, height },
  };

  console.error(`[diff-engine] Done. ${clusters.length} clusters found. ${description}`);

  return result;
}

function buildDescription(
  diffPercentage: number,
  diffPixels: number,
  clusters: DiffCluster[]
): string {
  if (clusters.length === 0 && diffPixels === 0) {
    return 'Images are identical (no differences detected).';
  }
  if (clusters.length === 0) {
    return `${diffPixels} isolated diff pixel(s) found but all filtered by minClusterSize. No significant clusters.`;
  }

  const majorClusters = clusters.filter((c) => c.severity === 'major');
  const moderateClusters = clusters.filter((c) => c.severity === 'moderate');
  const minorClusters = clusters.filter((c) => c.severity === 'minor');
  const trivialClusters = clusters.filter((c) => c.severity === 'trivial');

  const parts: string[] = [];
  parts.push(
    `${diffPercentage.toFixed(2)}% of pixels differ across ${clusters.length} cluster(s).`
  );

  const severityParts: string[] = [];
  if (majorClusters.length > 0) severityParts.push(`${majorClusters.length} major`);
  if (moderateClusters.length > 0) severityParts.push(`${moderateClusters.length} moderate`);
  if (minorClusters.length > 0) severityParts.push(`${minorClusters.length} minor`);
  if (trivialClusters.length > 0) severityParts.push(`${trivialClusters.length} trivial`);

  if (severityParts.length > 0) {
    parts.push(`Severity breakdown: ${severityParts.join(', ')}.`);
  }

  return parts.join(' ');
}
