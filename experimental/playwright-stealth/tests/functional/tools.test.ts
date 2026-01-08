import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFunctionalMockClient } from '../mocks/playwright-client.functional-mock.js';
import { createRegisterTools } from '../../shared/src/tools.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { IPlaywrightClient } from '../../shared/src/server.js';

describe('Playwright Stealth Tools', () => {
  let mockClient: IPlaywrightClient;
  let server: Server;

  // Type for handler functions
  type ToolsListHandler = (req: { method: string; params: unknown }) => Promise<{
    tools: Array<{ name: string; description: string }>;
  }>;
  type ToolsCallHandler = (req: {
    method: string;
    params: { name: string; arguments: unknown };
  }) => Promise<{
    content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
    isError?: boolean;
  }>;

  beforeEach(() => {
    mockClient = createFunctionalMockClient();

    // Create a real Server instance
    server = new Server({ name: 'test', version: '1.0.0' }, { capabilities: { tools: {} } });

    // Register tools
    const registerTools = createRegisterTools(() => mockClient);
    registerTools(server);
  });

  // Helper to get handlers from server internals
  const getListToolsHandler = (): ToolsListHandler => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlers = (server as any)._requestHandlers;
    return handlers.get('tools/list');
  };

  const getCallToolHandler = (): ToolsCallHandler => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlers = (server as any)._requestHandlers;
    return handlers.get('tools/call');
  };

  describe('Tool Registration', () => {
    it('should register all expected tools', async () => {
      const handler = getListToolsHandler();
      const result = await handler({ method: 'tools/list', params: {} });

      expect(result.tools).toHaveLength(4);

      const toolNames = result.tools.map((t) => t.name);
      expect(toolNames).toContain('browser_execute');
      expect(toolNames).toContain('browser_screenshot');
      expect(toolNames).toContain('browser_get_state');
      expect(toolNames).toContain('browser_close');
    });
  });

  describe('browser_execute', () => {
    it('should execute code successfully', async () => {
      const handler = getCallToolHandler();
      const result = await handler({
        method: 'tools/call',
        params: {
          name: 'browser_execute',
          arguments: { code: "await page.goto('https://example.com')" },
        },
      });

      expect(result.isError).toBeFalsy();
      expect(mockClient.execute).toHaveBeenCalledWith("await page.goto('https://example.com')", {
        timeout: undefined,
      });
    });

    it('should pass timeout option', async () => {
      const handler = getCallToolHandler();
      await handler({
        method: 'tools/call',
        params: {
          name: 'browser_execute',
          arguments: { code: 'await page.title()', timeout: 5000 },
        },
      });

      expect(mockClient.execute).toHaveBeenCalledWith('await page.title()', {
        timeout: 5000,
      });
    });

    it('should handle execution errors', async () => {
      vi.mocked(mockClient.execute).mockResolvedValueOnce({
        success: false,
        error: 'Navigation failed',
        consoleOutput: [],
      });

      const handler = getCallToolHandler();
      const result = await handler({
        method: 'tools/call',
        params: {
          name: 'browser_execute',
          arguments: { code: "await page.goto('invalid')" },
        },
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Navigation failed');
    });

    it('should include console output in response', async () => {
      vi.mocked(mockClient.execute).mockResolvedValueOnce({
        success: true,
        result: undefined,
        consoleOutput: ['[log] Hello', '[warn] Warning message'],
      });

      const handler = getCallToolHandler();
      const result = await handler({
        method: 'tools/call',
        params: {
          name: 'browser_execute',
          arguments: { code: 'console.log("Hello")' },
        },
      });

      expect(result.content[0].text).toContain('[log] Hello');
      expect(result.content[0].text).toContain('[warn] Warning message');
    });
  });

  describe('browser_screenshot', () => {
    it('should take screenshot with default options', async () => {
      const handler = getCallToolHandler();
      const result = await handler({
        method: 'tools/call',
        params: {
          name: 'browser_screenshot',
          arguments: {},
        },
      });

      expect(result.isError).toBeFalsy();
      expect(mockClient.screenshot).toHaveBeenCalledWith({ fullPage: undefined });
      expect(result.content[0].type).toBe('image');
    });

    it('should support fullPage option', async () => {
      const handler = getCallToolHandler();
      await handler({
        method: 'tools/call',
        params: {
          name: 'browser_screenshot',
          arguments: { fullPage: true },
        },
      });

      expect(mockClient.screenshot).toHaveBeenCalledWith({ fullPage: true });
    });
  });

  describe('browser_get_state', () => {
    it('should return browser state', async () => {
      const handler = getCallToolHandler();
      const result = await handler({
        method: 'tools/call',
        params: {
          name: 'browser_get_state',
          arguments: {},
        },
      });

      expect(result.isError).toBeFalsy();
      expect(mockClient.getState).toHaveBeenCalled();
      expect(mockClient.getConfig).toHaveBeenCalled();

      const state = JSON.parse(result.content[0].text!);
      expect(state.currentUrl).toBe('https://example.com');
      expect(state.title).toBe('Example Domain');
      expect(state.isOpen).toBe(true);
      expect(state.stealthMode).toBe(false);
      expect(state.proxyEnabled).toBe(false);
    });

    it('should show proxy enabled when configured', async () => {
      // Create a new mock client with proxy enabled
      mockClient = createFunctionalMockClient({ proxyEnabled: true });

      // Re-register tools with the new client
      server = new Server({ name: 'test', version: '1.0.0' }, { capabilities: { tools: {} } });
      const registerTools = createRegisterTools(() => mockClient);
      registerTools(server);

      const handler = getCallToolHandler();
      const result = await handler({
        method: 'tools/call',
        params: {
          name: 'browser_get_state',
          arguments: {},
        },
      });

      expect(result.isError).toBeFalsy();
      const state = JSON.parse(result.content[0].text!);
      expect(state.proxyEnabled).toBe(true);
    });
  });

  describe('browser_close', () => {
    it('should close browser', async () => {
      const handler = getCallToolHandler();
      const result = await handler({
        method: 'tools/call',
        params: {
          name: 'browser_close',
          arguments: {},
        },
      });

      expect(result.isError).toBeFalsy();
      expect(mockClient.close).toHaveBeenCalled();
      expect(result.content[0].text).toContain('closed successfully');
    });
  });

  describe('Unknown tool', () => {
    it('should throw error for unknown tool', async () => {
      const handler = getCallToolHandler();
      await expect(
        handler({
          method: 'tools/call',
          params: {
            name: 'unknown_tool',
            arguments: {},
          },
        })
      ).rejects.toThrow('Unknown tool: unknown_tool');
    });
  });
});
