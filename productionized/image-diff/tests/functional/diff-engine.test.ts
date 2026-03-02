import { describe, it, expect } from 'vitest';
import { pixelDiff } from '../../shared/src/diff-engine/pixel-diff.js';
import { findDiffClusters } from '../../shared/src/diff-engine/clustering.js';

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

    const clusters = findDiffClusters(intensityMap, width, height);

    expect(clusters).toHaveLength(0);
  });

  it('should find one cluster for a single diff pixel', () => {
    const width = 4;
    const height = 4;
    const intensityMap = new Float32Array(width * height);
    // One diff pixel at (1, 1)
    intensityMap[1 * width + 1] = 0.5;

    const clusters = findDiffClusters(intensityMap, width, height, 1);

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

    const clusters = findDiffClusters(intensityMap, width, height, 1);

    expect(clusters).toHaveLength(1);
    expect(clusters[0].left).toBe(1);
    expect(clusters[0].top).toBe(1);
    expect(clusters[0].right).toBe(2);
    expect(clusters[0].bottom).toBe(2);
    expect(clusters[0].pixelCount).toBe(4);
  });

  it('should find two separate clusters', () => {
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

    const clusters = findDiffClusters(intensityMap, width, height, 1);

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

    const clusters = findDiffClusters(intensityMap, width, height, 4);

    expect(clusters).toHaveLength(1);
    expect(clusters[0].pixelCount).toBe(4);
  });

  it('should ignore anti-aliased pixels (negative intensity)', () => {
    const width = 4;
    const height = 4;
    const intensityMap = new Float32Array(width * height);
    intensityMap[0] = -1.0; // AA pixel
    intensityMap[1] = 0.5; // Real diff

    const clusters = findDiffClusters(intensityMap, width, height, 1);

    expect(clusters).toHaveLength(1);
    expect(clusters[0].pixelCount).toBe(1);
  });

  it('should calculate mean intensity correctly', () => {
    const width = 4;
    const height = 4;
    const intensityMap = new Float32Array(width * height);
    intensityMap[0] = 0.2;
    intensityMap[1] = 0.4;

    const clusters = findDiffClusters(intensityMap, width, height, 1);

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
    expect(noGap).toHaveLength(3);

    // With gap=3: A and B merge (gap exactly 3), C stays separate
    const gap3 = findDiffClusters(intensityMap, width, height, 1, 3);
    expect(gap3).toHaveLength(2);
    // Merged cluster should span from x=0 to x=6
    const merged = gap3.find((c) => c.pixelCount === 4);
    expect(merged).toBeDefined();
    expect(merged!.left).toBe(0);
    expect(merged!.right).toBe(6);

    // With gap=10: all three merge into one
    const gap10 = findDiffClusters(intensityMap, width, height, 1, 10);
    expect(gap10).toHaveLength(1);
    expect(gap10[0].pixelCount).toBe(6);
    expect(gap10[0].left).toBe(0);
    expect(gap10[0].right).toBe(15);
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

    const clusters = findDiffClusters(intensityMap, width, height, 1, 5);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].pixelCount).toBe(3);
    // Mean should be (0.2 + 0.2 + 0.9) / 3 ≈ 0.433
    expect(clusters[0].meanIntensity).toBeCloseTo(0.433, 2);
    expect(clusters[0].maxIntensity).toBeCloseTo(0.9, 2);
  });
});
