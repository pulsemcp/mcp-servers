import { vi } from 'vitest';
import type {
  IProctorClient,
  ProctorMetadataResponse,
  RunExamParams,
  ExamStreamEntry,
  SaveResultResponse,
  PriorResultResponse,
  MachinesResponse,
  CancelExamResponse,
} from '../../shared/build/index.js';

/**
 * Functional mock implementation of IProctorClient for unit testing
 * All methods are mocked with vi.fn() for easy assertion
 */
export interface FunctionalMockProctorClient extends IProctorClient {
  getMetadata: ReturnType<typeof vi.fn>;
  runExam: ReturnType<typeof vi.fn>;
  saveResult: ReturnType<typeof vi.fn>;
  getPriorResult: ReturnType<typeof vi.fn>;
  getMachines: ReturnType<typeof vi.fn>;
  destroyMachine: ReturnType<typeof vi.fn>;
  cancelExam: ReturnType<typeof vi.fn>;
}

/**
 * Create a functional mock client for unit testing
 */
export function createFunctionalMockProctorClient(): FunctionalMockProctorClient {
  const defaultMetadata: ProctorMetadataResponse = {
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
  };

  const defaultMachines: MachinesResponse = {
    machines: [
      {
        id: 'machine-123',
        name: 'proctor-exam-1',
        state: 'running',
        region: 'sjc',
      },
    ],
  };

  const defaultSaveResult: SaveResultResponse = {
    success: true,
    id: 1,
  };

  const defaultPriorResult: PriorResultResponse = {
    id: 1,
    datetime_performed: '2024-01-15T10:00:00Z',
    results: { status: 'success' },
    runtime_image: 'registry.fly.io/proctor:v0.0.37',
    match_type: 'exact',
  };

  const defaultCancelResult: CancelExamResponse = {
    success: true,
    message: 'Exam cancelled',
  };

  // Create async generator for runExam
  async function* defaultRunExam(
    _params: RunExamParams
  ): AsyncGenerator<ExamStreamEntry, void, unknown> {
    yield { type: 'log', data: { message: 'Starting exam...' } };
    yield { type: 'result', data: { status: 'success' } };
  }

  return {
    getMetadata: vi.fn().mockResolvedValue(defaultMetadata),
    runExam: vi.fn().mockImplementation(defaultRunExam),
    saveResult: vi.fn().mockResolvedValue(defaultSaveResult),
    getPriorResult: vi.fn().mockResolvedValue(defaultPriorResult),
    getMachines: vi.fn().mockResolvedValue(defaultMachines),
    destroyMachine: vi.fn().mockResolvedValue({ success: true }),
    cancelExam: vi.fn().mockResolvedValue(defaultCancelResult),
  };
}
