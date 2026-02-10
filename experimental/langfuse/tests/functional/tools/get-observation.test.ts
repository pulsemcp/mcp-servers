import { describe, it, expect, beforeEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { getObservationTool } from '../../../shared/src/tools/get-observation.js';
import { createMockLangfuseClient } from '../../mocks/langfuse-client.functional-mock.js';
import type { ILangfuseClient } from '../../../shared/src/langfuse-client/langfuse-client.js';

describe('get_observation tool', () => {
  let server: Server;
  let mockClient: ILangfuseClient;
  let tool: ReturnType<typeof getObservationTool>;

  beforeEach(() => {
    server = new Server({ name: 'test-server', version: '1.0.0' }, { capabilities: { tools: {} } });

    mockClient = createMockLangfuseClient();
    tool = getObservationTool(server, () => mockClient);
  });

  it('should return full observation detail', async () => {
    const response = await tool.handler({ observationId: 'obs-1' });

    const parsed = JSON.parse(response.content[0].text);
    expect(parsed.id).toBe('obs-1');
    expect(parsed.model).toBe('gpt-4');
    expect(parsed.input).toBeDefined();
    expect(parsed.output).toBeDefined();
    expect(parsed.modelParameters).toBeDefined();
  });

  it('should pass observationId to client', async () => {
    await tool.handler({ observationId: 'my-obs' });

    expect(mockClient.getObservation).toHaveBeenCalledWith('my-obs');
  });

  it('should return error for missing observationId', async () => {
    const response = await tool.handler({});

    expect(response.content[0].text).toContain('Error getting observation');
    expect(response.isError).toBe(true);
  });

  it('should handle API errors gracefully', async () => {
    mockClient.getObservation = vi.fn().mockRejectedValue(new Error('Observation not found'));

    const response = await tool.handler({ observationId: 'nonexistent' });

    expect(response.content[0].text).toContain('Error getting observation');
    expect(response.content[0].text).toContain('Observation not found');
    expect(response.isError).toBe(true);
  });
});
