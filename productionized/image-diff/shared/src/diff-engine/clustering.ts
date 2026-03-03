/**
 * Connected Component Labeling (CCL) for grouping adjacent diff pixels into clusters.
 *
 * Uses the classic two-pass algorithm with Union-Find (disjoint set) for
 * 8-connectivity labeling. This groups spatially adjacent diff pixels into
 * distinct clusters, each with bounding box coordinates and statistics.
 */

export interface DiffCluster {
  /** Unique cluster ID */
  id: number;
  /** Bounding box: leftmost X coordinate */
  left: number;
  /** Bounding box: topmost Y coordinate */
  top: number;
  /** Bounding box: rightmost X coordinate */
  right: number;
  /** Bounding box: bottommost Y coordinate */
  bottom: number;
  /** Bounding box width in pixels */
  width: number;
  /** Bounding box height in pixels */
  height: number;
  /** Number of differing pixels in this cluster */
  pixelCount: number;
  /** Total image pixels for reference */
  totalImagePixels: number;
  /** Percentage of total image area this cluster covers */
  areaPercentage: number;
  /** Mean diff intensity across cluster pixels (0.0-1.0) */
  meanIntensity: number;
  /** Maximum diff intensity in this cluster (0.0-1.0) */
  maxIntensity: number;
  /** Severity rating based on size and intensity */
  severity: 'trivial' | 'minor' | 'moderate' | 'major';
}

/** Metadata about the clustering pass — what gap was used and suggestions for tuning. */
export interface ClusteringMeta {
  /** The cluster_gap value that was actually applied. */
  gapUsed: number;
  /** Whether the gap was auto-computed (true) or explicitly provided by the caller (false). */
  autoGap: boolean;
  /** Suggestion: a smaller gap that would produce more (finer-grained) clusters, or null if already at 0. */
  suggestedSmallerGap: number | null;
  /** Suggestion: a larger gap that would merge more clusters together, or null if already at maximum. */
  suggestedLargerGap: number | null;
}

/** Return value from findDiffClusters including both clusters and clustering metadata. */
export interface ClusteringResult {
  clusters: DiffCluster[];
  clusteringMeta: ClusteringMeta;
}

/**
 * Find clusters of differing pixels using Connected Component Labeling.
 *
 * @param intensityMap Per-pixel intensity map from pixel-diff (0.0 = match, >0.0 = diff, -1.0 = AA)
 * @param width Image width
 * @param height Image height
 * @param minClusterSize Minimum pixel count to include a cluster (filters noise). Default: 1
 * @param clusterGap Maximum pixel distance between bounding boxes to merge nearby clusters.
 *   - undefined (default): auto-compute the optimal gap using natural breaks in cluster distances
 *   - 0: no merging (pixel-precise clusters)
 *   - >0: explicit gap value
 */
