import { describe, it, expect } from 'vitest';
import { pixelDiff } from '../../shared/src/diff-engine/pixel-diff.js';
import { findDiffClusters } from '../../shared/src/diff-engine/clustering.js';
import { toGrayscale, orderBySize, alignImages } from '../../shared/src/diff-engine/alignment.js';
import type { RawImageData } from '../../shared/src/diff-engine/alignment.js';

describe('pixelDiff', () => {
  it('should detect identical images', () => {
    const width = 4;
    const height = 4;
    const img = new Uint8Array(width * height * 4);
    // Fill with red pixels
    for (let i = 0; i < width * height; i++) {
      img[i * 4] = 255;
      img[i * 4 + 1] = 0;
      img[i * 4 + 2] = 0;
      img[i * 4 + 3] = 255;
    }

    const result = pixelDiff(img, img, width, height);

    expect(result.diffCount).toBe(0);
    expect(result.diffPercentage).toBe(0);
    expect(result.matchCount).toBe(16);
    expect(result.totalPixels).toBe(16);
  });

  it('should detect completely different images', () => {
    const width = 4;
    const height = 4;
    const len = width * height * 4;
    const img1 = new Uint8Array(len);
    const img2 = new Uint8Array(len);

    // Fill img1 with black, img2 with white
    for (let i = 0; i < width * height; i++) {
      img1[i * 4] = 0;
      img1[i * 4 + 1] = 0;
      img1[i * 4 + 2] = 0;
      img1[i * 4 + 3] = 255;

      img2[i * 4] = 255;
      img2[i * 4 + 1] = 255;
      img2[i * 4 + 2] = 255;
      img2[i * 4 + 3] = 255;
    }

    const result = pixelDiff(img1, img2, width, height);

    expect(result.diffCount).toBe(16);
    expect(result.diffPercentage).toBe(100);
    expect(result.matchCount).toBe(0);
  });

  it('should detect a single pixel difference', () => {
    const width = 4;
    const height = 4;
    const len = width * height * 4;
    const img1 = new Uint8Array(len);
    const img2 = new Uint8Array(len);

    // Fill both with black
    for (let i = 0; i < len; i += 4) {
      img1[i] = 0;
      img1[i + 1] = 0;
      img1[i + 2] = 0;
      img1[i + 3] = 255;
      img2[i] = 0;
      img2[i + 1] = 0;
      img2[i + 2] = 0;
      img2[i + 3] = 255;
    }

    // Make one pixel white in img2 (at position 0,0)
    img2[0] = 255;
    img2[1] = 255;
    img2[2] = 255;

    const result = pixelDiff(img1, img2, width, height);

    expect(result.diffCount).toBe(1);
    expect(result.totalPixels).toBe(16);
  });

  it('should populate intensity map with values between 0 and 1', () => {
    const width = 2;
    const height = 2;
    const len = width * height * 4;
    const img1 = new Uint8Array(len);
    const img2 = new Uint8Array(len);

    // Make all pixels black in img1
    for (let i = 0; i < len; i += 4) {
      img1[i + 3] = 255;
      img2[i + 3] = 255;
    }

    // Make pixel 0 white in img2 (max diff)
    img2[0] = 255;
    img2[1] = 255;
    img2[2] = 255;

    const result = pixelDiff(img1, img2, width, height);

    // First pixel should have high intensity
    expect(result.intensityMap[0]).toBeGreaterThan(0);
    expect(result.intensityMap[0]).toBeLessThanOrEqual(1);

    // Other pixels should be 0
    expect(result.intensityMap[1]).toBe(0);
    expect(result.intensityMap[2]).toBe(0);
    expect(result.intensityMap[3]).toBe(0);
  });

  it('should throw on size mismatch', () => {
    const img1 = new Uint8Array(16); // 2x2
    const img2 = new Uint8Array(32); // Wrong size

    expect(() => pixelDiff(img1, img2, 2, 2)).toThrow('Image data size mismatch');
  });
});

