import { describe, it, expect } from 'vitest';
import {
  toGrayscale,
  sobelEdges,
  downsample,
  alignMultiScale,
  orderBySize,
} from '../../shared/src/diff-engine/alignment.js';
import type { RawImageData } from '../../shared/src/diff-engine/alignment.js';

/**
 * Create a synthetic RGBA image filled with a solid color.
 */
function createSolidImage(
  width: number,
  height: number,
  r: number,
  g: number,
  b: number,
  a = 255
): RawImageData {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = a;
  }
  return { data, width, height };
}

/**
 * Create a scene image with a distinct pattern at a specific position.
 * Background is gray (128,128,128), pattern is a gradient block.
 */
function createSceneWithPattern(
  sceneWidth: number,
  sceneHeight: number,
  patternX: number,
  patternY: number,
  patternWidth: number,
  patternHeight: number
): { scene: RawImageData; template: RawImageData } {
  const sceneData = new Uint8Array(sceneWidth * sceneHeight * 4);
  const templateData = new Uint8Array(patternWidth * patternHeight * 4);

  // Fill scene with gray background
  for (let i = 0; i < sceneWidth * sceneHeight; i++) {
    sceneData[i * 4] = 128;
    sceneData[i * 4 + 1] = 128;
    sceneData[i * 4 + 2] = 128;
    sceneData[i * 4 + 3] = 255;
  }

  // Place a gradient pattern at the specified position
  for (let py = 0; py < patternHeight; py++) {
    for (let px = 0; px < patternWidth; px++) {
      // Create a distinctive gradient pattern
      const r = Math.round((px / patternWidth) * 200 + 50);
      const g = Math.round((py / patternHeight) * 200 + 50);
      const b = Math.round(((px + py) / (patternWidth + patternHeight)) * 200 + 50);

      // Write to scene
      const sceneIdx = ((patternY + py) * sceneWidth + (patternX + px)) * 4;
      sceneData[sceneIdx] = r;
      sceneData[sceneIdx + 1] = g;
      sceneData[sceneIdx + 2] = b;
      sceneData[sceneIdx + 3] = 255;

      // Write to template
      const templateIdx = (py * patternWidth + px) * 4;
      templateData[templateIdx] = r;
      templateData[templateIdx + 1] = g;
      templateData[templateIdx + 2] = b;
      templateData[templateIdx + 3] = 255;
    }
  }

  return {
    scene: { data: sceneData, width: sceneWidth, height: sceneHeight },
    template: { data: templateData, width: patternWidth, height: patternHeight },
  };
}

describe('toGrayscale', () => {
  it('should convert RGBA to grayscale using luminance weights', () => {
    // Pure red pixel
    const data = new Uint8Array([255, 0, 0, 255]);
    const gray = toGrayscale(data, 1, 1);
    // Expected: 255 * 0.299 = 76.245
    expect(gray[0]).toBeCloseTo(76.245, 1);
  });

  it('should produce 0 for black and ~255 for white', () => {
    const data = new Uint8Array([0, 0, 0, 255, 255, 255, 255, 255]);
    const gray = toGrayscale(data, 2, 1);
    expect(gray[0]).toBe(0);
    expect(gray[1]).toBeCloseTo(255, 0);
  });
});

describe('sobelEdges', () => {
  it('should detect edges at sharp transitions', () => {
    // 5x5 image: left half black, right half white
    const width = 5;
    const height = 5;
    const gray = new Float32Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        gray[y * width + x] = x >= 3 ? 255 : 0;
      }
    }

    const edges = sobelEdges(gray, width, height);

    // Edges should be strongest at x=2 (transition column)
    // and zero far from the edge
    expect(edges[2 * width + 2]).toBeGreaterThan(0);
    expect(edges[0]).toBe(0); // Corner pixel (border, not computed)
  });

  it('should produce zero edges for a solid image', () => {
    const width = 5;
    const height = 5;
    const gray = new Float32Array(width * height).fill(128);

    const edges = sobelEdges(gray, width, height);

    for (let i = 0; i < edges.length; i++) {
      expect(edges[i]).toBe(0);
    }
  });
});

