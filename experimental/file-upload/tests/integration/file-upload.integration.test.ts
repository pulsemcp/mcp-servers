import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { createInterface } from 'readline';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_PATH = join(__dirname, '../../local/build/index.integration-with-mock.js');

describe('file-upload MCP server integration', () => {
  let serverProcess: ChildProcess;
  let sendRequest: (method: string, params?: unknown) => Promise<unknown>;
  let requestId = 0;

  beforeAll(async () => {
    serverProcess = spawn('node', [SERVER_PATH], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const rl = createInterface({ input: serverProcess.stdout! });
    const pendingRequests = new Map<
      number,
      { resolve: (value: unknown) => void; reject: (error: Error) => void }
    >();

    rl.on('line', (line) => {
      try {
        const message = JSON.parse(line);
        if (message.id !== undefined && pendingRequests.has(message.id)) {
          const { resolve } = pendingRequests.get(message.id)!;
          pendingRequests.delete(message.id);
          resolve(message.result);
        }
      } catch {
        // Ignore non-JSON lines
      }
    });

    sendRequest = (method: string, params?: unknown): Promise<unknown> => {
      return new Promise((resolve, reject) => {
        const id = ++requestId;
        pendingRequests.set(id, { resolve, reject });

        const request = JSON.stringify({
          jsonrpc: '2.0',
          id,
          method,
          params,
        });

        serverProcess.stdin!.write(request + '\n');

        // Timeout after 5 seconds
        setTimeout(() => {
          if (pendingRequests.has(id)) {
            pendingRequests.delete(id);
            reject(new Error('Request timeout'));
          }
        }, 5000);
      });
    };

    // Initialize the server
    await sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '0.0.1' },
    });
  });

  afterAll(() => {
    serverProcess?.kill();
  });

  describe('tools/list', () => {
    it('should list upload_to_gcs tool', async () => {
      const result = (await sendRequest('tools/list', {})) as { tools: Array<{ name: string }> };

      expect(result.tools).toBeDefined();
      expect(result.tools.length).toBeGreaterThan(0);

      const uploadTool = result.tools.find((t) => t.name === 'upload_to_gcs');
      expect(uploadTool).toBeDefined();
    });
  });

  describe('tools/call upload_to_gcs', () => {
    it('should upload base64 data successfully', async () => {
      const base64Data = Buffer.from('test image content').toString('base64');

      const result = (await sendRequest('tools/call', {
        name: 'upload_to_gcs',
        arguments: {
          source: base64Data,
          filename: 'test-image.png',
          contentType: 'image/png',
        },
      })) as { content: Array<{ type: string; text: string }> };

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.url).toContain('storage.googleapis.com');
      expect(parsed.bucket).toBe('test-bucket');
      expect(parsed.path).toContain('test-image.png');
    });
  });

  describe('resources/list', () => {
    it('should list config resource', async () => {
      const result = (await sendRequest('resources/list', {})) as {
        resources: Array<{ uri: string }>;
      };

      expect(result.resources).toBeDefined();
      const configResource = result.resources.find((r) => r.uri === 'file-upload://config');
      expect(configResource).toBeDefined();
    });
  });

  describe('resources/read', () => {
    it('should read config resource', async () => {
      const result = (await sendRequest('resources/read', {
        uri: 'file-upload://config',
      })) as { contents: Array<{ text: string }> };

      expect(result.contents).toBeDefined();
      expect(result.contents[0].text).toBeDefined();

      const config = JSON.parse(result.contents[0].text);
      expect(config.server.name).toBe('file-upload-mcp-server');
      expect(config.capabilities.tools).toContain('upload_to_gcs');
    });
  });
});