export function findDiffClusters(
  intensityMap: Float32Array,
  width: number,
  height: number,
  minClusterSize: number = 1,
  clusterGap?: number
): ClusteringResult {
  const len = width * height;
  const labels = new Int32Array(len);
  // Union-Find parent array. Index 0 is unused (label 0 = background).
  const parent: number[] = [0];
  let nextLabel = 1;

  console.error(`[clustering] Starting CCL on ${width}x${height} image (${len} pixels)`);

  // ---- Pass 1: Assign provisional labels ----
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;

      // Only consider pixels with positive intensity (actual diffs, not AA)
      if (intensityMap[i] <= 0) continue;

      // Collect labels from already-scanned neighbors (8-connectivity)
      // For top-to-bottom, left-to-right scan, these are: N, NE, NW, W
      const neighbors: number[] = [];

      // NW
      if (x > 0 && y > 0) {
        const nl = labels[(y - 1) * width + (x - 1)];
        if (nl > 0) neighbors.push(nl);
      }
      // N
      if (y > 0) {
        const nl = labels[(y - 1) * width + x];
        if (nl > 0) neighbors.push(nl);
      }
      // NE
      if (x < width - 1 && y > 0) {
        const nl = labels[(y - 1) * width + (x + 1)];
        if (nl > 0) neighbors.push(nl);
      }
      // W
      if (x > 0) {
        const nl = labels[y * width + (x - 1)];
        if (nl > 0) neighbors.push(nl);
      }

      if (neighbors.length === 0) {
        // New label
        labels[i] = nextLabel;
        parent.push(nextLabel);
        nextLabel++;
      } else {
        // Find minimum root label among neighbors
        let minLabel = Infinity;
        for (const n of neighbors) {
          const root = find(parent, n);
          if (root < minLabel) minLabel = root;
        }
        labels[i] = minLabel;
        // Union all neighbor labels together
        for (const n of neighbors) {
          union(parent, minLabel, n);
        }
      }
    }
  }

  // ---- Pass 2: Resolve labels to their root representatives ----
  for (let i = 0; i < len; i++) {
    if (labels[i] > 0) {
      labels[i] = find(parent, labels[i]);
    }
  }

  // ---- Collect cluster statistics ----
  const clusterMap = new Map<
    number,
    {
      left: number;
      top: number;
      right: number;
      bottom: number;
      pixelCount: number;
      totalIntensity: number;
      maxIntensity: number;
    }
  >();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const label = labels[i];
      if (label <= 0) continue;

      const intensity = intensityMap[i];
      let cluster = clusterMap.get(label);
      if (!cluster) {
        cluster = {
          left: x,
          top: y,
          right: x,
          bottom: y,
          pixelCount: 0,
          totalIntensity: 0,
          maxIntensity: 0,
        };
        clusterMap.set(label, cluster);
      }

      cluster.left = Math.min(cluster.left, x);
      cluster.top = Math.min(cluster.top, y);
      cluster.right = Math.max(cluster.right, x);
      cluster.bottom = Math.max(cluster.bottom, y);
      cluster.pixelCount++;
      cluster.totalIntensity += intensity;
      cluster.maxIntensity = Math.max(cluster.maxIntensity, intensity);
    }
  }

  // ---- Build intermediate cluster stats, filtering by minimum size ----
  const filteredStats: ClusterStats[] = [];
  for (const stats of clusterMap.values()) {
    if (stats.pixelCount < minClusterSize) continue;
    filteredStats.push({ ...stats });
  }

  const rawCount = clusterMap.size;

  // ---- Determine effective gap ----
  const autoGap = clusterGap === undefined;
  let effectiveGap: number;
  // All pairwise distances for gap suggestions
  let allDistances: number[] = [];

  if (autoGap && filteredStats.length > 1) {
    // Compute the natural gap from nearest-neighbor distance analysis
    const { naturalGap, distances } = computeNaturalGap(filteredStats, width, height);
    effectiveGap = naturalGap;
    allDistances = distances;
    console.error(`[clustering] Auto-computed natural gap: ${effectiveGap}`);
  } else {
    effectiveGap = clusterGap ?? 0;
    if (filteredStats.length > 1) {
      allDistances = computePairwiseDistances(filteredStats);
    }
  }

  // ---- Gap-based merging: merge clusters whose bounding boxes are within effectiveGap pixels ----
  if (effectiveGap > 0 && filteredStats.length > 1) {
    let merged = true;
    while (merged) {
      merged = false;
      for (let i = 0; i < filteredStats.length; i++) {
        for (let j = i + 1; j < filteredStats.length; j++) {
          const a = filteredStats[i];
          const b = filteredStats[j];

          // Calculate edge-to-edge gap between bounding boxes (0 if overlapping)
          const horizDist = Math.max(0, Math.max(a.left, b.left) - Math.min(a.right, b.right) - 1);
          const vertDist = Math.max(0, Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom) - 1);
          const dist = Math.max(horizDist, vertDist);

          if (dist <= effectiveGap) {
            // Merge b into a
            a.left = Math.min(a.left, b.left);
            a.top = Math.min(a.top, b.top);
            a.right = Math.max(a.right, b.right);
            a.bottom = Math.max(a.bottom, b.bottom);
            a.pixelCount += b.pixelCount;
            a.totalIntensity += b.totalIntensity;
            a.maxIntensity = Math.max(a.maxIntensity, b.maxIntensity);

            filteredStats.splice(j, 1);
            merged = true;
            break;
          }
        }
        if (merged) break;
      }
    }
  }

  // ---- Compute gap suggestions ----
  const clusteringMeta = buildClusteringMeta(
    effectiveGap,
    autoGap,
    allDistances,
    filteredStats.length
  );

  // ---- Build output clusters ----
  const clusters: DiffCluster[] = [];
  let id = 1;

  for (const stats of filteredStats) {
    const clusterWidth = stats.right - stats.left + 1;
    const clusterHeight = stats.bottom - stats.top + 1;
    const meanIntensity = stats.totalIntensity / stats.pixelCount;
    const areaPercentage = (stats.pixelCount / len) * 100;

    // Severity based on area percentage and intensity
    const severity = classifySeverity(areaPercentage, meanIntensity);

    clusters.push({
      id: id++,
      left: stats.left,
      top: stats.top,
      right: stats.right,
      bottom: stats.bottom,
      width: clusterWidth,
      height: clusterHeight,
      pixelCount: stats.pixelCount,
      totalImagePixels: len,
      areaPercentage: Math.round(areaPercentage * 1000) / 1000,
      meanIntensity: Math.round(meanIntensity * 1000) / 1000,
      maxIntensity: Math.round(stats.maxIntensity * 1000) / 1000,
      severity,
    });
  }

  // Sort by pixel count descending (largest clusters first)
  clusters.sort((a, b) => b.pixelCount - a.pixelCount);

  // Re-assign IDs after sorting
  clusters.forEach((c, i) => (c.id = i + 1));

  const gapNote = effectiveGap > 0 ? `, clusterGap=${effectiveGap}${autoGap ? ' (auto)' : ''}` : '';
  console.error(
    `[clustering] Found ${rawCount} raw clusters, ` +
      `${clusters.length} after filtering (minClusterSize=${minClusterSize}${gapNote})`
  );

  return { clusters, clusteringMeta };
}

