import { describe, it, expect } from 'vitest';
import { toGrayscale, orderBySize } from '../../shared/src/diff-engine/alignment.js';
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
