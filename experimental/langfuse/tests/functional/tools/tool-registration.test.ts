import { describe, it, expect } from 'vitest';
import { getTracesTool } from '../../../shared/src/tools/get-traces.js';
import { getTraceDetailTool } from '../../../shared/src/tools/get-trace-detail.js';
import { getObservationsTool } from '../../../shared/src/tools/get-observations.js';
import { getObservationTool } from '../../../shared/src/tools/get-observation.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createMockLangfuseClient } from '../../mocks/langfuse-client.functional-mock.js';

describe('Tool Registration', () => {
  it('should expose correct tool names and schemas', () => {
    const server = new Server(
      { name: 'test-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    const mockClient = createMockLangfuseClient();
    const factory = () => mockClient;

    const tools = [
      getTracesTool(server, factory),
      getTraceDetailTool(server, factory),
      getObservationsTool(server, factory),
      getObservationTool(server, factory),
    ];

    expect(tools).toHaveLength(4);

    const names = tools.map((t) => t.name);
    expect(names).toContain('get_traces');
    expect(names).toContain('get_trace_detail');
    expect(names).toContain('get_observations');
    expect(names).toContain('get_observation');

    // All should have inputSchema
    for (const tool of tools) {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.description).toBeTruthy();
    }

    // get_trace_detail and get_observation should have required params
    const traceDetail = tools.find((t) => t.name === 'get_trace_detail')!;
    expect(traceDetail.inputSchema.required).toContain('traceId');

    const observation = tools.find((t) => t.name === 'get_observation')!;
    expect(observation.inputSchema.required).toContain('observationId');
  });
});
