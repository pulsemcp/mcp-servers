import { describe, it, expect, beforeEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { getTracesTool } from '../../../shared/src/tools/get-traces.js';
import { createMockLangfuseClient } from '../../mocks/langfuse-client.functional-mock.js';
import type { ILangfuseClient } from '../../../shared/src/langfuse-client/langfuse-client.js';

describe('get_traces tool', () => {
  let server: Server;
  let mockClient: ILangfuseClient;
  let tool: ReturnType<typeof getTracesTool>;

  beforeEach(() => {
    server = new Server({ name: 'test-server', version: '1.0.0' }, { capabilities: { tools: {} } });

    mockClient = createMockLangfuseClient();
    tool = getTracesTool(server, () => mockClient);
  });

  it('should list traces with default params', async () => {
    const response = await tool.handler({});

    const parsed = JSON.parse(response.content[0].text);
    expect(parsed.data).toHaveLength(1);
    expect(parsed.data[0].id).toBe('trace-1');
    expect(parsed.data[0].name).toBe('test-trace');
    expect(parsed.meta.totalItems).toBe(1);
    // Verify minimal fields are returned (no input/output)
    expect(parsed.data[0]).not.toHaveProperty('input');
    expect(parsed.data[0]).not.toHaveProperty('output');
    expect(parsed.data[0]).toHaveProperty('observationCount');
  });

  it('should pass filter params to client', async () => {
    await tool.handler({
      userId: 'user-1',
      name: 'my-trace',
      limit: 5,
      tags: ['prod'],
    });

    expect(mockClient.getTraces).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        name: 'my-trace',
        limit: 5,
        tags: ['prod'],
      })
    );
  });

  it('should handle API errors gracefully', async () => {
    mockClient.getTraces = vi.fn().mockRejectedValue(new Error('API rate limit exceeded'));

    const response = await tool.handler({});

    expect(response.content[0].text).toContain('Error listing traces');
    expect(response.content[0].text).toContain('API rate limit exceeded');
    expect(response.isError).toBe(true);
  });
});
