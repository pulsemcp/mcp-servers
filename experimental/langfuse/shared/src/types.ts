/**
 * Langfuse API response types
 */

export interface LangfuseConfig {
  secretKey: string;
  publicKey: string;
  baseUrl: string;
}

// Pagination metadata from Langfuse list endpoints
export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

// Trace as returned by GET /api/public/traces (list endpoint)
export interface TraceListItem {
  id: string;
  timestamp: string;
  name: string | null;
  input?: unknown;
  output?: unknown;
  sessionId: string | null;
  release: string | null;
  version: string | null;
  userId: string | null;
  metadata?: unknown;
  tags: string[];
  public: boolean;
  environment: string;
  htmlPath: string;
  latency?: number | null;
  totalCost?: number | null;
  observations?: string[] | null;
  scores?: string[] | null;
}

// Observation as returned by trace detail and observation endpoints
export interface ObservationView {
  id: string;
  traceId: string | null;
  type: string;
  name: string | null;
  startTime: string;
  endTime: string | null;
  completionStartTime?: string | null;
  model: string | null;
  modelParameters?: unknown;
  input?: unknown;
  output?: unknown;
  version: string | null;
  metadata?: unknown;
  level: string;
  statusMessage: string | null;
  parentObservationId: string | null;
  promptId?: string | null;
  usageDetails?: Record<string, number>;
  costDetails?: Record<string, number>;
  environment?: string;
  promptName?: string | null;
  promptVersion?: number | null;
  modelId?: string | null;
  inputPrice?: number | null;
  outputPrice?: number | null;
  totalPrice?: number | null;
  calculatedInputCost?: number | null;
  calculatedOutputCost?: number | null;
  calculatedTotalCost?: number | null;
  latency?: number | null;
  timeToFirstToken?: number | null;
}

// Score as returned by trace detail
export interface ScoreView {
  id: string;
  traceId: string;
  name: string;
  source: string;
  dataType: string;
  value?: number;
  stringValue?: string;
  observationId?: string | null;
  timestamp: string;
  createdAt: string;
  updatedAt: string;
  authorUserId?: string | null;
  comment?: string | null;
  metadata?: unknown;
  configId?: string | null;
  queueId?: string | null;
  environment?: string;
}

// Trace detail as returned by GET /api/public/traces/{traceId}
export interface TraceDetail extends Omit<TraceListItem, 'observations' | 'scores'> {
  observations: ObservationView[];
  scores: ScoreView[];
}

// List response wrappers
export interface TracesListResponse {
  data: TraceListItem[];
  meta: PaginationMeta;
}

export interface ObservationsListResponse {
  data: ObservationView[];
  meta: PaginationMeta;
}
