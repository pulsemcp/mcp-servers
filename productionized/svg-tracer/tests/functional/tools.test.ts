import { describe, it, expect, beforeAll } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, unlinkSync, mkdirSync } from 'fs';
import { traceBitmapToSvgTool } from '../../shared/src/tools/trace-bitmap-to-svg.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, '..', 'fixtures');
const tmpDir = join(__dirname, '..', 'tmp');

beforeAll(() => {
  mkdirSync(tmpDir, { recursive: true });
});

describe('trace_bitmap_to_svg tool', () => {
  const server = new Server(
    { name: 'test-server', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );
  const tool = traceBitmapToSvgTool(server);

  it('should have correct tool metadata', () => {
    expect(tool.name).toBe('trace_bitmap_to_svg');
    expect(tool.description).toContain('bitmap');
    expect(tool.description).toContain('SVG');
    expect(tool.inputSchema.type).toBe('object');
    expect(tool.inputSchema.required).toContain('input_path');
  });

  it('should trace a PNG file', async () => {
    const outputPath = join(tmpDir, 'tool-test-output.svg');
    if (existsSync(outputPath)) unlinkSync(outputPath);

    const response = await tool.handler({
      input_path: join(fixturesDir, 'black-square.png'),
      output_path: outputPath,
    });

    expect(response.isError).toBeUndefined();
    expect(response.content).toHaveLength(1);

    const result = JSON.parse(response.content[0].text);
    expect(result.originalWidth).toBe(100);
    expect(result.originalHeight).toBe(100);
    expect(result.svg).toContain('<svg');
    expect(result.svg).toContain('<path');
    expect(result.outputPath).toContain('tool-test-output.svg');
    expect(existsSync(outputPath)).toBe(true);

    unlinkSync(outputPath);
  });

  it('should default output path to .svg extension of input', async () => {
    // Copy fixture to tmp dir to avoid writing SVG back into fixtures directory
    const { copyFileSync } = await import('fs');
    const tmpInputPath = join(tmpDir, 'black-square-default.png');
    copyFileSync(join(fixturesDir, 'black-square.png'), tmpInputPath);
    const expectedOutputPath = join(tmpDir, 'black-square-default.svg');
    if (existsSync(expectedOutputPath)) unlinkSync(expectedOutputPath);

    const response = await tool.handler({
      input_path: tmpInputPath,
    });

    expect(response.isError).toBeUndefined();
    const result = JSON.parse(response.content[0].text);
    expect(result.outputPath).toContain('black-square-default.svg');
    expect(existsSync(expectedOutputPath)).toBe(true);

    unlinkSync(expectedOutputPath);
    unlinkSync(tmpInputPath);
  });

  it('should apply custom color option', async () => {
    const response = await tool.handler({
      input_path: join(fixturesDir, 'black-square.png'),
      output_path: join(tmpDir, 'colored.svg'),
      color: '#FF0000',
    });

    expect(response.isError).toBeUndefined();
    const result = JSON.parse(response.content[0].text);
    expect(result.svg).toContain('#FF0000');

    if (existsSync(join(tmpDir, 'colored.svg'))) {
      unlinkSync(join(tmpDir, 'colored.svg'));
    }
  });

  it('should apply target dimensions', async () => {
    const response = await tool.handler({
      input_path: join(fixturesDir, 'black-square.png'),
      output_path: join(tmpDir, 'icon.svg'),
      target_width: 50,
      target_height: 50,
    });

    expect(response.isError).toBeUndefined();
    const result = JSON.parse(response.content[0].text);
    expect(result.svg).toContain('viewBox="0 0 50 50"');

    if (existsSync(join(tmpDir, 'icon.svg'))) {
      unlinkSync(join(tmpDir, 'icon.svg'));
    }
  });

  it('should return error for non-existent file', async () => {
    const response = await tool.handler({
      input_path: '/nonexistent/file.png',
    });

    expect(response.isError).toBe(true);
    expect(response.content[0].text).toContain('Input file not found');
  });

  it('should return error for missing required input_path', async () => {
    const response = await tool.handler({});

    expect(response.isError).toBe(true);
    expect(response.content[0].text).toContain('Error');
  });

  it('should trace a transparent PNG', async () => {
    const response = await tool.handler({
      input_path: join(fixturesDir, 'circle-transparent.png'),
      output_path: join(tmpDir, 'circle.svg'),
    });

    expect(response.isError).toBeUndefined();
    const result = JSON.parse(response.content[0].text);
    expect(result.preprocessed).toBe(true);
    expect(result.svg).toContain('<path');

    if (existsSync(join(tmpDir, 'circle.svg'))) {
      unlinkSync(join(tmpDir, 'circle.svg'));
    }
  });

  it('should trace a JPEG file', async () => {
    const response = await tool.handler({
      input_path: join(fixturesDir, 'black-square.jpg'),
      output_path: join(tmpDir, 'from-jpg.svg'),
    });

    expect(response.isError).toBeUndefined();
    const result = JSON.parse(response.content[0].text);
    expect(result.svg).toContain('<svg');

    if (existsSync(join(tmpDir, 'from-jpg.svg'))) {
      unlinkSync(join(tmpDir, 'from-jpg.svg'));
    }
  });

  it('should trace a WebP file', async () => {
    const response = await tool.handler({
      input_path: join(fixturesDir, 'black-square.webp'),
      output_path: join(tmpDir, 'from-webp.svg'),
    });

    expect(response.isError).toBeUndefined();
    const result = JSON.parse(response.content[0].text);
    expect(result.svg).toContain('<svg');

    if (existsSync(join(tmpDir, 'from-webp.svg'))) {
      unlinkSync(join(tmpDir, 'from-webp.svg'));
    }
  });
});
