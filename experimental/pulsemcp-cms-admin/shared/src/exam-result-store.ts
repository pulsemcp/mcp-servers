import { randomUUID } from 'crypto';
import type { ProctorExamStreamLine } from './types.js';

export interface StoredExamResult {
  result_id: string;
  mirror_ids: number[];
  runtime_id: string;
  exam_type: string;
  lines: ProctorExamStreamLine[];
  stored_at: string;
}

/**
 * In-memory store for proctor exam results.
 *
 * When `run_exam_for_mirror` completes, the full result is stored here
 * and a UUID `result_id` is returned. This avoids dumping large payloads
 * (~60KB+ for servers with many tools) into the LLM context.
 *
 * Consumers can:
 * - Use `get_exam_result` to drill into the full result on demand
 * - Pass `result_id` to `save_results_for_mirror` instead of the full payload
 */
class ExamResultStore {
  private results = new Map<string, StoredExamResult>();

  store(
    mirrorIds: number[],
    runtimeId: string,
    examType: string,
    lines: ProctorExamStreamLine[]
  ): string {
    const resultId = randomUUID();
    this.results.set(resultId, {
      result_id: resultId,
      mirror_ids: mirrorIds,
      runtime_id: runtimeId,
      exam_type: examType,
      lines,
      stored_at: new Date().toISOString(),
    });
    return resultId;
  }

  get(resultId: string): StoredExamResult | undefined {
    return this.results.get(resultId);
  }

  delete(resultId: string): boolean {
    return this.results.delete(resultId);
  }

  /** For testing only */
  clear(): void {
    this.results.clear();
  }
}

/** Singleton instance shared across all tool factories */
export const examResultStore = new ExamResultStore();
