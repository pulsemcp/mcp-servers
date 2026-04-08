import { describe, it, expect, beforeAll } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, unlinkSync, mkdirSync } from 'fs';
import sharp from 'sharp';
import { traceToSvg } from '../../shared/src/tracer/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, '..', 'fixtures');
const tmpDir = join(__dirname, '..', 'tmp');

// Ensure tmp dir exists for output tests
beforeAll(() => {
  mkdirSync(tmpDir, { recursive: true });
});

function fixturePath(name: string): string {
  return join(fixturesDir, name);
}

function tmpPath(name: string): string {
  return join(tmpDir, name);
}

function cleanupTmp(name: string): void {
  const p = tmpPath(name);
  if (existsSync(p)) unlinkSync(p);
}

describe('traceToSvg', () => {
  describe('basic tracing', () => {
    it('should trace a PNG with no alpha channel', async () => {
      const result = await traceToSvg(fixturePath('black-square.png'));
      expect(result.svg).toContain('<svg');
      expect(result.svg).toContain('<path');
      expect(result.originalWidth).toBe(100);
      expect(result.originalHeight).toBe(100);
      expect(result.preprocessed).toBe(false);
    });

    it('should trace a transparent PNG and preprocess it', async () => {
      const result = await traceToSvg(fixturePath('circle-transparent.png'));
      expect(result.svg).toContain('<svg');
      expect(result.svg).toContain('<path');
      expect(result.originalWidth).toBe(100);
      expect(result.originalHeight).toBe(100);
      expect(result.preprocessed).toBe(true);
    });

    it('should trace a JPEG image', async () => {
      const result = await traceToSvg(fixturePath('black-square.jpg'));
      expect(result.svg).toContain('<svg');
      expect(result.svg).toContain('<path');
      expect(result.originalWidth).toBe(100);
      expect(result.originalHeight).toBe(100);
    });

    it('should trace a WebP image', async () => {
      const result = await traceToSvg(fixturePath('black-square.webp'));
      expect(result.svg).toContain('<svg');
      expect(result.svg).toContain('<path');
    });

    it('should trace a non-square image', async () => {
      const result = await traceToSvg(fixturePath('wide-rectangle.png'));
      expect(result.svg).toContain('<svg');
      expect(result.originalWidth).toBe(200);
      expect(result.originalHeight).toBe(100);
    });

    it('should trace a tiny 1x1 image', async () => {
      const result = await traceToSvg(fixturePath('tiny-1x1.png'));
      expect(result.svg).toContain('<svg');
      expect(result.originalWidth).toBe(1);
      expect(result.originalHeight).toBe(1);
    });

    it('should trace a colored transparent PNG', async () => {
      const result = await traceToSvg(fixturePath('red-star-transparent.png'));
      expect(result.svg).toContain('<svg');
      expect(result.svg).toContain('<path');
      expect(result.preprocessed).toBe(true);
    });
  });

  describe('output file writing', () => {
    it('should write SVG to the specified output path', async () => {
      const outputFile = 'test-output.svg';
      cleanupTmp(outputFile);

      const result = await traceToSvg(fixturePath('black-square.png'), tmpPath(outputFile));

      expect(result.outputPath).toBe(tmpPath(outputFile));
      expect(existsSync(tmpPath(outputFile))).toBe(true);

      cleanupTmp(outputFile);
    });

    it('should create parent directories for output path', async () => {
      const outputFile = 'nested/dir/output.svg';
      const fullPath = tmpPath(outputFile);
      if (existsSync(fullPath)) unlinkSync(fullPath);

      const result = await traceToSvg(fixturePath('black-square.png'), fullPath);

      expect(existsSync(fullPath)).toBe(true);
      expect(result.outputPath).toBe(fullPath);

      // Cleanup
      unlinkSync(fullPath);
    });

    it('should not write output when no output path is specified', async () => {
      const result = await traceToSvg(fixturePath('black-square.png'));
      expect(result.outputPath).toBeUndefined();
    });
  });

  describe('tracing options', () => {
    it('should apply custom fill color', async () => {
      const result = await traceToSvg(fixturePath('black-square.png'), undefined, {
        color: '#FF5733',
      });
      expect(result.svg).toContain('#FF5733');
    });

    it('should apply custom background color', async () => {
      const result = await traceToSvg(fixturePath('black-square.png'), undefined, {
        background: '#FFFFFF',
      });
      // Background should appear in the SVG
      expect(result.svg).toContain('<svg');
    });

    it('should apply custom threshold', async () => {
      const resultLow = await traceToSvg(fixturePath('black-square.png'), undefined, {
        threshold: 50,
      });
      const resultHigh = await traceToSvg(fixturePath('black-square.png'), undefined, {
        threshold: 200,
      });
      // Both should produce valid SVGs
      expect(resultLow.svg).toContain('<svg');
      expect(resultHigh.svg).toContain('<svg');
    });

    it('should apply custom turdSize', async () => {
      const result = await traceToSvg(fixturePath('black-square.png'), undefined, {
        turdSize: 10,
      });
      expect(result.svg).toContain('<svg');
    });

    it('should apply custom optTolerance', async () => {
      const result = await traceToSvg(fixturePath('black-square.png'), undefined, {
        optTolerance: 0.8,
      });
      expect(result.svg).toContain('<svg');
    });
  });

  describe('target size scaling', () => {
    it('should scale SVG to target width and height', async () => {
      const result = await traceToSvg(fixturePath('black-square.png'), undefined, {
        targetWidth: 50,
        targetHeight: 50,
      });
      expect(result.svg).toContain('viewBox="0 0 50 50"');
      expect(result.svg).toContain('width="50"');
      expect(result.svg).toContain('height="50"');
      expect(result.svg).toContain('<g transform=');
      expect(result.svg).toContain('scale(');
    });

    it('should preserve aspect ratio when scaling non-square image', async () => {
      const result = await traceToSvg(fixturePath('wide-rectangle.png'), undefined, {
        targetWidth: 50,
        targetHeight: 50,
      });
      expect(result.svg).toContain('viewBox="0 0 50 50"');
      // Scale should be based on the larger dimension to fit
      expect(result.svg).toContain('scale(');
    });

    it('should handle target width only', async () => {
      const result = await traceToSvg(fixturePath('black-square.png'), undefined, {
        targetWidth: 50,
      });
      // Should use original height when only width is specified
      expect(result.svg).toContain('width="50"');
    });

    it('should handle target height only', async () => {
      const result = await traceToSvg(fixturePath('black-square.png'), undefined, {
        targetHeight: 50,
      });
      // Should use original width when only height is specified
      expect(result.svg).toContain('height="50"');
    });
  });

  describe('input from Buffer', () => {
    it('should accept a Buffer as input', async () => {
      const buffer = await sharp({
        create: {
          width: 50,
          height: 50,
          channels: 3,
          background: { r: 0, g: 0, b: 0 },
        },
      })
        .png()
        .toBuffer();

      const result = await traceToSvg(buffer);
      expect(result.svg).toContain('<svg');
      expect(result.originalWidth).toBe(50);
      expect(result.originalHeight).toBe(50);
    });
  });

  describe('error handling', () => {
    it('should throw for non-existent file', async () => {
      await expect(traceToSvg('/nonexistent/file.png')).rejects.toThrow('Input file not found');
    });

    it('should throw for invalid image data', async () => {
      const invalidBuffer = Buffer.from('not an image');
      await expect(traceToSvg(invalidBuffer)).rejects.toThrow('Invalid image input');
    });
  });
});
