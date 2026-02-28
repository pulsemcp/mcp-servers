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
 * Extract exam_id from a proctor exam stream line, checking both the
 * data payload and top-level fields. The API may place exam_id in
 * either location depending on the exam type.
 */
export function extractExamId(line: ProctorExamStreamLine): string {
  const data = line.data as Record<string, unknown> | undefined;
  return (
    (data?.exam_id as string) ||
    (line.exam_id as string) ||
    (data?.exam_type as string) ||
    (line.exam_type as string) ||
    'unknown'
  );
}

/**
 * Extract status from a proctor exam stream line, checking both the
 * data payload and top-level fields.
 */
export function extractStatus(line: ProctorExamStreamLine): string {
  const data = line.data as Record<string, unknown> | undefined;
  return (data?.status as string) || (line.status as string) || 'unknown';
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
 * The sequence counter is initialized from existing files on disk so
 * that new entries sort after old ones even across process restarts.
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
  private seq: number;

  constructor() {
    this.seq = this.initSeqFromDisk();
  }

  /**
   * Scan existing files to find the highest sequence number and start
   * one past it. This ensures new files always sort after existing ones,
   * even across process restarts.
   */
  private initSeqFromDisk(): number {
    this.ensureDir();
    const files = readdirSync(STORE_DIR)
      .filter((f) => f.endsWith(FILE_SUFFIX) && f.length > FILE_SUFFIX.length)
      .sort();
    if (files.length === 0) return 0;
    const lastFile = files[files.length - 1];
    const seqStr = lastFile.slice(0, 10);
    const parsed = parseInt(seqStr, 10);
    return isNaN(parsed) ? 0 : parsed + 1;
  }

  private ensureDir(): void {
    if (!existsSync(STORE_DIR)) {
      mkdirSync(STORE_DIR, { recursive: true, mode: 0o700 });
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

    writeFileSync(join(STORE_DIR, this.fileName(seqNum, resultId)), JSON.stringify(stored), {
      encoding: 'utf-8',
      mode: 0o600,
    });
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
