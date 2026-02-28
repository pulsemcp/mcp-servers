import { randomUUID } from 'crypto';
import { readFileSync, writeFileSync, unlinkSync, readdirSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
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
 * Maximum number of results to keep on disk. Oldest results are evicted
 * when this limit is reached (FIFO by insertion order).
 */
const MAX_RESULTS = 100;

const STORE_DIR = join(tmpdir(), 'pulsemcp-exam-results');
const FILE_SUFFIX = '.json';

/**
 * File-based store for proctor exam results.
 *
 * When `run_exam_for_mirror` completes, the full result is written to a
 * JSON file in /tmp/ and a UUID `result_id` is returned. This avoids
 * dumping large payloads (~60KB+ for servers with many tools) into the
 * LLM context, and survives across tool calls without relying on
 * in-memory state.
 *
 * Files are named with a zero-padded sequence number prefix so that
 * lexicographic sorting preserves insertion order for FIFO eviction.
 *
 * Eviction: When the store exceeds MAX_RESULTS files, the oldest result
 * is evicted (FIFO). Results are also deleted after successful save via
 * `save_results_for_mirror`.
 *
 * Consumers can:
 * - Use `get_exam_result` to drill into the full result on demand
 * - Pass `result_id` to `save_results_for_mirror` instead of the full payload
 */
class ExamResultStore {
  private seq = 0;

  private ensureDir(): void {
    if (!existsSync(STORE_DIR)) {
      mkdirSync(STORE_DIR, { recursive: true });
    }
  }

  /** Filename format: {seq}-{uuid}.json — seq is zero-padded for lexicographic ordering */
  private fileName(seq: number, resultId: string): string {
    return `${String(seq).padStart(10, '0')}-${resultId}${FILE_SUFFIX}`;
  }

  private extractResultId(fileName: string): string {
    // Format: 0000000001-<uuid>.json
    return fileName.slice(11, -FILE_SUFFIX.length);
  }

  private listResultFiles(): string[] {
    this.ensureDir();
    return readdirSync(STORE_DIR)
      .filter((f) => f.endsWith(FILE_SUFFIX) && f.length > FILE_SUFFIX.length)
      .sort(); // Lexicographic sort gives insertion order via zero-padded seq
  }

  private findFileForResult(resultId: string): string | undefined {
    const files = this.listResultFiles();
    return files.find((f) => this.extractResultId(f) === resultId);
  }

  store(
    mirrorIds: number[],
    runtimeId: string,
    examType: string,
    lines: ProctorExamStreamLine[]
  ): string {
    this.ensureDir();
    const resultId = randomUUID();
    const seqNum = this.seq++;

    // Evict oldest entries if at capacity (files are sorted by seq prefix)
    const files = this.listResultFiles();
    const toEvict = files.length - MAX_RESULTS + 1;
    for (let i = 0; i < toEvict; i++) {
      try {
        unlinkSync(join(STORE_DIR, files[i]));
      } catch {
        // ignore
      }
    }

    const stored: StoredExamResult = {
      result_id: resultId,
      mirror_ids: mirrorIds,
      runtime_id: runtimeId,
      exam_type: examType,
      lines,
      stored_at: new Date().toISOString(),
    };

    writeFileSync(
      join(STORE_DIR, this.fileName(seqNum, resultId)),
      JSON.stringify(stored),
      'utf-8'
    );
    return resultId;
  }

  get(resultId: string): StoredExamResult | undefined {
    const file = this.findFileForResult(resultId);
    if (!file) return undefined;
    try {
      const content = readFileSync(join(STORE_DIR, file), 'utf-8');
      return JSON.parse(content) as StoredExamResult;
    } catch {
      return undefined;
    }
  }

  delete(resultId: string): boolean {
    const file = this.findFileForResult(resultId);
    if (!file) return false;
    try {
      unlinkSync(join(STORE_DIR, file));
      return true;
    } catch {
      return false;
    }
  }

  get size(): number {
    return this.listResultFiles().length;
  }

  /** For testing only — removes all result files and resets the sequence counter */
  clear(): void {
    this.ensureDir();
    for (const file of this.listResultFiles()) {
      try {
        unlinkSync(join(STORE_DIR, file));
      } catch {
        // ignore
      }
    }
    this.seq = 0;
  }
}

/** Singleton instance shared across all tool factories */
export const examResultStore = new ExamResultStore();
