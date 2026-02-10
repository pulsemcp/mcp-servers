import { describe, it, expect, beforeAll } from 'vitest';

/**
 * Manual tests that hit the real Langfuse API.
 *
 * Prerequisites:
 * 1. Set up .env with LANGFUSE_SECRET_KEY, LANGFUSE_PUBLIC_KEY, LANGFUSE_BASE_URL
 * 2. Run: npm run test:manual
 */

const BASE_URL = process.env.LANGFUSE_BASE_URL || 'https://us.cloud.langfuse.com';
const SECRET_KEY = process.env.LANGFUSE_SECRET_KEY;
const PUBLIC_KEY = process.env.LANGFUSE_PUBLIC_KEY;

function getAuthHeader(): string {
  return 'Basic ' + Buffer.from(`${PUBLIC_KEY}:${SECRET_KEY}`).toString('base64');
}

describe('Langfuse Manual Tests', () => {
  beforeAll(() => {
    if (!SECRET_KEY || !PUBLIC_KEY) {
      throw new Error(
        'LANGFUSE_SECRET_KEY and LANGFUSE_PUBLIC_KEY must be set in .env for manual tests'
      );
    }
  });

  describe('GET /api/public/traces', () => {
    it('should list traces', async () => {
      const response = await fetch(`${BASE_URL}/api/public/traces?limit=5`, {
        headers: { Authorization: getAuthHeader() },
      });

      expect(response.ok).toBe(true);
      const body = await response.json();
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('meta');
      expect(body.meta).toHaveProperty('page');
      expect(body.meta).toHaveProperty('limit');
      expect(body.meta).toHaveProperty('totalItems');
      expect(body.meta).toHaveProperty('totalPages');
      expect(Array.isArray(body.data)).toBe(true);

      console.log(`Found ${body.meta.totalItems} total traces, returned ${body.data.length}`);

      if (body.data.length > 0) {
        const trace = body.data[0];
        expect(trace).toHaveProperty('id');
        expect(trace).toHaveProperty('timestamp');
        expect(trace).toHaveProperty('tags');
        console.log(`First trace: id=${trace.id}, name=${trace.name}, latency=${trace.latency}`);
      }
    });

    it('should filter traces by name', async () => {
      const response = await fetch(`${BASE_URL}/api/public/traces?limit=5&name=seed-trace`, {
        headers: { Authorization: getAuthHeader() },
      });

      expect(response.ok).toBe(true);
      const body = await response.json();
      expect(Array.isArray(body.data)).toBe(true);

      for (const trace of body.data) {
        expect(trace.name).toBe('seed-trace');
      }
      console.log(`Found ${body.data.length} traces with name "seed-trace"`);
    });
  });

  describe('GET /api/public/traces/{traceId}', () => {
    it('should get trace detail for a known trace', async () => {
      // First list traces to find one
      const listResponse = await fetch(`${BASE_URL}/api/public/traces?limit=1`, {
        headers: { Authorization: getAuthHeader() },
      });
      const listBody = await listResponse.json();

      if (listBody.data.length === 0) {
        console.log('No traces available - skipping detail test');
        return;
      }

      const traceId = listBody.data[0].id;
      const response = await fetch(`${BASE_URL}/api/public/traces/${traceId}`, {
        headers: { Authorization: getAuthHeader() },
      });

      expect(response.ok).toBe(true);
      const trace = await response.json();
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

  describe('GET /api/public/observations', () => {
    it('should list observations', async () => {
      const response = await fetch(`${BASE_URL}/api/public/observations?limit=5`, {
        headers: { Authorization: getAuthHeader() },
      });

      expect(response.ok).toBe(true);
      const body = await response.json();
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('meta');
      expect(Array.isArray(body.data)).toBe(true);

      console.log(`Found ${body.meta.totalItems} total observations, returned ${body.data.length}`);

      if (body.data.length > 0) {
        const obs = body.data[0];
        expect(obs).toHaveProperty('id');
        expect(obs).toHaveProperty('type');
        console.log(`First observation: id=${obs.id}, type=${obs.type}, model=${obs.model}`);
      }
    });

    it('should filter observations by traceId', async () => {
      // Find a trace first
      const listResponse = await fetch(`${BASE_URL}/api/public/traces?limit=1`, {
        headers: { Authorization: getAuthHeader() },
      });
      const listBody = await listResponse.json();

      if (listBody.data.length === 0) {
        console.log('No traces available - skipping observations by traceId test');
        return;
      }

      const traceId = listBody.data[0].id;
      const response = await fetch(
        `${BASE_URL}/api/public/observations?traceId=${traceId}&limit=10`,
        { headers: { Authorization: getAuthHeader() } }
      );

      expect(response.ok).toBe(true);
      const body = await response.json();
      expect(Array.isArray(body.data)).toBe(true);

      for (const obs of body.data) {
        expect(obs.traceId).toBe(traceId);
      }
      console.log(`Found ${body.data.length} observations for trace ${traceId}`);
    });
  });

  describe('GET /api/public/observations/{observationId}', () => {
    it('should get observation detail', async () => {
      // Find an observation first
      const listResponse = await fetch(`${BASE_URL}/api/public/observations?limit=1`, {
        headers: { Authorization: getAuthHeader() },
      });
      const listBody = await listResponse.json();

      if (listBody.data.length === 0) {
        console.log('No observations available - skipping detail test');
        return;
      }

      const obsId = listBody.data[0].id;
      const response = await fetch(`${BASE_URL}/api/public/observations/${obsId}`, {
        headers: { Authorization: getAuthHeader() },
      });

      expect(response.ok).toBe(true);
      const obs = await response.json();
      expect(obs.id).toBe(obsId);
      expect(obs).toHaveProperty('type');
      expect(obs).toHaveProperty('startTime');
      // Detail should include input/output
      console.log(
        `Observation ${obsId}: type=${obs.type}, model=${obs.model}, latency=${obs.latency}`
      );
    });
  });
});
