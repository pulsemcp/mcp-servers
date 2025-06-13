import { describe, it, expect, beforeEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createRegisterTools } from '../../shared/src/tools.js';
import { createMockExampleClient } from '../mocks/example-client.functional-mock.js';

describe('Tools', () => {
  let server: Server;
  let mockClient: ReturnType<typeof createMockExampleClient>;

  beforeEach(() => {
    server = new Server(
      {
        name: 'test-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    mockClient = createMockExampleClient();
    const registerTools = createRegisterTools(() => mockClient);
    registerTools(server);
  });

  describe('example_tool', () => {
    it('should process message correctly', async () => {
      const request = {
        method: 'tools/call',
        params: {
          name: 'example_tool',
          arguments: {
            message: 'Test message',
          },
        },
      };

      const response = await server.request(request, {} as never);

      expect(response).toMatchObject({
        content: [
          {
            type: 'text',
            text: 'Processed message: Test message',
          },
        ],
      });
    });

    it('should validate input schema', async () => {
      const request = {
        method: 'tools/call',
        params: {
          name: 'example_tool',
          arguments: {
            // Missing required 'message' field
          },
        },
      };

      await expect(server.request(request, {} as never)).rejects.toThrow();
    });
  });
});