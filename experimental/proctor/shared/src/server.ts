import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createRegisterTools } from './tools.js';
import type {
  ProctorMetadataResponse,
  RunExamParams,
  ExamStreamEntry,
  MachinesResponse,
  CancelExamParams,
  CancelExamResponse,
} from './types.js';

// Proctor API client interface
export interface IProctorClient {
  getMetadata(): Promise<ProctorMetadataResponse>;

  runExam(params: RunExamParams): AsyncGenerator<ExamStreamEntry, void, unknown>;

  getMachines(): Promise<MachinesResponse>;

  destroyMachine(machineId: string): Promise<{ success: boolean }>;

  cancelExam(params: CancelExamParams): Promise<CancelExamResponse>;
}

// Proctor API client implementation
export class ProctorClient implements IProctorClient {
  private baseUrl: string;

  constructor(
    private apiKey: string,
    baseUrl?: string
  ) {
    this.baseUrl = baseUrl || 'https://admin.pulsemcp.com';
  }

  async getMetadata(): Promise<ProctorMetadataResponse> {
    const { getMetadata } = await import('./proctor-client/lib/get-metadata.js');
    return getMetadata(this.apiKey, this.baseUrl);
  }

  async *runExam(params: RunExamParams): AsyncGenerator<ExamStreamEntry, void, unknown> {
    const { runExam } = await import('./proctor-client/lib/run-exam.js');
    yield* runExam(this.apiKey, this.baseUrl, params);
  }

  async getMachines(): Promise<MachinesResponse> {
    const { getMachines } = await import('./proctor-client/lib/get-machines.js');
    return getMachines(this.apiKey, this.baseUrl);
  }

  async destroyMachine(machineId: string): Promise<{ success: boolean }> {
    const { destroyMachine } = await import('./proctor-client/lib/destroy-machine.js');
    return destroyMachine(this.apiKey, this.baseUrl, machineId);
  }

  async cancelExam(params: CancelExamParams): Promise<CancelExamResponse> {
    const { cancelExam } = await import('./proctor-client/lib/cancel-exam.js');
    return cancelExam(this.apiKey, this.baseUrl, params);
  }
}

export type ClientFactory = () => IProctorClient;

export function createMCPServer() {
  const server = new Server(
    {
      name: 'proctor-mcp-server',
      version: '0.1.1',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const registerHandlers = async (server: Server, clientFactory?: ClientFactory) => {
    // Use provided factory or create default client
    const factory =
      clientFactory ||
      (() => {
        // Get configuration from environment variables
        const apiKey = process.env.PROCTOR_API_KEY;
        const baseUrl = process.env.PROCTOR_API_URL;

        if (!apiKey) {
          throw new Error('PROCTOR_API_KEY environment variable must be configured');
        }

        return new ProctorClient(apiKey, baseUrl);
      });

    const registerTools = createRegisterTools(factory);
    registerTools(server);
  };

  return { server, registerHandlers };
}