// ---- Natural gap computation ----

type ClusterStats = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  pixelCount: number;
  totalIntensity: number;
  maxIntensity: number;
};

/**
 * Compute the bounding-box distance between two cluster stats.
 */
function clusterDistance(a: ClusterStats, b: ClusterStats): number {
  const horizDist = Math.max(0, Math.max(a.left, b.left) - Math.min(a.right, b.right) - 1);
  const vertDist = Math.max(0, Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom) - 1);
  return Math.max(horizDist, vertDist);
}

/**
 * Compute pairwise bounding-box distances between clusters.
 * Returns sorted ascending.
 */
function computePairwiseDistances(stats: ClusterStats[]): number[] {
  const distances: number[] = [];
  for (let i = 0; i < stats.length; i++) {
    for (let j = i + 1; j < stats.length; j++) {
      distances.push(clusterDistance(stats[i], stats[j]));
    }
  }
  distances.sort((a, b) => a - b);
  return distances;
}

/**
 * Compute nearest-neighbor distances for each cluster, sorted ascending.
 * For each cluster, this is the distance to its closest neighbor.
 */
function computeNearestNeighborDistances(stats: ClusterStats[]): number[] {
  const nnDistances: number[] = [];
  for (let i = 0; i < stats.length; i++) {
    let minDist = Infinity;
    for (let j = 0; j < stats.length; j++) {
      if (i === j) continue;
      const d = clusterDistance(stats[i], stats[j]);
      if (d < minDist) minDist = d;
    }
    if (minDist !== Infinity) {
      nnDistances.push(minDist);
    }
  }
  nnDistances.sort((a, b) => a - b);
  return nnDistances;
}

/**
 * Find the "natural gap" using nearest-neighbor distance analysis with
 * dimension-aware fallback.
 *
 * **Strategy:**
 * 1. Compute each cluster's distance to its nearest neighbor.
 * 2. Sort these distances and look for the largest jump — a natural break
 *    between "same region" and "different region" distances.
 * 3. If a clear break exists (jump ≥ 2px), use the distance before the jump.
 * 4. If no clear break exists (uniformly distributed diffs like font changes
 *    or layout shifts), fall back to a dimension-aware heuristic: use 3% of
 *    the smaller image dimension. This groups glyphs into words (~24px on
 *    an 800px image) and nearby UI elements into regions.
 */
