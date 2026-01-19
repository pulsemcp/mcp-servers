/**
 * Type definitions for Proctor MCP Server
 */

/**
 * Runtime configuration for running Proctor exams
 */
export interface ProctorRuntime {
  id: string;
  name: string;
  image: string;
}

/**
 * Exam configuration available in Proctor
 */
export interface ProctorExam {
  id: string;
  name: string;
  description: string;
}

/**
 * Metadata response from the Proctor API
 */
export interface ProctorMetadataResponse {
  runtimes: ProctorRuntime[];
  exams: ProctorExam[];
}

/**
 * Log entry from a running exam
 */
export interface ExamLogEntry {
  time?: string;
  message?: string;
  [key: string]: unknown;
}

/**
 * Streaming response types from run_exam endpoint
 */
export interface ExamStreamLog {
  type: 'log';
  data: ExamLogEntry;
}

export interface ExamStreamResult {
  type: 'result';
  data: ExamResult;
}

export interface ExamStreamError {
  type: 'error';
  data: { error: string };
}

export type ExamStreamEntry = ExamStreamLog | ExamStreamResult | ExamStreamError;

/**
 * Final exam result
 */
export interface ExamResult {
  status?: string;
  input?: {
    'mcp.json'?: Record<string, unknown>;
    'server.json'?: Record<string, unknown>;
  };
  [key: string]: unknown;
}

/**
 * Parameters for running an exam
 */
export interface RunExamParams {
  runtime_id: string;
  exam_id: string;
  mcp_json: string;
  server_json?: string;
  custom_runtime_image?: string;
  max_retries?: number;
}

/**
 * Fly.io machine information
 */
export interface FlyMachine {
  id: string;
  name?: string;
  state?: string;
  region?: string;
  created_at?: string;
  [key: string]: unknown;
}

/**
 * Response from machines endpoint
 */
export interface MachinesResponse {
  machines: FlyMachine[];
}

/**
 * Parameters for canceling an exam
 */
export interface CancelExamParams {
  machine_id: string;
  exam_id: string;
}

/**
 * Response from cancel_exam endpoint
 */
export interface CancelExamResponse {
  success?: boolean;
  message?: string;
  [key: string]: unknown;
}

/**
 * Error response from API
 */
export interface ApiError {
  error: string;
}
