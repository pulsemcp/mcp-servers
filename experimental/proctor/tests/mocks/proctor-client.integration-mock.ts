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
} from '../../shared/build/index.js';

/**
 * Mock data structure for integration tests
 */
export interface MockData {
  metadata: ProctorMetadataResponse;
  machines: MachinesResponse;
  priorResults: Map<string, PriorResultResponse>;
  savedResults: SaveResultResponse[];
  errors?: {
    getMetadata?: Error;
    runExam?: Error;
    saveResult?: Error;
    getPriorResult?: Error;
    getMachines?: Error;
    destroyMachine?: Error;
    cancelExam?: Error;
  };
}

/**
 * Default mock data
 */
export function createDefaultMockData(): MockData {
  return {
    metadata: {
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
    },
    machines: {
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
    },
    priorResults: new Map(),
    savedResults: [],
  };
}

/**
 * Integration mock implementation of IProctorClient
 */
export class IntegrationMockProctorClient implements IProctorClient {
  constructor(public mockData: MockData = createDefaultMockData()) {}

  async getMetadata(): Promise<ProctorMetadataResponse> {
    if (this.mockData.errors?.getMetadata) {
      throw this.mockData.errors.getMetadata;
    }
    return this.mockData.metadata;
  }

  async *runExam(params: RunExamParams): AsyncGenerator<ExamStreamEntry, void, unknown> {
    if (this.mockData.errors?.runExam) {
      throw this.mockData.errors.runExam;
    }

    // Simulate streaming logs
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
      data: { time: new Date().toISOString(), message: 'Connecting to MCP server...' },
    };

    yield {
      type: 'log',
      data: { time: new Date().toISOString(), message: 'Exam completed successfully' },
    };

    // Yield final result
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
    if (this.mockData.errors?.saveResult) {
      throw this.mockData.errors.saveResult;
    }

    const result: SaveResultResponse = {
      success: true,
      id: this.mockData.savedResults.length + 1,
    };

    this.mockData.savedResults.push(result);

    // Store for prior result lookup
    const key = `${params.mirror_id}-${params.exam_id}`;
    this.mockData.priorResults.set(key, {
      id: result.id,
      datetime_performed: new Date().toISOString(),
      results: typeof params.results === 'string' ? JSON.parse(params.results) : params.results,
      runtime_image: params.runtime_id,
      match_type: 'exact',
    });

    return result;
  }

  async getPriorResult(params: PriorResultParams): Promise<PriorResultResponse> {
    if (this.mockData.errors?.getPriorResult) {
      throw this.mockData.errors.getPriorResult;
    }

    const key = `${params.mirror_id}-${params.exam_id}`;
    const result = this.mockData.priorResults.get(key);

    if (!result) {
      throw new Error('No prior result found');
    }

    return result;
  }

  async getMachines(): Promise<MachinesResponse> {
    if (this.mockData.errors?.getMachines) {
      throw this.mockData.errors.getMachines;
    }
    return this.mockData.machines;
  }

  async destroyMachine(machineId: string): Promise<{ success: boolean }> {
    if (this.mockData.errors?.destroyMachine) {
      throw this.mockData.errors.destroyMachine;
    }

    // Remove the machine from the mock data
    this.mockData.machines.machines = this.mockData.machines.machines.filter(
      (m) => m.id !== machineId
    );

    return { success: true };
  }

  async cancelExam(_params: CancelExamParams): Promise<CancelExamResponse> {
    if (this.mockData.errors?.cancelExam) {
      throw this.mockData.errors.cancelExam;
    }

    return {
      success: true,
      message: 'Exam cancelled successfully',
    };
  }
}

/**
 * Create a new integration mock client with optional custom mock data
 */
export function createIntegrationMockProctorClient(
  mockData?: Partial<MockData>
): IntegrationMockProctorClient {
  const defaultData = createDefaultMockData();
  return new IntegrationMockProctorClient({
    ...defaultData,
    ...mockData,
    priorResults: mockData?.priorResults || defaultData.priorResults,
  });
}
