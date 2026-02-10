import { describe, it, expect, beforeAll } from 'vitest';
import { LangfuseClient } from '../../shared/src/langfuse-client/langfuse-client.js';
import type { ILangfuseClient } from '../../shared/src/langfuse-client/langfuse-client.js';

/**
 * Manual tests that hit the real Langfuse API via LangfuseClient.
 *
 * Prerequisites:
 * 1. Set up .env with LANGFUSE_SECRET_KEY, LANGFUSE_PUBLIC_KEY, LANGFUSE_BASE_URL
 * 2. Run: npm run test:manual
 */

const BASE_URL = process.env.LANGFUSE_BASE_URL || 'https://us.cloud.langfuse.com';
const SECRET_KEY = process.env.LANGFUSE_SECRET_KEY;
const PUBLIC_KEY = process.env.LANGFUSE_PUBLIC_KEY;

describe('Langfuse Manual Tests', () => {
  let client: ILangfuseClient;

  beforeAll(() => {
    if (!SECRET_KEY || !PUBLIC_KEY) {
      throw new Error(
        'LANGFUSE_SECRET_KEY and LANGFUSE_PUBLIC_KEY must be set in .env for manual tests'
      );
    }
    client = new LangfuseClient(SECRET_KEY, PUBLIC_KEY, BASE_URL);
  });

  describe('getTraces', () => {
    it('should list traces with default params', async () => {
      const result = await client.getTraces({ limit: 5 });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.meta).toHaveProperty('page');
      expect(result.meta).toHaveProperty('limit');
      expect(result.meta).toHaveProperty('totalItems');
      expect(result.meta).toHaveProperty('totalPages');
      expect(Array.isArray(result.data)).toBe(true);

      console.log(`Found ${result.meta.totalItems} total traces, returned ${result.data.length}`);

      if (result.data.length > 0) {
        const trace = result.data[0];
        expect(trace).toHaveProperty('id');
        expect(trace).toHaveProperty('timestamp');
        expect(trace).toHaveProperty('tags');
        console.log(`First trace: id=${trace.id}, name=${trace.name}, latency=${trace.latency}`);
      }
    });

    it('should filter traces by name', async () => {
      const result = await client.getTraces({ limit: 5, name: 'seed-trace' });

      expect(Array.isArray(result.data)).toBe(true);

      for (const trace of result.data) {
        expect(trace.name).toBe('seed-trace');
      }
      console.log(`Found ${result.data.length} traces with name "seed-trace"`);
    });
  });

  describe('getTraceDetail', () => {
    it('should get trace detail for a known trace', async () => {
      const list = await client.getTraces({ limit: 1 });

      if (list.data.length === 0) {
        console.log('No traces available - skipping detail test');
        return;
      }

      const traceId = list.data[0].id;
      const trace = await client.getTraceDetail(traceId);

      expect(trace.id).toBe(traceId);
      expect(trace).toHaveProperty('observations');
      expect(trace).toHaveProperty('scores');
      expect(Array.isArray(trace.observations)).toBe(true);
      expect(Array.isArray(trace.scores)).toBe(true);

      console.log(
        `Trace ${traceId}: ${trace.observations.length} observations, ${trace.scores.length} scores`
      );
    });
  });

  describe('getObservations', () => {
    it('should list observations', async () => {
      const result = await client.getObservations({ limit: 5 });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(Array.isArray(result.data)).toBe(true);

      console.log(
        `Found ${result.meta.totalItems} total observations, returned ${result.data.length}`
      );

      if (result.data.length > 0) {
        const obs = result.data[0];
        expect(obs).toHaveProperty('id');
        expect(obs).toHaveProperty('type');
        console.log(`First observation: id=${obs.id}, type=${obs.type}, model=${obs.model}`);
      }
    });

    it('should filter observations by traceId', async () => {
      const traces = await client.getTraces({ limit: 1 });

      if (traces.data.length === 0) {
        console.log('No traces available - skipping observations by traceId test');
        return;
      }

      const traceId = traces.data[0].id;
      const result = await client.getObservations({ traceId, limit: 10 });

      expect(Array.isArray(result.data)).toBe(true);

      for (const obs of result.data) {
        expect(obs.traceId).toBe(traceId);
      }
      console.log(`Found ${result.data.length} observations for trace ${traceId}`);
    });
  });

  describe('getObservation', () => {
    it('should get observation detail', async () => {
      const list = await client.getObservations({ limit: 1 });

      if (list.data.length === 0) {
        console.log('No observations available - skipping detail test');
        return;
      }

      const obsId = list.data[0].id;
      const obs = await client.getObservation(obsId);

      expect(obs.id).toBe(obsId);
      expect(obs).toHaveProperty('type');
      expect(obs).toHaveProperty('startTime');
      console.log(
        `Observation ${obsId}: type=${obs.type}, model=${obs.model}, latency=${obs.latency}`
      );
    });
  });
});
