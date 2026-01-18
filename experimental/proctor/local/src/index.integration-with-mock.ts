#!/usr/bin/env node
/**
 * Integration test entry point with mock client
 * This file is used for testing the MCP server with mocked external API calls
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer, logServerStart, logError } from '../shared/index.js';
import type {
  IProctorClient,
  ProctorMetadataResponse,
  RunExamParams,
  ExamStreamEntry,
  SaveResultParams,
  SaveResultResponse,
  PriorResultParams,
  PriorResultResponse,
  MachinesResponse,
  CancelExamParams,
  CancelExamResponse,
} from '../shared/index.js';

/**
 * Integration mock implementation of IProctorClient
 */
class IntegrationMockProctorClient implements IProctorClient {
  private priorResults: Map<string, PriorResultResponse> = new Map();
  private savedResultId = 0;

  async getMetadata(): Promise<ProctorMetadataResponse> {
    return {
      runtimes: [
        {
          id: 'v0.0.37',
          name: 'Proctor v0.0.37',
          image: 'registry.fly.io/proctor:v0.0.37',
        },
        {
          id: 'v0.0.36',
          name: 'Proctor v0.0.36',
          image: 'registry.fly.io/proctor:v0.0.36',
        },
      ],
      exams: [
        {
          id: 'proctor-mcp-client-auth-check',
          name: 'Auth Check',
          description: 'Verifies authentication mechanisms',
        },
        {
          id: 'proctor-mcp-client-init-tools-list',
          name: 'Init Tools List',
          description: 'Tests initialization and tool listing',
        },
      ],
    };
  }

  async *runExam(params: RunExamParams): AsyncGenerator<ExamStreamEntry, void, unknown> {
    yield {
      type: 'log',
      data: { time: new Date().toISOString(), message: 'Starting exam...' },
    };

    yield {
      type: 'log',
      data: { time: new Date().toISOString(), message: `Using runtime: ${params.runtime_id}` },
    };

    yield {
      type: 'log',
      data: { time: new Date().toISOString(), message: `Running exam: ${params.exam_id}` },
    };

    yield {
      type: 'log',
      data: { time: new Date().toISOString(), message: 'Exam completed successfully' },
    };

    yield {
      type: 'result',
      data: {
        status: 'success',
        input: {
          'mcp.json': JSON.parse(params.mcp_config),
        },
        tests: [
          { name: 'initialization', passed: true },
          { name: 'tool_listing', passed: true },
        ],
      },
    };
  }

  async saveResult(params: SaveResultParams): Promise<SaveResultResponse> {
    this.savedResultId++;
    const result: SaveResultResponse = {
      success: true,
      id: this.savedResultId,
    };

    const key = `${params.mirror_id}-${params.exam_id}`;
    this.priorResults.set(key, {
      id: this.savedResultId,
      datetime_performed: new Date().toISOString(),
      results:
        typeof params.results === 'string' ? JSON.parse(params.results) : params.results,
      runtime_image: params.runtime_id,
      match_type: 'exact',
    });

    return result;
  }

  async getPriorResult(params: PriorResultParams): Promise<PriorResultResponse> {
    const key = `${params.mirror_id}-${params.exam_id}`;
    const result = this.priorResults.get(key);

    if (!result) {
      throw new Error('No prior result found');
    }

    return result;
  }

  async getMachines(): Promise<MachinesResponse> {
    return {
      machines: [
        {
          id: 'machine-123',
          name: 'proctor-exam-1',
          state: 'running',
          region: 'sjc',
          created_at: '2024-01-15T10:30:00Z',
        },
        {
          id: 'machine-456',
          name: 'proctor-exam-2',
          state: 'stopped',
          region: 'iad',
          created_at: '2024-01-15T09:00:00Z',
        },
      ],
    };
  }

  async destroyMachine(_machineId: string): Promise<{ success: boolean }> {
    return { success: true };
  }

  async cancelExam(_params: CancelExamParams): Promise<CancelExamResponse> {
    return {
      success: true,
      message: 'Exam cancelled successfully',
    };
  }
}

async function main() {
  // Create server using factory
  const { server, registerHandlers } = createMCPServer();

  // Create mock client for testing
  const mockClient = new IntegrationMockProctorClient();

  // Register all handlers with mock client
  await registerHandlers(server, () => mockClient);

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logServerStart('proctor-mcp-server (integration-mock)');
}

// Run the server
main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
