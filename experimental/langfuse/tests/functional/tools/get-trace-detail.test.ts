import { describe, it, expect, beforeEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { getTraceDetailTool } from '../../../shared/src/tools/get-trace-detail.js';
import { createMockLangfuseClient } from '../../mocks/langfuse-client.functional-mock.js';
import type { ILangfuseClient } from '../../../shared/src/langfuse-client/langfuse-client.js';

describe('get_trace_detail tool', () => {
  let server: Server;
  let mockClient: ILangfuseClient;
  let tool: ReturnType<typeof getTraceDetailTool>;

  beforeEach(() => {
    server = new Server({ name: 'test-server', version: '1.0.0' }, { capabilities: { tools: {} } });

    mockClient = createMockLangfuseClient();
    tool = getTraceDetailTool(server, () => mockClient);
  });

  it('should return full trace detail', async () => {
    const response = await tool.handler({ traceId: 'trace-1' });

    const parsed = JSON.parse(response.content[0].text);
    expect(parsed.id).toBe('trace-1');
    expect(parsed.observations).toHaveLength(1);
    expect(parsed.observations[0].id).toBe('obs-1');
    expect(parsed.scores).toHaveLength(1);
    expect(parsed.scores[0].name).toBe('accuracy');
  });

  it('should pass traceId to client', async () => {
    await tool.handler({ traceId: 'my-trace-id' });

    expect(mockClient.getTraceDetail).toHaveBeenCalledWith('my-trace-id');
  });

  it('should return error for missing traceId', async () => {
    const response = await tool.handler({});

    expect(response.content[0].text).toContain('Error getting trace detail');
    expect(response.isError).toBe(true);
  });

  it('should handle API errors gracefully', async () => {
    mockClient.getTraceDetail = vi.fn().mockRejectedValue(new Error('Trace not found'));

    const response = await tool.handler({ traceId: 'nonexistent' });

    expect(response.content[0].text).toContain('Error getting trace detail');
    expect(response.content[0].text).toContain('Trace not found');
    expect(response.isError).toBe(true);
  });
});
