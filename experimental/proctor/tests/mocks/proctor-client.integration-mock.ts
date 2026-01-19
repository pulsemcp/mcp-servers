import type {
  IProctorClient,
  ProctorMetadataResponse,
  SaveResultParams,
  SaveResultResponse,
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
  savedResults: SaveResultResponse[];
  errors?: {
    getMetadata?: Error;
    saveResult?: Error;
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

  async saveResult(_params: SaveResultParams): Promise<SaveResultResponse> {
    if (this.mockData.errors?.saveResult) {
      throw this.mockData.errors.saveResult;
    }

    const result: SaveResultResponse = {
      success: true,
      id: this.mockData.savedResults.length + 1,
    };

    this.mockData.savedResults.push(result);

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
  });
}