describe('findDiffClusters', () => {
  it('should find no clusters in a zero-intensity map', () => {
    const width = 4;
    const height = 4;
    const intensityMap = new Float32Array(width * height); // all zeros

    const { clusters } = findDiffClusters(intensityMap, width, height);

    expect(clusters).toHaveLength(0);
  });

  it('should find one cluster for a single diff pixel', () => {
    const width = 4;
    const height = 4;
    const intensityMap = new Float32Array(width * height);
    // One diff pixel at (1, 1)
    intensityMap[1 * width + 1] = 0.5;

    const { clusters } = findDiffClusters(intensityMap, width, height, 1);

    expect(clusters).toHaveLength(1);
    expect(clusters[0].left).toBe(1);
    expect(clusters[0].top).toBe(1);
    expect(clusters[0].right).toBe(1);
    expect(clusters[0].bottom).toBe(1);
    expect(clusters[0].pixelCount).toBe(1);
  });

  it('should merge adjacent diff pixels into one cluster', () => {
    const width = 4;
    const height = 4;
    const intensityMap = new Float32Array(width * height);
    // 2x2 block at (1,1)
    intensityMap[1 * width + 1] = 0.5;
    intensityMap[1 * width + 2] = 0.5;
    intensityMap[2 * width + 1] = 0.5;
    intensityMap[2 * width + 2] = 0.5;

    const { clusters } = findDiffClusters(intensityMap, width, height, 1);

    expect(clusters).toHaveLength(1);
    expect(clusters[0].left).toBe(1);
    expect(clusters[0].top).toBe(1);
    expect(clusters[0].right).toBe(2);
    expect(clusters[0].bottom).toBe(2);
    expect(clusters[0].pixelCount).toBe(4);
  });

  it('should find two separate clusters when gap is 0', () => {
    const width = 8;
    const height = 8;
    const intensityMap = new Float32Array(width * height);
    // Cluster 1: top-left corner
    intensityMap[0 * width + 0] = 0.8;
    intensityMap[0 * width + 1] = 0.8;
    intensityMap[1 * width + 0] = 0.8;
    intensityMap[1 * width + 1] = 0.8;

    // Cluster 2: bottom-right corner
    intensityMap[6 * width + 6] = 0.3;
    intensityMap[6 * width + 7] = 0.3;
    intensityMap[7 * width + 6] = 0.3;
    intensityMap[7 * width + 7] = 0.3;

    // Use explicit gap=0 to prevent auto-merging
    const { clusters } = findDiffClusters(intensityMap, width, height, 1, 0);

    expect(clusters).toHaveLength(2);
    // Sorted by size descending, both have 4 pixels so order may vary
    const allPixels = clusters.reduce((sum, c) => sum + c.pixelCount, 0);
    expect(allPixels).toBe(8);
  });

  it('should filter clusters below minimum size', () => {
    const width = 4;
    const height = 4;
    const intensityMap = new Float32Array(width * height);
    // Single pixel diff
    intensityMap[0] = 0.5;
    // 4-pixel cluster
    intensityMap[2 * width + 2] = 0.5;
    intensityMap[2 * width + 3] = 0.5;
    intensityMap[3 * width + 2] = 0.5;
    intensityMap[3 * width + 3] = 0.5;

    const { clusters } = findDiffClusters(intensityMap, width, height, 4);

    expect(clusters).toHaveLength(1);
    expect(clusters[0].pixelCount).toBe(4);
  });

  it('should ignore anti-aliased pixels (negative intensity)', () => {
    const width = 4;
    const height = 4;
    const intensityMap = new Float32Array(width * height);
    intensityMap[0] = -1.0; // AA pixel
    intensityMap[1] = 0.5; // Real diff

    const { clusters } = findDiffClusters(intensityMap, width, height, 1);

    expect(clusters).toHaveLength(1);
    expect(clusters[0].pixelCount).toBe(1);
  });

  it('should calculate mean intensity correctly', () => {
    const width = 4;
    const height = 4;
    const intensityMap = new Float32Array(width * height);
    intensityMap[0] = 0.2;
    intensityMap[1] = 0.4;

    const { clusters } = findDiffClusters(intensityMap, width, height, 1);

    expect(clusters).toHaveLength(1);
    expect(clusters[0].meanIntensity).toBeCloseTo(0.3, 2);
    expect(clusters[0].maxIntensity).toBeCloseTo(0.4, 2);
  });

  it('should merge nearby clusters when clusterGap is set', () => {
    const width = 16;
    const height = 4;
    const intensityMap = new Float32Array(width * height);
    // Cluster A at x=0-1
    intensityMap[0 * width + 0] = 0.5;
    intensityMap[0 * width + 1] = 0.5;
    // Cluster B at x=5-6 (gap of 3 pixels from A)
    intensityMap[0 * width + 5] = 0.8;
    intensityMap[0 * width + 6] = 0.8;
    // Cluster C at x=14-15 (gap of 8 pixels from B)
    intensityMap[0 * width + 14] = 0.3;
    intensityMap[0 * width + 15] = 0.3;

    // Without gap merging: 3 separate clusters
    const noGap = findDiffClusters(intensityMap, width, height, 1, 0);
    expect(noGap.clusters).toHaveLength(3);

    // With gap=3: A and B merge (gap exactly 3), C stays separate
    const gap3 = findDiffClusters(intensityMap, width, height, 1, 3);
    expect(gap3.clusters).toHaveLength(2);
    // Merged cluster should span from x=0 to x=6
    const merged = gap3.clusters.find((c) => c.pixelCount === 4);
    expect(merged).toBeDefined();
    expect(merged!.left).toBe(0);
    expect(merged!.right).toBe(6);

    // With gap=10: all three merge into one
    const gap10 = findDiffClusters(intensityMap, width, height, 1, 10);
    expect(gap10.clusters).toHaveLength(1);
    expect(gap10.clusters[0].pixelCount).toBe(6);
    expect(gap10.clusters[0].left).toBe(0);
    expect(gap10.clusters[0].right).toBe(15);
  });

  it('should combine statistics correctly when merging clusters', () => {
    const width = 10;
    const height = 4;
    const intensityMap = new Float32Array(width * height);
    // Cluster A: 2 pixels with intensity 0.2
    intensityMap[0 * width + 0] = 0.2;
    intensityMap[0 * width + 1] = 0.2;
    // Cluster B: 1 pixel with intensity 0.9, gap of 3 from A
    intensityMap[0 * width + 5] = 0.9;

    const { clusters } = findDiffClusters(intensityMap, width, height, 1, 5);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].pixelCount).toBe(3);
    // Mean should be (0.2 + 0.2 + 0.9) / 3 ≈ 0.433
    expect(clusters[0].meanIntensity).toBeCloseTo(0.433, 2);
    expect(clusters[0].maxIntensity).toBeCloseTo(0.9, 2);
  });

  it('should auto-compute gap when clusterGap is undefined', () => {
    // Create 6 clusters in two spatial groups on a large enough image:
    // Group 1 (top): 3 clusters at y=10, x=10/15/20 (nn-dist=3 between each)
    // Group 2 (bottom): 3 clusters at y=180, x=10/15/20 (nn-dist=3 between each)
    // Each cluster's nearest neighbor is within the same group at distance 3.
    // NN distances sorted: [3, 3, 3, 3, 3, 3] — all identical, no jump.
    const width = 200;
    const height = 200;
    const intensityMap = new Float32Array(width * height);
    // Group 1: three clusters near top
    intensityMap[10 * width + 10] = 0.5;
    intensityMap[10 * width + 11] = 0.5;
    intensityMap[10 * width + 15] = 0.8;
    intensityMap[10 * width + 16] = 0.8;
    intensityMap[10 * width + 21] = 0.4;
    intensityMap[10 * width + 22] = 0.4;
    // Group 2: three clusters near bottom
    intensityMap[180 * width + 10] = 0.3;
    intensityMap[180 * width + 11] = 0.3;
    intensityMap[180 * width + 15] = 0.6;
    intensityMap[180 * width + 16] = 0.6;
    intensityMap[180 * width + 21] = 0.7;
    intensityMap[180 * width + 22] = 0.7;

    // NN distances: each cluster's nearest neighbor is 3px away (within group).
    // But the two groups are 170px apart vertically.
    // Sorted NN: [3,3,3,3,3,3] — all identical, no jump.
    // Falls back to dimension heuristic: min(200,200)*0.03 = 6, clamped to max(5,6) = 6.
    // Gap=6 merges within-group clusters (gap=3 ≤ 6) but not between groups (gap=168 > 6).
    const result = findDiffClusters(intensityMap, width, height, 1);
    expect(result.clusteringMeta.autoGap).toBe(true);
    // Dimension fallback: 200 * 0.03 = 6
    expect(result.clusteringMeta.gapUsed).toBe(6);
    // Within each group, clusters merge (gap=3 < 6). Two groups remain separate.
    expect(result.clusters).toHaveLength(2);
  });

  it('should return clustering metadata with suggestions', () => {
    const width = 16;
    const height = 4;
    const intensityMap = new Float32Array(width * height);
    intensityMap[0 * width + 0] = 0.5;
    intensityMap[0 * width + 5] = 0.8;
    intensityMap[0 * width + 14] = 0.3;

    const result = findDiffClusters(intensityMap, width, height, 1, 0);
    expect(result.clusteringMeta.autoGap).toBe(false);
    expect(result.clusteringMeta.gapUsed).toBe(0);
    // Explicit gap skips distance computation — no suggestions available
    expect(result.clusteringMeta.suggestedLargerGap).toBeNull();
    expect(result.clusteringMeta.suggestedSmallerGap).toBeNull();
  });
});

