import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readElicitationConfig } from '../src/config.js';
import { requestConfirmation } from '../src/elicitation.js';
import type { MCPServerLike } from '../src/types.js';

describe('readElicitationConfig – sessionId', () => {
  it('reads ELICITATION_SESSION_ID from env', () => {
    const config = readElicitationConfig({
      ELICITATION_SESSION_ID: 'sess-123',
    });
    expect(config.sessionId).toBe('sess-123');
  });

  it('returns undefined when ELICITATION_SESSION_ID is not set', () => {
    const config = readElicitationConfig({});
    expect(config.sessionId).toBeUndefined();
  });
});

describe('requestConfirmation – session-id in HTTP fallback meta', () => {
  let capturedBody: Record<string, unknown>;
  const mockServer: MCPServerLike = {
    getClientCapabilities: () => ({}), // no elicitation support → forces HTTP fallback
    elicitInput: vi.fn(),
  };

  beforeEach(() => {
    capturedBody = {};
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string, init: RequestInit) => {
        if (init?.method === 'POST') {
          capturedBody = JSON.parse(init.body as string);
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ requestId: 'test-req-id' }),
          });
        }
        // GET (poll) — return accepted immediately
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ action: 'accept', content: { confirm: true } }),
        });
      })
    );
  });

  it('includes session-id in _meta when sessionId is configured', async () => {
    await requestConfirmation(
      {
        server: mockServer,
        message: 'Confirm?',
        requestedSchema: {
          type: 'object',
          properties: { confirm: { type: 'boolean' } },
          required: ['confirm'],
        },
      },
      {
        enabled: true,
        requestUrl: 'http://localhost/request',
        pollUrl: 'http://localhost/poll',
        ttlMs: 60_000,
        pollIntervalMs: 1_000,
        sessionId: 'sess-456',
      }
    );

    expect(capturedBody._meta).toBeDefined();
    const meta = capturedBody._meta as Record<string, string>;
    expect(meta['com.pulsemcp/session-id']).toBe('sess-456');
  });

  it('omits session-id from _meta when sessionId is not configured', async () => {
    await requestConfirmation(
      {
        server: mockServer,
        message: 'Confirm?',
        requestedSchema: {
          type: 'object',
          properties: { confirm: { type: 'boolean' } },
          required: ['confirm'],
        },
      },
      {
        enabled: true,
        requestUrl: 'http://localhost/request',
        pollUrl: 'http://localhost/poll',
        ttlMs: 60_000,
        pollIntervalMs: 1_000,
      }
    );

    expect(capturedBody._meta).toBeDefined();
    const meta = capturedBody._meta as Record<string, string>;
    expect(meta['com.pulsemcp/session-id']).toBeUndefined();
  });

  it('allows options.meta to override env-based session-id', async () => {
    await requestConfirmation(
      {
        server: mockServer,
        message: 'Confirm?',
        requestedSchema: {
          type: 'object',
          properties: { confirm: { type: 'boolean' } },
          required: ['confirm'],
        },
        meta: {
          'com.pulsemcp/session-id': 'caller-override',
        },
      },
      {
        enabled: true,
        requestUrl: 'http://localhost/request',
        pollUrl: 'http://localhost/poll',
        ttlMs: 60_000,
        pollIntervalMs: 1_000,
        sessionId: 'sess-from-env',
      }
    );

    expect(capturedBody._meta).toBeDefined();
    const meta = capturedBody._meta as Record<string, string>;
    expect(meta['com.pulsemcp/session-id']).toBe('caller-override');
  });
});
