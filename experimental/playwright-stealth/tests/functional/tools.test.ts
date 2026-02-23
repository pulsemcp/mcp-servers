import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFunctionalMockClient } from '../mocks/playwright-client.functional-mock.js';
import { createRegisterTools } from '../../shared/src/tools.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { IPlaywrightClient, ScreenshotResult } from '../../shared/src/server.js';
import { ScreenshotStorageFactory, VideoStorageFactory } from '../../shared/src/storage/index.js';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

describe('Playwright Stealth Tools', () => {
  let mockClient: IPlaywrightClient;
  let server: Server;
  let testStoragePath: string;
  let testVideoStoragePath: string;

  // Type for handler functions
  type ToolsListHandler = (req: { method: string; params: unknown }) => Promise<{
    tools: Array<{ name: string; description: string }>;
  }>;
  type ToolsCallHandler = (req: {
    method: string;
    params: { name: string; arguments: unknown };
  }) => Promise<{
    content: Array<{
      type: string;
      text?: string;
      data?: string;
      mimeType?: string;
      uri?: string;
      name?: string;
      description?: string;
    }>;
    isError?: boolean;
  }>;

  beforeEach(async () => {
    mockClient = createFunctionalMockClient();

    // Create unique test storage directories
    testStoragePath = path.join(os.tmpdir(), `playwright-test-${Date.now()}`);
    testVideoStoragePath = path.join(os.tmpdir(), `playwright-video-test-${Date.now()}`);
    process.env.SCREENSHOT_STORAGE_PATH = testStoragePath;
    process.env.VIDEO_STORAGE_PATH = testVideoStoragePath;

    // Reset the storage factories to use the new paths
    ScreenshotStorageFactory.reset();
    VideoStorageFactory.reset();

    // Create a real Server instance
    server = new Server({ name: 'test', version: '1.0.0' }, { capabilities: { tools: {} } });

    // Register tools
    const registerTools = createRegisterTools(() => mockClient);
    registerTools(server);
  });

  afterEach(async () => {
    // Clean up test storage directories
    try {
      await fs.rm(testStoragePath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
    try {
      await fs.rm(testVideoStoragePath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
    delete process.env.SCREENSHOT_STORAGE_PATH;
    delete process.env.VIDEO_STORAGE_PATH;
    ScreenshotStorageFactory.reset();
    VideoStorageFactory.reset();
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

      expect(result.tools).toHaveLength(6);

      const toolNames = result.tools.map((t) => t.name);
      expect(toolNames).toContain('browser_execute');
      expect(toolNames).toContain('browser_screenshot');
      expect(toolNames).toContain('browser_get_state');
      expect(toolNames).toContain('browser_close');
      expect(toolNames).toContain('browser_start_recording');
      expect(toolNames).toContain('browser_stop_recording');
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
    it('should take screenshot with default options (saveAndReturn)', async () => {
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

      // Should return both image and resource_link with saveAndReturn (default)
      expect(result.content).toHaveLength(2);
      expect(result.content[0].type).toBe('image');
      expect(result.content[1].type).toBe('resource_link');
      expect(result.content[1].uri).toMatch(/^file:\/\//);
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

    it('should support saveOnly resultHandling', async () => {
      const handler = getCallToolHandler();
      const result = await handler({
        method: 'tools/call',
        params: {
          name: 'browser_screenshot',
          arguments: { resultHandling: 'saveOnly' },
        },
      });

      expect(result.isError).toBeFalsy();

      // Should return only resource_link with saveOnly
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('resource_link');
      expect(result.content[0].uri).toMatch(/^file:\/\//);
    });

    it('should save screenshot to storage', async () => {
      const handler = getCallToolHandler();
      const result = await handler({
        method: 'tools/call',
        params: {
          name: 'browser_screenshot',
          arguments: { resultHandling: 'saveOnly' },
        },
      });

      // Verify the file was saved
      const uri = result.content[0].uri;
      expect(uri).toBeDefined();
      const filePath = uri!.replace('file://', '');
      const fileExists = await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);
    });

    it('should include warning when screenshot is clipped', async () => {
      // Mock a clipped screenshot result
      vi.mocked(mockClient.screenshot).mockResolvedValueOnce({
        data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        wasClipped: true,
        warning:
          'Full page screenshot would exceed 8000px limit (page is 1920x12000px). Screenshot was clipped to 1920x8000px.',
      } as ScreenshotResult);

      const handler = getCallToolHandler();
      const result = await handler({
        method: 'tools/call',
        params: {
          name: 'browser_screenshot',
          arguments: { fullPage: true },
        },
      });

      expect(result.isError).toBeFalsy();
      // First content should be the warning text
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Warning:');
      expect(result.content[0].text).toContain('8000px limit');
      // Second content should be the image
      expect(result.content[1].type).toBe('image');
      // Third content should be the resource link
      expect(result.content[2].type).toBe('resource_link');
    });

    it('should not include warning when screenshot is not clipped', async () => {
      const handler = getCallToolHandler();
      const result = await handler({
        method: 'tools/call',
        params: {
          name: 'browser_screenshot',
          arguments: { fullPage: true },
        },
      });

      expect(result.isError).toBeFalsy();
      // No warning, so first content should be the image
      expect(result.content[0].type).toBe('image');
      expect(result.content[1].type).toBe('resource_link');
      expect(result.content).toHaveLength(2);
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

  describe('browser_start_recording', () => {
    it('should start recording successfully', async () => {
      const handler = getCallToolHandler();
      const result = await handler({
        method: 'tools/call',
        params: {
          name: 'browser_start_recording',
          arguments: {},
        },
      });

      expect(result.isError).toBeFalsy();
      expect(mockClient.startRecording).toHaveBeenCalled();
      expect(result.content[0].text).toContain('Recording started');
      expect(result.content[0].text).toContain('https://example.com');
      expect(result.content[0].text).toContain('Cookies and session storage have been cleared');
    });

    it('should stop previous recording when already recording', async () => {
      // Create a mock client that starts in recording state
      mockClient = createFunctionalMockClient({ recording: true });

      // We need a mock video file for the stop to copy from
      await fs.mkdir(testVideoStoragePath, { recursive: true });
      const mockVideoPath = '/tmp/playwright-videos/mock-video.webm';
      await fs.mkdir(path.dirname(mockVideoPath), { recursive: true });
      await fs.writeFile(mockVideoPath, 'mock-video-data');

      // Re-register tools with the recording client
      server = new Server({ name: 'test', version: '1.0.0' }, { capabilities: { tools: {} } });
      const registerTools = createRegisterTools(() => mockClient);
      registerTools(server);

      const handler = getCallToolHandler();
      const result = await handler({
        method: 'tools/call',
        params: {
          name: 'browser_start_recording',
          arguments: {},
        },
      });

      expect(result.isError).toBeFalsy();
      expect(mockClient.stopRecording).toHaveBeenCalled();
      expect(mockClient.startRecording).toHaveBeenCalled();
      expect(result.content[0].text).toContain('Recording started');
      expect(result.content[0].text).toContain('Previous recording saved');

      // Clean up mock video file
      try {
        await fs.unlink(mockVideoPath);
      } catch {
        // Ignore
      }
    });

    it('should handle start recording errors', async () => {
      vi.mocked(mockClient.startRecording).mockRejectedValueOnce(new Error('Browser not ready'));

      const handler = getCallToolHandler();
      const result = await handler({
        method: 'tools/call',
        params: {
          name: 'browser_start_recording',
          arguments: {},
        },
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Browser not ready');
    });
  });

  describe('browser_stop_recording', () => {
    it('should return error when not recording', async () => {
      const handler = getCallToolHandler();
      const result = await handler({
        method: 'tools/call',
        params: {
          name: 'browser_stop_recording',
          arguments: {},
        },
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Not currently recording');
    });

    it('should stop recording and return video resource link', async () => {
      // Create a mock client in recording state
      mockClient = createFunctionalMockClient({ recording: true });

      // Create the mock video file that stopRecording returns
      const mockVideoPath = '/tmp/playwright-videos/mock-video.webm';
      await fs.mkdir(path.dirname(mockVideoPath), { recursive: true });
      await fs.writeFile(mockVideoPath, 'mock-video-data');

      // Re-register tools
      server = new Server({ name: 'test', version: '1.0.0' }, { capabilities: { tools: {} } });
      const registerTools = createRegisterTools(() => mockClient);
      registerTools(server);

      const handler = getCallToolHandler();
      const result = await handler({
        method: 'tools/call',
        params: {
          name: 'browser_stop_recording',
          arguments: {},
        },
      });

      expect(result.isError).toBeFalsy();
      expect(mockClient.stopRecording).toHaveBeenCalled();

      // Should have text confirmation and resource_link
      expect(result.content).toHaveLength(2);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Recording stopped and saved');
      expect(result.content[1].type).toBe('resource_link');
      expect(result.content[1].uri).toMatch(/^file:\/\//);
      expect(result.content[1].mimeType).toBe('video/webm');

      // Clean up mock video file
      try {
        await fs.unlink(mockVideoPath);
      } catch {
        // Ignore
      }
    });

    it('should handle stop recording errors', async () => {
      // Create a mock client that's recording but stopRecording fails
      mockClient = createFunctionalMockClient({ recording: true });
      vi.mocked(mockClient.stopRecording).mockRejectedValueOnce(new Error('Video save failed'));

      // Re-register tools
      server = new Server({ name: 'test', version: '1.0.0' }, { capabilities: { tools: {} } });
      const registerTools = createRegisterTools(() => mockClient);
      registerTools(server);

      const handler = getCallToolHandler();
      const result = await handler({
        method: 'tools/call',
        params: {
          name: 'browser_stop_recording',
          arguments: {},
        },
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Video save failed');
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
