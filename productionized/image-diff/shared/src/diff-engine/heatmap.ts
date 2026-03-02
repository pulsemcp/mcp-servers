/**
 * Heatmap image generation from pixel diff intensity data.
 *
 * Generates a visual heatmap where:
 * - Matching pixels are white (transparent background)
 * - Anti-aliased pixels are drawn in yellow (low opacity)
 * - Differing pixels are colored on a gradient from yellow (low diff)
 *   through orange to red (high diff)
 */

import sharp from 'sharp';

/**
 * Generate a heatmap PNG image from the intensity map.
 *
 * @param intensityMap Per-pixel intensity values (0.0 = match, >0.0 = diff, -1.0 = AA)
 * @param width Image width
 * @param height Image height
 * @returns PNG buffer of the heatmap image
 */
export async function generateHeatmap(
  intensityMap: Float32Array,
  width: number,
  height: number
): Promise<Buffer> {
  const len = width * height;
  const output = new Uint8Array(len * 4);

  console.error(`[heatmap] Generating ${width}x${height} heatmap image`);

  for (let i = 0; i < len; i++) {
    const pos = i * 4;
    const intensity = intensityMap[i];

    if (intensity < 0) {
      // Anti-aliased pixel: light yellow, semi-transparent
      output[pos] = 255;
      output[pos + 1] = 255;
      output[pos + 2] = 150;
      output[pos + 3] = 60;
    } else if (intensity === 0) {
      // Matching pixel: fully transparent white
      output[pos] = 255;
      output[pos + 1] = 255;
      output[pos + 2] = 255;
      output[pos + 3] = 0;
    } else {
      // Diff pixel: gradient from yellow (low) to red (high)
      const [r, g, b] = intensityToColor(intensity);
      // Opacity scales with intensity: min 100, max 255
      const alpha = Math.round(100 + 155 * intensity);
      output[pos] = r;
      output[pos + 1] = g;
      output[pos + 2] = b;
      output[pos + 3] = alpha;
    }
  }

  const pngBuffer = await sharp(Buffer.from(output.buffer), {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();

  console.error(`[heatmap] Generated PNG: ${pngBuffer.length} bytes`);
  return pngBuffer;
}

/**
 * Generate a composite image: original source image with heatmap overlaid.
 *
 * @param sourceImagePath Path to the source image to use as background
 * @param intensityMap Per-pixel intensity values
 * @param width Image width
 * @param height Image height
 * @returns PNG buffer of the composite image
 */
export async function generateCompositeHeatmap(
  sourceImagePath: string,
  intensityMap: Float32Array,
  width: number,
  height: number
): Promise<Buffer> {
  console.error(`[heatmap] Generating composite heatmap over ${sourceImagePath}`);

  const heatmapPng = await generateHeatmap(intensityMap, width, height);

  const composite = await sharp(sourceImagePath)
    .resize(width, height, { fit: 'fill' })
    .composite([{ input: heatmapPng, blend: 'over' }])
    .png()
    .toBuffer();

  console.error(`[heatmap] Generated composite PNG: ${composite.length} bytes`);
  return composite;
}

/**
 * Map an intensity value (0.0-1.0) to an RGB color on a yellow-orange-red gradient.
 *
 * 0.0 = bright yellow (#FFFF00)
 * 0.5 = orange (#FF8000)
 * 1.0 = deep red (#FF0000)
 */
function intensityToColor(t: number): [number, number, number] {
  // Clamp to 0-1
  t = Math.max(0, Math.min(1, t));

  // Red channel: always 255
  const r = 255;
  // Green channel: fades from 255 (yellow) to 0 (red)
  const g = Math.round(255 * (1 - t));
  // Blue channel: always 0
  const b = 0;

  return [r, g, b];
}
