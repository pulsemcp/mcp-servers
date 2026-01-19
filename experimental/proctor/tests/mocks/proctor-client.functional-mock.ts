import { vi } from 'vitest';
import type {
  IProctorClient,
  ProctorMetadataResponse,
  ExamStreamEntry,
  MachinesResponse,
  CancelExamResponse,
} from '../../shared/build/index.js';

// Helper to create an async generator from an array
async function* arrayToAsyncGenerator<T>(arr: T[]): AsyncGenerator<T, void, unknown> {
  for (const item of arr) {
    yield item;
  }
}

/**
 * Functional mock implementation of IProctorClient for unit testing
 * All methods are mocked with vi.fn() for easy assertion
 */
export interface FunctionalMockProctorClient extends IProctorClient {
  getMetadata: ReturnType<typeof vi.fn>;
  runExam: ReturnType<typeof vi.fn>;
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

  const defaultExamResults: ExamStreamEntry[] = [
    { type: 'log', data: { time: '2024-01-15T10:30:00Z', message: 'Starting exam...' } },
    { type: 'log', data: { time: '2024-01-15T10:30:01Z', message: 'Running tests...' } },
    { type: 'result', data: { status: 'passed', tests: [{ name: 'test1', passed: true }] } },
  ];

  const defaultCancelResult: CancelExamResponse = {
    success: true,
    message: 'Exam cancelled',
  };

  return {
    getMetadata: vi.fn().mockResolvedValue(defaultMetadata),
    runExam: vi.fn().mockImplementation(() => arrayToAsyncGenerator(defaultExamResults)),
    getMachines: vi.fn().mockResolvedValue(defaultMachines),
    destroyMachine: vi.fn().mockResolvedValue({ success: true }),
    cancelExam: vi.fn().mockResolvedValue(defaultCancelResult),
  };
}