// ============================================================================
// Alignment Tests
// ============================================================================

/**
 * Create a synthetic RGBA image with a distinctive pattern at a specific location.
 * Background is gray (128,128,128), pattern is a colored block.
 */
function createTestImage(
  width: number,
  height: number,
  patternX: number,
  patternY: number,
  patternW: number,
  patternH: number,
  patternColor: [number, number, number] = [255, 0, 0]
): RawImageData {
  const data = new Uint8Array(width * height * 4);
  // Fill with gray background
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = 128;
    data[i * 4 + 1] = 128;
    data[i * 4 + 2] = 128;
    data[i * 4 + 3] = 255;
  }
  // Draw pattern block
  for (let y = patternY; y < patternY + patternH && y < height; y++) {
    for (let x = patternX; x < patternX + patternW && x < width; x++) {
      const idx = (y * width + x) * 4;
      data[idx] = patternColor[0];
      data[idx + 1] = patternColor[1];
      data[idx + 2] = patternColor[2];
      data[idx + 3] = 255;
    }
  }
  return { data, width, height };
}

/**
 * Create a template that is the exact crop of the scene at a given position.
 */
function cropImage(scene: RawImageData, x: number, y: number, w: number, h: number): RawImageData {
  const data = new Uint8Array(w * h * 4);
  for (let row = 0; row < h; row++) {
    const srcOffset = ((y + row) * scene.width + x) * 4;
    const dstOffset = row * w * 4;
    data.set(scene.data.subarray(srcOffset, srcOffset + w * 4), dstOffset);
  }
  return { data, width: w, height: h };
}

