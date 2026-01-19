import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { IProctorClient } from '../../shared/build/index.js';
import { getMetadata } from '../../shared/build/tools/get-metadata.js';
import { getMachines } from '../../shared/build/tools/get-machines.js';
import { destroyMachine } from '../../shared/build/tools/destroy-machine.js';
import { cancelExam } from '../../shared/build/tools/cancel-exam.js';
import { runExam } from '../../shared/build/tools/run-exam.js';

// Helper to create an async generator from an array
async function* arrayToAsyncGenerator<T>(arr: T[]): AsyncGenerator<T, void, unknown> {
  for (const item of arr) {
    yield item;
  }
}

// Create mock client factory
function createMockClient(): IProctorClient {
  return {
    getMetadata: vi.fn().mockResolvedValue({
      runtimes: [
        {
          id: 'v0.0.37',
          name: 'Proctor v0.0.37',
          image: 'registry.fly.io/proctor:v0.0.37',
        },
      ],
      exams: [
        {
          id: 'proctor-mcp-client-init-tools-list',
          name: 'Init Tools List',
          description: 'Tests initialization and tool listing',
        },
      ],
    }),
    runExam: vi.fn().mockImplementation(() =>
      arrayToAsyncGenerator([
        { type: 'log', data: { time: '2024-01-01T00:00:00Z', message: 'Starting exam...' } },
        { type: 'log', data: { time: '2024-01-01T00:00:01Z', message: 'Running tests...' } },
        { type: 'result', data: { status: 'passed', tests: [{ name: 'test1', passed: true }] } },
      ])
    ),
    getMachines: vi.fn().mockResolvedValue({
      machines: [
        {
          id: 'machine-123',
          name: 'test-machine',
          state: 'running',
          region: 'sjc',
        },
      ],
    }),
    destroyMachine: vi.fn().mockResolvedValue({ success: true }),
    cancelExam: vi.fn().mockResolvedValue({ success: true, message: 'Cancelled' }),
  };
}

