import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runExamForMirror } from '../../shared/src/pulsemcp-admin-client/lib/run-exam-for-mirror.js';

describe('runExamForMirror API client', () => {
  const mockApiKey = 'test-api-key';
  const mockBaseUrl = 'https://api.example.com';

  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('NDJSON type normalization', () => {
    it('should normalize type:"result" to type:"exam_result" during parsing', async () => {
      // Simulate the proctor API returning 'result' type (as run_exam endpoint does)
      // instead of the expected 'exam_result' type
      const ndjsonResponse = [
        JSON.stringify({ type: 'log', message: 'Starting exam' }),
        JSON.stringify({
          type: 'result',
          mirror_id: 155,
          exam_id: 'init-tools-list',
          status: 'pass',
          data: { tools: [{ name: 'test_tool' }] },
        }),
        JSON.stringify({ type: 'summary', total: 1, passed: 1, failed: 0, skipped: 0 }),
      ].join('\n');

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => ndjsonResponse,
      });

      const result = await runExamForMirror(mockApiKey, mockBaseUrl, {
        mirror_ids: [155],
        runtime_id: 'fly-machines-v1',
        exam_type: 'init-tools-list',
      });

      // The 'result' type should have been normalized to 'exam_result'
      const examResultLines = result.lines.filter((l) => l.type === 'exam_result');
      expect(examResultLines).toHaveLength(1);
      expect(examResultLines[0].mirror_id).toBe(155);
      expect(examResultLines[0].data).toEqual({ tools: [{ name: 'test_tool' }] });

      // No lines should remain with type 'result'
      const resultLines = result.lines.filter((l) => l.type === 'result');
      expect(resultLines).toHaveLength(0);
    });

    it('should preserve type:"exam_result" lines unchanged', async () => {
      const ndjsonResponse = [
        JSON.stringify({
          type: 'exam_result',
          mirror_id: 123,
          exam_id: 'auth-check',
          status: 'pass',
        }),
      ].join('\n');

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => ndjsonResponse,
      });

      const result = await runExamForMirror(mockApiKey, mockBaseUrl, {
        mirror_ids: [123],
        runtime_id: 'fly-machines-v1',
        exam_type: 'auth-check',
      });

      expect(result.lines).toHaveLength(1);
      expect(result.lines[0].type).toBe('exam_result');
      expect(result.lines[0].exam_id).toBe('auth-check');
    });

    it('should not normalize other line types', async () => {
      const ndjsonResponse = [
        JSON.stringify({ type: 'log', message: 'test log' }),
        JSON.stringify({ type: 'error', message: 'test error' }),
        JSON.stringify({ type: 'summary', total: 0, passed: 0, failed: 0, skipped: 0 }),
      ].join('\n');

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => ndjsonResponse,
      });

      const result = await runExamForMirror(mockApiKey, mockBaseUrl, {
        mirror_ids: [155],
        runtime_id: 'fly-machines-v1',
        exam_type: 'init-tools-list',
      });

      expect(result.lines).toHaveLength(3);
      expect(result.lines.map((l) => l.type)).toEqual(['log', 'error', 'summary']);
    });
  });
});
