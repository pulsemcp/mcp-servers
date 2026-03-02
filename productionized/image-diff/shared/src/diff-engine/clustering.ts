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

/**
 * Find clusters of differing pixels using Connected Component Labeling.
 *
 * @param intensityMap Per-pixel intensity map from pixel-diff (0.0 = match, >0.0 = diff, -1.0 = AA)
 * @param width Image width
 * @param height Image height
 * @param minClusterSize Minimum pixel count to include a cluster (filters noise). Default: 1
 * @param clusterGap Maximum pixel distance between bounding boxes to merge nearby clusters. Default: 0 (no merging). Use 5-20 to group nearby diff regions (e.g. glyph fragments in a word).
 */
export function findDiffClusters(
  intensityMap: Float32Array,
  width: number,
  height: number,
  minClusterSize: number = 1,
  clusterGap: number = 0
): DiffCluster[] {
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
  type ClusterStats = {
    left: number;
    top: number;
    right: number;
    bottom: number;
    pixelCount: number;
    totalIntensity: number;
    maxIntensity: number;
  };

  const filteredStats: ClusterStats[] = [];
  for (const stats of clusterMap.values()) {
    if (stats.pixelCount < minClusterSize) continue;
    filteredStats.push({ ...stats });
  }

  const rawCount = clusterMap.size;

  // ---- Gap-based merging: merge clusters whose bounding boxes are within clusterGap pixels ----
  if (clusterGap > 0 && filteredStats.length > 1) {
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

          if (horizDist <= clusterGap && vertDist <= clusterGap) {
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

  const gapNote = clusterGap > 0 ? `, clusterGap=${clusterGap}` : '';
  console.error(
    `[clustering] Found ${rawCount} raw clusters, ` +
      `${clusters.length} after filtering (minClusterSize=${minClusterSize}${gapNote})`
  );

  return clusters;
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