describe('Proctor Tools - Functional Tests', () => {
  let mockServer: Server;
  let mockClient: IProctorClient;
  let clientFactory: () => IProctorClient;

  beforeEach(() => {
    mockServer = {} as Server;
    mockClient = createMockClient();
    clientFactory = () => mockClient;
  });

  describe('get_proctor_metadata', () => {
    it('should return formatted metadata', async () => {
      const tool = getMetadata(mockServer, clientFactory);
      const result = await tool.handler({});

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Available Proctor Runtimes');
      expect(result.content[0].text).toContain('v0.0.37');
      expect(result.content[0].text).toContain('Available Exams');
      expect(result.content[0].text).toContain('Init Tools List');
    });

    it('should handle API errors gracefully', async () => {
      const errorClient = {
        ...mockClient,
        getMetadata: vi.fn().mockRejectedValue(new Error('API error')),
      };

      const tool = getMetadata(mockServer, () => errorClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error getting Proctor metadata');
      expect(result.content[0].text).toContain('API error');
    });
  });

  describe('get_machines', () => {
    it('should return formatted machine list', async () => {
      const tool = getMachines(mockServer, clientFactory);
      const result = await tool.handler({});

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('Active Machines');
      expect(result.content[0].text).toContain('machine-123');
      expect(result.content[0].text).toContain('running');
      expect(result.content[0].text).toContain('sjc');
    });

    it('should handle empty machine list', async () => {
      const emptyClient = {
        ...mockClient,
        getMachines: vi.fn().mockResolvedValue({ machines: [] }),
      };

      const tool = getMachines(mockServer, () => emptyClient);
      const result = await tool.handler({});

      expect(result.content[0].text).toContain('No active Fly.io machines found');
    });
  });

  describe('destroy_machine', () => {
    it('should destroy a machine successfully', async () => {
      const tool = destroyMachine(mockServer, clientFactory);
      const result = await tool.handler({ machine_id: 'machine-123' });

      expect(result.content[0].text).toContain('Machine Destroyed');
      expect(result.content[0].text).toContain('machine-123');
      expect(result.content[0].text).toContain('Success');
    });

    it('should reject invalid machine ID format', async () => {
      const tool = destroyMachine(mockServer, clientFactory);

      await expect(tool.handler({ machine_id: 'invalid/id' })).rejects.toThrow();
    });

    it('should handle API errors', async () => {
      const errorClient = {
        ...mockClient,
        destroyMachine: vi.fn().mockRejectedValue(new Error('Machine not found')),
      };

      const tool = destroyMachine(mockServer, () => errorClient);
      const result = await tool.handler({ machine_id: 'machine-123' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error destroying machine');
    });
  });

  describe('cancel_exam', () => {
    it('should cancel an exam successfully', async () => {
      const tool = cancelExam(mockServer, clientFactory);
      const result = await tool.handler({
        machine_id: 'machine-123',
        exam_id: 'proctor-mcp-client-init-tools-list',
      });

      expect(result.content[0].text).toContain('Exam Cancellation');
      expect(result.content[0].text).toContain('machine-123');
    });

    it('should reject invalid exam ID format', async () => {
      const tool = cancelExam(mockServer, clientFactory);

      await expect(
        tool.handler({
          machine_id: 'machine-123',
          exam_id: 'invalid/exam',
        })
      ).rejects.toThrow();
    });
  });

  describe('run_exam', () => {
    it('should run exam and return results with logs', async () => {
      const tool = runExam(mockServer, clientFactory);
      const result = await tool.handler({
        runtime_id: 'v0.0.37',
        exam_id: 'proctor-mcp-client-init-tools-list',
        mcp_json: '{"mcpServers":{}}',
      });

      expect(result.content[0].text).toContain('Exam Execution');
      expect(result.content[0].text).toContain('v0.0.37');
      expect(result.content[0].text).toContain('proctor-mcp-client-init-tools-list');
      expect(result.content[0].text).toContain('Logs');
      expect(result.content[0].text).toContain('Starting exam...');
      expect(result.content[0].text).toContain('Result');
      expect(result.content[0].text).toContain('passed');
    });

    it('should reject invalid mcp_json JSON', async () => {
      const tool = runExam(mockServer, clientFactory);
      const result = await tool.handler({
        runtime_id: 'v0.0.37',
        exam_id: 'proctor-mcp-client-init-tools-list',
        mcp_json: 'invalid json',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('mcp_json must be a valid JSON string');
    });

    it('should require custom_runtime_image when runtime_id is __custom__', async () => {
      const tool = runExam(mockServer, clientFactory);
      const result = await tool.handler({
        runtime_id: '__custom__',
        exam_id: 'proctor-mcp-client-init-tools-list',
        mcp_json: '{}',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('custom_runtime_image is required');
    });

    it('should handle API errors', async () => {
      // eslint-disable-next-line require-yield
      async function* throwingGenerator(): AsyncGenerator<never, void, unknown> {
        throw new Error('Exam execution failed');
      }
      const errorClient = {
        ...mockClient,
        runExam: vi.fn().mockImplementation(() => throwingGenerator()),
      };

      const tool = runExam(mockServer, () => errorClient);
      const result = await tool.handler({
        runtime_id: 'v0.0.37',
        exam_id: 'proctor-mcp-client-init-tools-list',
        mcp_json: '{}',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error running exam');
    });

    it('should handle streaming errors', async () => {
      const errorClient = {
        ...mockClient,
        runExam: vi.fn().mockImplementation(() =>
          arrayToAsyncGenerator([
            { type: 'log', data: { message: 'Starting...' } },
            { type: 'error', data: { error: 'Connection timeout' } },
          ])
        ),
      };

      const tool = runExam(mockServer, () => errorClient);
      const result = await tool.handler({
        runtime_id: 'v0.0.37',
        exam_id: 'proctor-mcp-client-init-tools-list',
        mcp_json: '{}',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Connection timeout');
    });

    it('should pass preloaded_credentials to client', async () => {
      const tool = runExam(mockServer, clientFactory);
      const preloadedCreds = {
        server_key: 'remotes[0]',
        access_token: 'test-token',
        refresh_token: 'test-refresh',
        token_endpoint: 'https://auth.example.com/token',
        client_id: 'client123',
        expires_at: '2024-12-31T23:59:59Z',
      };

      await tool.handler({
        runtime_id: 'v0.0.37',
        exam_id: 'proctor-mcp-client-init-tools-list',
        mcp_json: '{"mcpServers":{}}',
        preloaded_credentials: preloadedCreds,
      });

      expect(mockClient.runExam).toHaveBeenCalledWith(
        expect.objectContaining({
          preloaded_credentials: preloadedCreds,
        })
      );
    });
  });
});
