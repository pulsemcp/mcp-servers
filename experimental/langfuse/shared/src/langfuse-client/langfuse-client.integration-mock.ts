import type { ILangfuseClient, GetTracesParams, GetObservationsParams } from './langfuse-client.js';
import type {
  TracesListResponse,
  TraceDetail,
  ObservationsListResponse,
  ObservationView,
} from '../types.js';

interface MockData {
  traces?: TracesListResponse;
  traceDetails?: Record<string, TraceDetail>;
  observations?: ObservationsListResponse;
  observationDetails?: Record<string, ObservationView>;
  [key: string]: unknown;
}

/**
 * Creates a mock ILangfuseClient for integration tests.
 * Mocks the external Langfuse API, not the MCP protocol.
 */
export function createIntegrationMockLangfuseClient(
  mockData: MockData = {}
): ILangfuseClient & { mockData: MockData } {
  const defaultTrace = {
    id: 'trace-1',
    timestamp: '2025-01-15T10:00:00Z',
    name: 'test-trace',
    sessionId: null,
    release: null,
    version: null,
    userId: 'user-1',
    tags: ['test'],
    public: false,
    environment: 'development',
    htmlPath: '/project/traces/trace-1',
    latency: 1.5,
    totalCost: 0.001,
    observations: ['obs-1'],
    scores: [],
  };

  const defaultObservation: ObservationView = {
    id: 'obs-1',
    traceId: 'trace-1',
    type: 'GENERATION',
    name: 'test-generation',
    startTime: '2025-01-15T10:00:00Z',
    endTime: '2025-01-15T10:00:01Z',
    model: 'gpt-4',
    level: 'DEFAULT',
    statusMessage: null,
    parentObservationId: null,
    version: null,
    latency: 1.0,
    usageDetails: { input: 100, output: 50 },
    costDetails: { input: 0.0003, output: 0.0006 },
  };

  return {
    mockData,

    async getTraces(_params?: GetTracesParams): Promise<TracesListResponse> {
      if (mockData.traces) {
        return mockData.traces;
      }
      return {
        data: [defaultTrace],
        meta: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
      };
    },

    async getTraceDetail(traceId: string): Promise<TraceDetail> {
      if (mockData.traceDetails?.[traceId]) {
        return mockData.traceDetails[traceId];
      }
      return {
        ...defaultTrace,
        id: traceId,
        observations: [defaultObservation],
        scores: [],
      };
    },

    async getObservations(_params?: GetObservationsParams): Promise<ObservationsListResponse> {
      if (mockData.observations) {
        return mockData.observations;
      }
      return {
        data: [defaultObservation],
        meta: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
      };
    },

    async getObservation(observationId: string): Promise<ObservationView> {
      if (mockData.observationDetails?.[observationId]) {
        return mockData.observationDetails[observationId];
      }
      return { ...defaultObservation, id: observationId };
    },
  };
}
