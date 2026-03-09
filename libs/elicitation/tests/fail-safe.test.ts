import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestConfirmation } from '../src/elicitation.js';
import type { MCPServerLike, ElicitationConfig } from '../src/types.js';

describe('requestConfirmation – fail-safe action validation', () => {
  const mockServer: MCPServerLike = {
    getClientCapabilities: () => ({}), // no elicitation support → forces HTTP fallback
    elicitInput: vi.fn(),
  };

  const baseConfig: ElicitationConfig = {
    enabled: true,
    requestUrl: 'http://localhost/request',
    pollUrl: 'http://localhost/poll',
    ttlMs: 60_000,
    pollIntervalMs: 1_000,
  };

  const baseOptions = {
    server: mockServer,
    message: 'Confirm?',
    requestedSchema: {
      type: 'object' as const,
      properties: { confirm: { type: 'boolean' as const } },
      required: ['confirm'],
    },
  };

  function stubFetchWithPollAction(action: string, content?: Record<string, unknown>) {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        if (init?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ requestId: 'test-req-id' }),
          });
        }
        // GET (poll)
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ action, content: content ?? null }),
        });
      })
    );
  }

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns accept for a valid "accept" action', async () => {
    stubFetchWithPollAction('accept', { confirm: true });

    const result = await requestConfirmation(baseOptions, baseConfig);
    expect(result.action).toBe('accept');
    expect(result.content).toEqual({ confirm: true });
  });

  it('returns decline for a valid "decline" action', async () => {
    stubFetchWithPollAction('decline');

    const result = await requestConfirmation(baseOptions, baseConfig);
    expect(result.action).toBe('decline');
  });

  it('returns cancel for a valid "cancel" action', async () => {
    stubFetchWithPollAction('cancel');

    const result = await requestConfirmation(baseOptions, baseConfig);
    expect(result.action).toBe('cancel');
  });

  it('treats unrecognized action "declined" as decline (fail-safe)', async () => {
    stubFetchWithPollAction('declined');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await requestConfirmation(baseOptions, baseConfig);
    expect(result.action).toBe('decline');
    expect(result.content).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unrecognized poll action "declined"')
    );
  });

  it('treats unrecognized action "approved" as decline (fail-safe)', async () => {
    stubFetchWithPollAction('approved');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await requestConfirmation(baseOptions, baseConfig);
    expect(result.action).toBe('decline');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unrecognized poll action "approved"')
    );
  });

  it('treats empty string action as decline (fail-safe)', async () => {
    stubFetchWithPollAction('');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await requestConfirmation(baseOptions, baseConfig);
    expect(result.action).toBe('decline');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Unrecognized poll action ""'));
  });

  it('treats garbage string action as decline (fail-safe)', async () => {
    stubFetchWithPollAction('xyz-garbage-123');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await requestConfirmation(baseOptions, baseConfig);
    expect(result.action).toBe('decline');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unrecognized poll action "xyz-garbage-123"')
    );
  });
});
