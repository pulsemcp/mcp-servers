import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { saveResultsForMirror } from '../../shared/src/pulsemcp-admin-client/lib/save-results-for-mirror.js';

describe('saveResultsForMirror API client', () => {
  const mockApiKey = 'test-api-key';
  const mockBaseUrl = 'https://api.example.com';

  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('request body format', () => {
    it('should spread result data fields directly into the result object, not nested under a data key', async () => {
      let capturedBody: string | undefined;

      global.fetch = vi.fn().mockImplementation(async (_url, options) => {
        capturedBody = options?.body?.toString();
        return {
          ok: true,
          json: async () => ({
            saved: [{ exam_id: 'proctor-mcp-client-auth-check', proctor_result_id: 100 }],
            errors: [],
          }),
        };
      });

      await saveResultsForMirror(mockApiKey, mockBaseUrl, {
        mirror_id: 152,
        runtime_id: 'fly-machines-v1',
        results: [
          {
            exam_id: 'proctor-mcp-client-auth-check',
            status: 'pass',
            data: {
              input: { mirror_id: 152 },
              output: { remotes: [{ authTypes: ['none'] }] },
              processedBy: 'fly-machines-v1',
            },
          },
        ],
      });

      expect(capturedBody).toBeDefined();
      const parsed = JSON.parse(capturedBody!);

      // The result object should have input, output, processedBy spread directly,
      // NOT nested under a "data" key. This matches the format the PulseMCP
      // dashboard expects when reading proctor_results.results (issue #376).
      expect(parsed.results[0].result).toEqual({
        status: 'pass',
        input: { mirror_id: 152 },
        output: { remotes: [{ authTypes: ['none'] }] },
        processedBy: 'fly-machines-v1',
      });

      // Specifically, there should be NO "data" key wrapping the fields
      expect(parsed.results[0].result).not.toHaveProperty('data');
    });

    it('should handle results without data gracefully', async () => {
      let capturedBody: string | undefined;

      global.fetch = vi.fn().mockImplementation(async (_url, options) => {
        capturedBody = options?.body?.toString();
        return {
          ok: true,
          json: async () => ({
            saved: [{ exam_id: 'auth-check', proctor_result_id: 101 }],
            errors: [],
          }),
        };
      });

      await saveResultsForMirror(mockApiKey, mockBaseUrl, {
        mirror_id: 123,
        runtime_id: 'fly-machines-v1',
        results: [
          {
            exam_id: 'auth-check',
            status: 'pass',
          },
        ],
      });

      expect(capturedBody).toBeDefined();
      const parsed = JSON.parse(capturedBody!);

      // When no data is provided, result should only contain status
      expect(parsed.results[0].result).toEqual({
        status: 'pass',
      });
    });

    it('should include mirror_id and runtime_id in the request body', async () => {
      let capturedBody: string | undefined;

      global.fetch = vi.fn().mockImplementation(async (_url, options) => {
        capturedBody = options?.body?.toString();
        return {
          ok: true,
          json: async () => ({ saved: [], errors: [] }),
        };
      });

      await saveResultsForMirror(mockApiKey, mockBaseUrl, {
        mirror_id: 152,
        runtime_id: 'fly-machines-v1',
        results: [{ exam_id: 'auth-check', status: 'pass' }],
      });

      const parsed = JSON.parse(capturedBody!);
      expect(parsed.mirror_id).toBe(152);
      expect(parsed.runtime_id).toBe('fly-machines-v1');
    });
  });
});