function computeNaturalGap(
  stats: ClusterStats[],
  imageWidth?: number,
  imageHeight?: number
): {
  naturalGap: number;
  distances: number[];
} {
  const distances = computePairwiseDistances(stats);
  const nnDistances = computeNearestNeighborDistances(stats);

  if (nnDistances.length <= 1) {
    // 0 or 1 cluster — no merging possible or only one pair
    return { naturalGap: nnDistances.length === 1 ? nnDistances[0] : 0, distances };
  }

  // If all nn-distances are 0 (overlapping clusters), no merging needed
  if (nnDistances[nnDistances.length - 1] === 0) {
    return { naturalGap: 0, distances };
  }

  // Find the largest jump in sorted nearest-neighbor distances.
  let bestJumpIdx = -1;
  let bestJumpSize = 0;

  for (let i = 0; i < nnDistances.length - 1; i++) {
    const current = nnDistances[i];
    const next = nnDistances[i + 1];
    const jump = next - current;

    if (jump > bestJumpSize) {
      bestJumpSize = jump;
      bestJumpIdx = i;
    }
  }

  if (bestJumpIdx >= 0 && bestJumpSize >= 2) {
    // Clear natural break found — use it
    const naturalGap = nnDistances[bestJumpIdx];
    return { naturalGap, distances };
  }

  // No clear natural break — fall back to dimension-aware heuristic.
  // Use 3% of the smaller image dimension, clamped to [5, 50].
  if (imageWidth !== undefined && imageHeight !== undefined) {
    const smallerDim = Math.min(imageWidth, imageHeight);
    const dimensionGap = Math.round(smallerDim * 0.03);
    const naturalGap = Math.max(5, Math.min(50, dimensionGap));
    console.error(
      `[clustering] No clear natural break in NN distances (max jump=${bestJumpSize}), ` +
        `using dimension-based fallback: ${naturalGap}px (3% of ${smallerDim}px)`
    );
    return { naturalGap, distances };
  }

  // No dimensions available — use the 90th percentile of nn-distances
  const p90Idx = Math.floor(nnDistances.length * 0.9);
  const naturalGap = nnDistances[p90Idx];
  return { naturalGap, distances };
}

/**
 * Build clustering metadata with gap suggestions.
 *
 * Suggestions are computed by finding the next "natural break" in each direction:
 * - Smaller gap: the largest distance that is strictly less than the current gap
 * - Larger gap: the smallest distance that is strictly greater than the current gap
 */
function buildClusteringMeta(
  gapUsed: number,
  autoGap: boolean,
  distances: number[],
  _currentClusterCount: number
): ClusteringMeta {
  let suggestedSmallerGap: number | null = null;
  let suggestedLargerGap: number | null = null;

  if (distances.length > 0) {
    // Unique distances sorted ascending
    const unique = [...new Set(distances)].sort((a, b) => a - b);

    // Find the next step down: the largest unique distance < gapUsed
    for (let i = unique.length - 1; i >= 0; i--) {
      if (unique[i] < gapUsed) {
        suggestedSmallerGap = unique[i];
        break;
      }
    }
    // If no smaller distance found but gapUsed > 0, suggest 0
    if (suggestedSmallerGap === null && gapUsed > 0) {
      suggestedSmallerGap = 0;
    }

    // Find the next step up: the smallest unique distance > gapUsed
    for (const d of unique) {
      if (d > gapUsed) {
        suggestedLargerGap = d;
        break;
      }
    }
  }

  return {
    gapUsed,
    autoGap,
    suggestedSmallerGap,
    suggestedLargerGap,
  };
}

/** Classify severity based on area coverage and color intensity. */
function classifySeverity(
  areaPercentage: number,
  meanIntensity: number
): 'trivial' | 'minor' | 'moderate' | 'major' {
  // Combined score: area weight + intensity weight
  // Area: >1% is significant, >5% is major
  // Intensity: >0.3 is moderate, >0.6 is high
  const score = areaPercentage * 10 + meanIntensity * 50;

  if (score >= 30) return 'major';
  if (score >= 10) return 'moderate';
  if (score >= 3) return 'minor';
  return 'trivial';
}

// ---- Union-Find helpers ----

function find(parent: number[], x: number): number {
  while (parent[x] !== x) {
    parent[x] = parent[parent[x]]; // Path compression
    x = parent[x];
  }
  return x;
}

function union(parent: number[], a: number, b: number): void {
  const ra = find(parent, a);
  const rb = find(parent, b);
  if (ra !== rb) parent[rb] = ra;
}