describe('downsample', () => {
  it('should reduce dimensions by the given factor', () => {
    const data = new Float32Array(16 * 16).fill(100);
    const result = downsample(data, 16, 16, 4);

    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
    expect(result.data[0]).toBeCloseTo(100, 1);
  });

  it('should average pixel values correctly', () => {
    // 4x4 image with known values, downsample by 2
    const data = new Float32Array([
      10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160,
    ]);
    const result = downsample(data, 4, 4, 2);

    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
    // Top-left 2x2: (10+20+50+60)/4 = 35
    expect(result.data[0]).toBeCloseTo(35, 1);
  });
});

describe('orderBySize', () => {
  it('should identify the larger image as scene', () => {
    const large = createSolidImage(100, 100, 0, 0, 0);
    const small = createSolidImage(50, 50, 255, 255, 255);

    const { scene, template, swapped } = orderBySize(large, small);

    expect(scene.width).toBe(100);
    expect(template.width).toBe(50);
    expect(swapped).toBe(false);
  });

  it('should swap when first image is smaller', () => {
    const small = createSolidImage(50, 50, 255, 255, 255);
    const large = createSolidImage(100, 100, 0, 0, 0);

    const { scene, template, swapped } = orderBySize(small, large);

    expect(scene.width).toBe(100);
    expect(template.width).toBe(50);
    expect(swapped).toBe(true);
  });
});

describe('alignMultiScale', () => {
  it('should find a pattern at the top-left corner', () => {
    const { scene, template } = createSceneWithPattern(100, 100, 0, 0, 30, 30);
    const result = alignMultiScale(scene, template);

    // Sobel edge filter has 1px border effect; allow ±2px tolerance on synthetic images.
    // Real-world images with dense edge content align more precisely.
    expect(Math.abs(result.x - 0)).toBeLessThanOrEqual(2);
    expect(Math.abs(result.y - 0)).toBeLessThanOrEqual(2);
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.strategy).toBe('multi-scale');
  });

  it('should find a pattern at an interior position', () => {
    const { scene, template } = createSceneWithPattern(100, 100, 35, 40, 25, 25);
    const result = alignMultiScale(scene, template);

    expect(Math.abs(result.x - 35)).toBeLessThanOrEqual(2);
    expect(Math.abs(result.y - 40)).toBeLessThanOrEqual(2);
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('should find a pattern at the bottom-right corner', () => {
    const { scene, template } = createSceneWithPattern(100, 100, 70, 70, 30, 30);
    const result = alignMultiScale(scene, template);

    expect(Math.abs(result.x - 70)).toBeLessThanOrEqual(2);
    expect(Math.abs(result.y - 70)).toBeLessThanOrEqual(2);
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('should handle larger images with downsampling', () => {
    // Larger scene to force downsampling path
    const { scene, template } = createSceneWithPattern(400, 300, 150, 100, 60, 50);
    const result = alignMultiScale(scene, template);

    // Allow ±2px tolerance for downsampled search + Sobel border
    expect(Math.abs(result.x - 150)).toBeLessThanOrEqual(2);
    expect(Math.abs(result.y - 100)).toBeLessThanOrEqual(2);
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('should throw when template is larger than scene', () => {
    const scene = createSolidImage(50, 50, 128, 128, 128);
    const template = createSolidImage(100, 100, 200, 200, 200);

    expect(() => alignMultiScale(scene, template)).toThrow('larger than scene');
  });

  it('should return low confidence for solid-color template on solid-color scene', () => {
    // Uniform images have zero edge content and zero variance
    const scene = createSolidImage(100, 100, 200, 200, 200);
    const template = createSolidImage(30, 30, 200, 200, 200);

    const result = alignMultiScale(scene, template);

    // Should still return a result but with low confidence
    expect(result.confidence).toBeLessThanOrEqual(0.5);
  });
});
