import { describe, it, expect, beforeEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { getObservationsTool } from '../../../shared/src/tools/get-observations.js';
import { createMockLangfuseClient } from '../../mocks/langfuse-client.functional-mock.js';
import type { ILangfuseClient } from '../../../shared/src/langfuse-client/langfuse-client.js';

describe('get_observations tool', () => {
  let server: Server;
  let mockClient: ILangfuseClient;
  let tool: ReturnType<typeof getObservationsTool>;

  beforeEach(() => {
    server = new Server({ name: 'test-server', version: '1.0.0' }, { capabilities: { tools: {} } });

    mockClient = createMockLangfuseClient();
    tool = getObservationsTool(server, () => mockClient);
  });

  it('should list observations with default params', async () => {
    const response = await tool.handler({});

    const parsed = JSON.parse(response.content[0].text);
    expect(parsed.data).toHaveLength(1);
    expect(parsed.data[0].id).toBe('obs-1');
    expect(parsed.data[0].type).toBe('GENERATION');
    // Verify minimal fields are returned (no input/output)
    expect(parsed.data[0]).not.toHaveProperty('input');
    expect(parsed.data[0]).not.toHaveProperty('output');
    expect(parsed.data[0]).toHaveProperty('usageDetails');
  });

  it('should pass traceId filter to client', async () => {
    await tool.handler({ traceId: 'trace-1', type: 'GENERATION' });

    expect(mockClient.getObservations).toHaveBeenCalledWith(
      expect.objectContaining({
        traceId: 'trace-1',
        type: 'GENERATION',
      })
    );
  });

  it('should handle API errors gracefully', async () => {
    mockClient.getObservations = vi.fn().mockRejectedValue(new Error('Internal server error'));

    const response = await tool.handler({});

    expect(response.content[0].text).toContain('Error listing observations');
    expect(response.isError).toBe(true);
  });
});