describe('alignment helpers', () => {
  it('toGrayscale should convert RGBA to luminance', () => {
    const data = new Uint8Array([
      255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255,
    ]);
    const gray = toGrayscale(data, 2, 2);

    expect(gray).toHaveLength(4);
    // Red pixel: 255*0.299 ≈ 76.2
    expect(gray[0]).toBeCloseTo(76.245, 0);
    // Green pixel: 255*0.587 ≈ 149.7
    expect(gray[1]).toBeCloseTo(149.685, 0);
    // Blue pixel: 255*0.114 ≈ 29.1
    expect(gray[2]).toBeCloseTo(29.07, 0);
    // White pixel: 255
    expect(gray[3]).toBeCloseTo(255, 0);
  });

  it('orderBySize should identify scene and template correctly', () => {
    const large: RawImageData = { data: new Uint8Array(400 * 300 * 4), width: 400, height: 300 };
    const small: RawImageData = { data: new Uint8Array(100 * 50 * 4), width: 100, height: 50 };

    const result1 = orderBySize(large, small);
    expect(result1.scene.width).toBe(400);
    expect(result1.template.width).toBe(100);
    expect(result1.swapped).toBe(false);

    const result2 = orderBySize(small, large);
    expect(result2.scene.width).toBe(400);
    expect(result2.template.width).toBe(100);
    expect(result2.swapped).toBe(true);
  });
});

