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
 * Parameters for saving exam results
 */
export interface SaveResultParams {
  runtime_id: string;
  exam_id: string;
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
