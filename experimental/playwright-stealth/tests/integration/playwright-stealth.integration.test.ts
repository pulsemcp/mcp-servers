import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simple MCP client for testing
class TestMCPClient {
  private process: ChildProcess | null = null;
  private pendingRequests: Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  > = new Map();
  private requestId = 0;
  private buffer = '';

  async start(command: string, args: string[], env?: Record<string, string>) {
    return new Promise<void>((resolve, reject) => {
      this.process = spawn(command, args, {
        env: { ...process.env, ...env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.process.stdout?.on('data', (data) => {
        this.buffer += data.toString();
        this.processBuffer();
      });

      this.process.stderr?.on('data', (data) => {
        // Log stderr for debugging
        console.error('[Server stderr]:', data.toString());
      });

      this.process.on('error', reject);

      // Wait for server to start
      setTimeout(resolve, 1000);
    });
  }

  private processBuffer() {
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const response = JSON.parse(line);
        const pending = this.pendingRequests.get(response.id);
        if (pending) {
          this.pendingRequests.delete(response.id);
          if (response.error) {
            pending.reject(new Error(response.error.message));
          } else {
            pending.resolve(response.result);
          }
        }
      } catch {
        // Ignore non-JSON lines
      }
    }
  }

  async request(method: string, params: unknown = {}): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      this.pendingRequests.set(id, { resolve, reject });

      const request = JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params,
      });

      this.process?.stdin?.write(request + '\n');

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 10000);
    });
  }

  async stop() {
    this.process?.kill();
    this.process = null;
  }
}

describe('Playwright Stealth MCP Server Integration Tests', () => {
  let client: TestMCPClient;
  const serverPath = join(__dirname, '../../local/build/index.integration-with-mock.js');

  beforeAll(async () => {
    client = new TestMCPClient();
    await client.start('node', [serverPath]);
  });

  afterAll(async () => {
    await client.stop();
  });

  describe('tools/list', () => {
    it('should list all available tools', async () => {
      const result = (await client.request('tools/list')) as {
        tools: Array<{ name: string; description: string }>;
      };

      expect(result.tools).toHaveLength(4);

      const toolNames = result.tools.map((t) => t.name);
      expect(toolNames).toContain('browser_execute');
      expect(toolNames).toContain('browser_screenshot');
      expect(toolNames).toContain('browser_get_state');
      expect(toolNames).toContain('browser_close');
    });
  });

  describe('tools/call - browser_execute', () => {
    it('should execute page navigation', async () => {
      const result = (await client.request('tools/call', {
        name: 'browser_execute',
        arguments: { code: "await page.goto('https://example.com')" },
      })) as { content: Array<{ type: string; text?: string }> };

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    it('should handle execution with timeout', async () => {
      const result = (await client.request('tools/call', {
        name: 'browser_execute',
        arguments: { code: 'await page.title()', timeout: 5000 },
      })) as { content: Array<{ type: string; text?: string }> };

      expect(result.content).toBeDefined();
    });
  });

  describe('tools/call - browser_screenshot', () => {
    it('should take a screenshot', async () => {
      const result = (await client.request('tools/call', {
        name: 'browser_screenshot',
        arguments: {},
      })) as { content: Array<{ type: string; data?: string; mimeType?: string }> };

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('image');
      expect(result.content[0].mimeType).toBe('image/png');
      expect(result.content[0].data).toBeDefined();
    });
  });

  describe('tools/call - browser_get_state', () => {
    it('should get browser state', async () => {
      const result = (await client.request('tools/call', {
        name: 'browser_get_state',
        arguments: {},
      })) as { content: Array<{ type: string; text?: string }> };

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const state = JSON.parse(result.content[0].text!);
      expect(state).toHaveProperty('isOpen');
      expect(state).toHaveProperty('stealthMode');
      expect(state).toHaveProperty('headless');
    });
  });

  describe('tools/call - browser_close', () => {
    it('should close browser', async () => {
      const result = (await client.request('tools/call', {
        name: 'browser_close',
        arguments: {},
      })) as { content: Array<{ type: string; text?: string }> };

      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain('closed successfully');
    });
  });
});
