import sharp from 'sharp';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { createRequire } from 'module';
import { promisify } from 'util';

// potrace is a CommonJS module without types
const require = createRequire(import.meta.url);
const potrace = require('potrace') as {
  trace: (
    input: string | Buffer,
    options: Record<string, unknown>,
    callback: (err: Error | null, svg: string) => void
  ) => void;
};
const traceAsync = promisify(potrace.trace) as (
  input: Buffer,
  options: Record<string, unknown>
) => Promise<string>;

export interface TraceOptions {
  /** Threshold for black/white cutoff (0-255). Default: auto-detected. */
  threshold?: number;
  /** Suppress speckles of this many pixels. Default: 2. */
  turdSize?: number;
  /** Curve optimization tolerance. Default: 0.2. */
  optTolerance?: number;
  /** Fill color for the traced paths. Default: '#000000'. */
  color?: string;
  /** Background color. Default: transparent. */
  background?: string;
  /** Target width for the output SVG viewBox. Default: original width. */
  targetWidth?: number;
  /** Target height for the output SVG viewBox. Default: original height. */
  targetHeight?: number;
}

export interface TraceResult {
  /** The generated SVG string */
  svg: string;
  /** Path where the SVG was written (if outputPath was provided) */
  outputPath?: string;
  /** Original image dimensions */
  originalWidth: number;
  originalHeight: number;
  /** Whether preprocessing was applied */
  preprocessed: boolean;
}

/**
 * Pre-process an image for tracing:
 * 1. Convert to grayscale
 * 2. Handle transparency by converting alpha channel to black-on-white mask
 * 3. Return a Buffer suitable for potrace
 */
async function preprocessImage(inputBuffer: Buffer): Promise<{
  buffer: Buffer;
  width: number;
  height: number;
  hadAlpha: boolean;
}> {
  const image = sharp(inputBuffer);
  const metadata = await image.metadata();
  const width = metadata.width!;
  const height = metadata.height!;
  const hasAlpha = metadata.hasAlpha ?? false;

  if (hasAlpha) {
    // Extract raw RGBA pixels
    const { data: rawPixels } = await sharp(inputBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Create a grayscale image where:
    // - Opaque pixels become black (0)
    // - Transparent pixels become white (255)
    const grayscale = Buffer.alloc(width * height);
    for (let i = 0; i < width * height; i++) {
      const r = rawPixels[i * 4];
      const g = rawPixels[i * 4 + 1];
      const b = rawPixels[i * 4 + 2];
      const a = rawPixels[i * 4 + 3];

      // Use ITU-R BT.601 luminance and alpha to determine black/white
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      // Blend with white background based on alpha
      const blended = Math.round(luminance * (a / 255) + 255 * (1 - a / 255));
      grayscale[i] = blended;
    }

    const processedBuffer = await sharp(grayscale, {
      raw: { width, height, channels: 1 },
    })
      .png()
      .toBuffer();

    return { buffer: processedBuffer, width, height, hadAlpha: true };
  }

  // No alpha channel - just convert to grayscale PNG
  const processedBuffer = await sharp(inputBuffer).grayscale().png().toBuffer();

  return { buffer: processedBuffer, width, height, hadAlpha: false };
}

/**
 * Adapt SVG paths to fit within a target viewBox by wrapping in a scaled group.
 */
function adaptSvgToTargetSize(
  svg: string,
  originalWidth: number,
  originalHeight: number,
  targetWidth: number,
  targetHeight: number
): string {
  // Calculate scale to fit target dimensions while preserving aspect ratio
  const scaleX = targetWidth / originalWidth;
  const scaleY = targetHeight / originalHeight;
  const scale = Math.min(scaleX, scaleY);

  // Center the scaled content
  const scaledWidth = originalWidth * scale;
  const scaledHeight = originalHeight * scale;
  const offsetX = (targetWidth - scaledWidth) / 2;
  const offsetY = (targetHeight - scaledHeight) / 2;

  // Extract path data from the SVG
  const pathMatch = svg.match(/<path[^>]*\/>/g);
  if (!pathMatch) {
    return svg;
  }

  // Extract fill color from existing paths
  const fillMatch = svg.match(/fill="([^"]*)"/);
  const fill = fillMatch ? fillMatch[1] : '#000000';

  // Build new SVG with transform
  const paths = pathMatch.join('\n    ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${targetWidth}" height="${targetHeight}" viewBox="0 0 ${targetWidth} ${targetHeight}">
  <g transform="translate(${offsetX.toFixed(2)}, ${offsetY.toFixed(2)}) scale(${scale.toFixed(6)})" fill="${fill}">
    ${paths}
  </g>
</svg>`;
}

/**
 * Trace a bitmap image to SVG vector format.
 *
 * @param input - File path or Buffer of the input image (PNG, JPG, BMP, GIF, TIFF, WebP)
 * @param outputPath - Optional file path where the SVG will be written
 * @param options - Tracing configuration options
 * @returns TraceResult with the SVG string and metadata
 */
export async function traceToSvg(
  input: string | Buffer,
  outputPath?: string,
  options: TraceOptions = {}
): Promise<TraceResult> {
  // Read input
  let inputBuffer: Buffer;
  if (typeof input === 'string') {
    const resolvedPath = resolve(input);
    if (!existsSync(resolvedPath)) {
      throw new Error(`Input file not found: ${resolvedPath}`);
    }
    inputBuffer = readFileSync(resolvedPath);
  } else {
    inputBuffer = input;
  }

  // Validate the input is a valid image
  try {
    await sharp(inputBuffer).metadata();
  } catch {
    throw new Error('Invalid image input. Supported formats: PNG, JPG, BMP, GIF, TIFF, WebP');
  }

  // Preprocess the image
  const { buffer: processedBuffer, width, height, hadAlpha } = await preprocessImage(inputBuffer);

  // Trace with potrace
  const potraceOptions: Record<string, unknown> = {
    threshold: options.threshold ?? 128,
    turdSize: options.turdSize ?? 2,
    optTolerance: options.optTolerance ?? 0.2,
    color: options.color ?? '#000000',
    background: options.background ?? 'transparent',
  };

  let svg = await traceAsync(processedBuffer, potraceOptions);

  // Adapt to target size if specified
  if (options.targetWidth || options.targetHeight) {
    const tw = options.targetWidth ?? width;
    const th = options.targetHeight ?? height;
    svg = adaptSvgToTargetSize(svg, width, height, tw, th);
  }

  // Write output if path specified
  let resolvedOutputPath: string | undefined;
  if (outputPath) {
    resolvedOutputPath = resolve(outputPath);
    const dir = dirname(resolvedOutputPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(resolvedOutputPath, svg, 'utf-8');
  }

  return {
    svg,
    outputPath: resolvedOutputPath,
    originalWidth: width,
    originalHeight: height,
    preprocessed: hadAlpha,
  };
}