describe('alignImages (OpenCV ZNCC hybrid)', () => {
  it('should find exact template position in a synthetic scene', async () => {
    const scene = createTestImage(100, 100, 30, 40, 20, 15, [255, 0, 0]);
    const template = cropImage(scene, 20, 30, 40, 30);

    const result = await alignImages(scene, template);

    expect(result.x).toBe(20);
    expect(result.y).toBe(30);
    expect(result.confidence).toBeGreaterThan(0.9);
    expect(result.strategy).toBe('opencv-zncc-hybrid');
  });

  it('should find a pattern not at the origin', async () => {
    const scene = createTestImage(80, 60, 50, 30, 15, 10, [0, 0, 255]);
    // Add second pattern
    for (let y = 30; y < 40; y++) {
      for (let x = 50; x < 65; x++) {
        const idx = (y * 80 + x) * 4;
        scene.data[idx] = 0;
        scene.data[idx + 1] = 255;
        scene.data[idx + 2] = 0;
      }
    }
    const template = cropImage(scene, 45, 25, 25, 20);

    const result = await alignImages(scene, template);

    expect(result.x).toBe(45);
    expect(result.y).toBe(25);
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it('should throw when template is larger than scene', async () => {
    const scene: RawImageData = { data: new Uint8Array(40 * 30 * 4), width: 40, height: 30 };
    const template: RawImageData = { data: new Uint8Array(50 * 50 * 4), width: 50, height: 50 };

    await expect(alignImages(scene, template)).rejects.toThrow('larger than scene');
  });

  it('should not false-match on uniform white regions', async () => {
    // Scene: mostly white with a small colored pattern
    const scene: RawImageData = {
      data: new Uint8Array(100 * 100 * 4),
      width: 100,
      height: 100,
    };
    // Fill with white
    for (let i = 0; i < 100 * 100; i++) {
      scene.data[i * 4] = 255;
      scene.data[i * 4 + 1] = 255;
      scene.data[i * 4 + 2] = 255;
      scene.data[i * 4 + 3] = 255;
    }
    // Add a small colored pattern at (70, 50)
    for (let y = 50; y < 60; y++) {
      for (let x = 70; x < 85; x++) {
        const idx = (y * 100 + x) * 4;
        scene.data[idx] = 50;
        scene.data[idx + 1] = 100;
        scene.data[idx + 2] = 200;
      }
    }

    // Template: the colored region + surrounding white
    const template = cropImage(scene, 65, 45, 25, 20);

    const result = await alignImages(scene, template);

    // Should find the correct position, not get confused by white areas
    expect(result.x).toBe(65);
    expect(result.y).toBe(45);
    expect(result.confidence).toBeGreaterThan(0.7);
  });
});
