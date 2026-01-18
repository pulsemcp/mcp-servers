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
  mcp_config: string;
  server_json?: string;
  custom_runtime_image?: string;
  max_retries?: number;
  mcp_server_slug?: string;
  mcp_json_id?: number;
}

/**
 * Parameters for saving exam results
 */
export interface SaveResultParams {
  runtime_id: string;
  exam_id: string;
  mcp_server_slug: string;
  mirror_id: number;
  results: string | Record<string, unknown>;
  custom_runtime_image?: string;
}

/**
 * Response from save_result endpoint
 */
export interface SaveResultResponse {
  success: boolean;
  id: number;
}

/**
 * Parameters for getting prior results
 */
export interface PriorResultParams {
  mirror_id: number;
  exam_id: string;
  input_json?: string;
}

/**
 * Response from prior_result endpoint
 */
export interface PriorResultResponse {
  id: number;
  datetime_performed: string;
  results: ExamResult;
  runtime_image: string;
  match_type: 'exact' | 'entry_key';
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
