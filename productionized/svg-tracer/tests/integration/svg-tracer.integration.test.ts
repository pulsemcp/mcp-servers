import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, unlinkSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.join(__dirname, '..', 'fixtures');
const tmpDir = path.join(__dirname, '..', 'tmp');

beforeAll(() => {
  mkdirSync(tmpDir, { recursive: true });
});

describe('SVG Tracer MCP Server Integration Tests', () => {
  let client: TestMCPClient | null = null;

  afterEach(async () => {
    if (client) {
      await client.disconnect();
      client = null;
    }
  });

  async function createClient(): Promise<TestMCPClient> {
    const serverPath = path.join(__dirname, '../../local/build/index.integration-with-mock.js');

    const c = new TestMCPClient({
      serverPath,
      env: {},
      debug: false,
    });

    await c.connect();
    return c;
  }

  describe('Tools', () => {
    it('should list trace_bitmap_to_svg tool', async () => {
      client = await createClient();
      const result = await client.listTools();
      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].name).toBe('trace_bitmap_to_svg');
      expect(result.tools[0].description).toContain('bitmap');
    });

    it('should trace a PNG file via MCP protocol', async () => {
      client = await createClient();
      const outputPath = path.join(tmpDir, 'integration-test.svg');
      if (existsSync(outputPath)) unlinkSync(outputPath);

      const result = await client.callTool('trace_bitmap_to_svg', {
        input_path: path.join(fixturesDir, 'black-square.png'),
        output_path: outputPath,
      });

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);

      const parsed = JSON.parse((result.content[0] as { type: string; text: string }).text);
      expect(parsed.svg).toContain('<svg');
      expect(parsed.svg).toContain('<path');
      expect(parsed.originalWidth).toBe(100);
      expect(parsed.originalHeight).toBe(100);
      expect(existsSync(outputPath)).toBe(true);

      unlinkSync(outputPath);
    });

    it('should trace a transparent PNG via MCP protocol', async () => {
      client = await createClient();
      const outputPath = path.join(tmpDir, 'integration-circle.svg');
      if (existsSync(outputPath)) unlinkSync(outputPath);

      const result = await client.callTool('trace_bitmap_to_svg', {
        input_path: path.join(fixturesDir, 'circle-transparent.png'),
        output_path: outputPath,
      });

      expect(result.isError).toBe(false);
      const parsed = JSON.parse((result.content[0] as { type: string; text: string }).text);
      expect(parsed.preprocessed).toBe(true);
      expect(parsed.svg).toContain('<path');

      if (existsSync(outputPath)) unlinkSync(outputPath);
    });

    it('should apply custom color via MCP protocol', async () => {
      client = await createClient();
      const outputPath = path.join(tmpDir, 'integration-colored.svg');
      if (existsSync(outputPath)) unlinkSync(outputPath);

      const result = await client.callTool('trace_bitmap_to_svg', {
        input_path: path.join(fixturesDir, 'black-square.png'),
        output_path: outputPath,
        color: '#FF5733',
      });

      expect(result.isError).toBe(false);
      const parsed = JSON.parse((result.content[0] as { type: string; text: string }).text);
      expect(parsed.svg).toContain('#FF5733');

      if (existsSync(outputPath)) unlinkSync(outputPath);
    });

    it('should scale to target dimensions via MCP protocol', async () => {
      client = await createClient();
      const outputPath = path.join(tmpDir, 'integration-icon.svg');
      if (existsSync(outputPath)) unlinkSync(outputPath);

      const result = await client.callTool('trace_bitmap_to_svg', {
        input_path: path.join(fixturesDir, 'black-square.png'),
        output_path: outputPath,
        target_width: 50,
        target_height: 50,
      });

      expect(result.isError).toBe(false);
      const parsed = JSON.parse((result.content[0] as { type: string; text: string }).text);
      expect(parsed.svg).toContain('viewBox="0 0 50 50"');

      if (existsSync(outputPath)) unlinkSync(outputPath);
    });

    it('should return error for non-existent file via MCP protocol', async () => {
      client = await createClient();

      const result = await client.callTool('trace_bitmap_to_svg', {
        input_path: '/nonexistent/file.png',
      });

      expect(result.isError).toBe(true);
      expect((result.content[0] as { type: string; text: string }).text).toContain(
        'Input file not found'
      );
    });
  });
});
