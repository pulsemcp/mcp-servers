import { getTraces } from './lib/get-traces.js';
import { getTraceDetail } from './lib/get-trace-detail.js';
import { getObservations } from './lib/get-observations.js';
import { getObservation } from './lib/get-observation.js';
import type {
  TracesListResponse,
  TraceDetail,
  ObservationsListResponse,
  ObservationView,
} from '../types.js';

export interface GetTracesParams {
  page?: number;
  limit?: number;
  userId?: string;
  name?: string;
  sessionId?: string;
  fromTimestamp?: string;
  toTimestamp?: string;
  orderBy?: string;
  tags?: string[];
  version?: string;
  release?: string;
  environment?: string[];
}

export interface GetObservationsParams {
  page?: number;
  limit?: number;
  name?: string;
  userId?: string;
  type?: string;
  traceId?: string;
  level?: string;
  parentObservationId?: string;
  fromStartTime?: string;
  toStartTime?: string;
  version?: string;
  environment?: string[];
}

export interface ILangfuseClient {
  getTraces(params?: GetTracesParams): Promise<TracesListResponse>;
  getTraceDetail(traceId: string): Promise<TraceDetail>;
  getObservations(params?: GetObservationsParams): Promise<ObservationsListResponse>;
  getObservation(observationId: string): Promise<ObservationView>;
}

export class LangfuseClient implements ILangfuseClient {
  private baseUrl: string;
  private authHeader: string;

  constructor(secretKey: string, publicKey: string, baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.authHeader = 'Basic ' + Buffer.from(`${publicKey}:${secretKey}`).toString('base64');
  }

  async getTraces(params?: GetTracesParams): Promise<TracesListResponse> {
    return getTraces(this.baseUrl, this.authHeader, params);
  }

  async getTraceDetail(traceId: string): Promise<TraceDetail> {
    return getTraceDetail(this.baseUrl, this.authHeader, traceId);
  }

  async getObservations(params?: GetObservationsParams): Promise<ObservationsListResponse> {
    return getObservations(this.baseUrl, this.authHeader, params);
  }

  async getObservation(observationId: string): Promise<ObservationView> {
    return getObservation(this.baseUrl, this.authHeader, observationId);
  }
}
