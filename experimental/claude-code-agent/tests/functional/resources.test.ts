import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createRegisterResources } from '../../shared/src/resources.js';
import { FunctionalMockClaudeCodeClient } from '../mocks/claude-code-client.functional-mock.js';
import { promises as fs } from 'fs';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
  },
}));

describe('Resources', () => {
  let mockClient: FunctionalMockClaudeCodeClient;
  let mockHandlers: Record<
    string,
    (request: { params: Record<string, unknown> }) => Promise<unknown>
  > = {};

  // Create a mock server that captures the handlers
  class MockServer {
    setRequestHandler(
      schema: unknown,
      handler: (request: { params: Record<string, unknown> }) => Promise<unknown>
    ) {
      // The schema object itself is used as key, not schema.method
      if (schema === ListResourcesRequestSchema) {
        mockHandlers['resources/list'] = handler;
      } else if (schema === ReadResourceRequestSchema) {
        mockHandlers['resources/read'] = handler;
      }
    }
  }

  beforeEach(() => {
    mockClient = new FunctionalMockClaudeCodeClient();
    mockHandlers = {};

    const mockServer = new MockServer() as unknown as Server;
    const registerResources = createRegisterResources(() => mockClient);
    registerResources(mockServer);
  });

  describe('list resources', () => {
    it('should return empty list when no agent is initialized', async () => {
      const handler = mockHandlers['resources/list'];
      expect(handler).toBeDefined();

      const response = await handler({ params: {} });

      expect(response.resources).toHaveLength(0);
    });

    it('should list agent state and transcript after initialization', async () => {
      // Initialize agent first
      await mockClient.initAgent('Test agent');

      const handler = mockHandlers['resources/list'];
      const response = await handler({ params: {} });

      expect(response.resources).toHaveLength(2);

      const resourceUris = response.resources.map((r: { uri: string }) => r.uri);
      expect(resourceUris).toContain('file:///tmp/test-agent/state.json');
      expect(resourceUris).toContain('file:///tmp/test-agent/transcript.json');

      const stateResource = response.resources.find(
        (r: { name: string }) => r.name === 'Subagent State'
      );
      expect(stateResource).toMatchObject({
        name: 'Subagent State',
        description:
          'Current state of the Claude Code subagent including status, installed servers, and metadata',
        mimeType: 'application/json',
      });

      const transcriptResource = response.resources.find(
        (r: { name: string }) => r.name === 'Subagent Transcript'
      );
      expect(transcriptResource).toMatchObject({
        name: 'Subagent Transcript',
        description: 'Full conversation history with the subagent for debugging purposes',
        mimeType: 'application/json',
      });
    });
  });

  describe('read resource', () => {
    it('should read agent state file', async () => {
      // Initialize agent first so path traversal validation has working directory
      await mockClient.initAgent('Test prompt');

      const mockState = {
        sessionId: 'test-123',
        status: 'idle',
        systemPrompt: 'Test prompt',
        installedServers: ['com.postgres/mcp'],
        createdAt: '2024-01-01T00:00:00Z',
        lastActiveAt: '2024-01-01T01:00:00Z',
        workingDirectory: '/tmp/test-agent',
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockState, null, 2));

      const handler = mockHandlers['resources/read'];
      expect(handler).toBeDefined();

      const response = await handler({
        params: {
          uri: 'file:///tmp/test-agent/state.json',
        },
      });

      expect(response.contents).toHaveLength(1);
      expect(response.contents[0]).toMatchObject({
        uri: 'file:///tmp/test-agent/state.json',
        mimeType: 'application/json',
        text: JSON.stringify(mockState, null, 2),
      });
    });

    it('should read transcript file', async () => {
      // Initialize agent first so path traversal validation has working directory
      await mockClient.initAgent('Test prompt');

      const mockTranscript = [
        {
          role: 'user',
          content: 'Hello',
          timestamp: '2024-01-01T00:00:00Z',
        },
        {
          role: 'assistant',
          content: 'Hi there!',
          timestamp: '2024-01-01T00:00:01Z',
        },
      ];

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockTranscript, null, 2));

      const handler = mockHandlers['resources/read'];
      const response = await handler({
        params: {
          uri: 'file:///tmp/test-agent/transcript.json',
        },
      });

      expect(response.contents).toHaveLength(1);
      expect(response.contents[0]).toMatchObject({
        uri: 'file:///tmp/test-agent/transcript.json',
        mimeType: 'application/json',
        text: JSON.stringify(mockTranscript, null, 2),
      });
    });

    it('should handle non-JSON files', async () => {
      // Initialize agent first so path traversal validation has working directory
      await mockClient.initAgent('Test prompt');

      vi.mocked(fs.readFile).mockResolvedValue('This is a plain text file');

      const handler = mockHandlers['resources/read'];
      const response = await handler({
        params: {
          uri: 'file:///tmp/test-agent/notes.txt',
        },
      });

      expect(response.contents[0]).toMatchObject({
        uri: 'file:///tmp/test-agent/notes.txt',
        mimeType: 'text/plain',
        text: 'This is a plain text file',
      });
    });

    it('should reject non-file URIs', async () => {
      const handler = mockHandlers['resources/read'];

      await expect(
        handler({
          params: {
            uri: 'http://example.com/state.json',
          },
        })
      ).rejects.toThrow('Unsupported URI scheme');
    });

    it('should handle missing files', async () => {
      // Initialize agent first so path traversal validation has working directory
      await mockClient.initAgent('Test prompt');

      const error = new Error('ENOENT: no such file or directory');
      (error as NodeJS.ErrnoException).code = 'ENOENT';
      vi.mocked(fs.readFile).mockRejectedValue(error);

      const handler = mockHandlers['resources/read'];

      await expect(
        handler({
          params: {
            uri: 'file:///tmp/test-agent/missing.json',
          },
        })
      ).rejects.toThrow('Resource not found');
    });
  });
});
