import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readElicitationConfig } from '../src/config.js';
import { requestConfirmation } from '../src/elicitation.js';
import type { ElicitationConfig, MCPServerLike } from '../src/types.js';

describe('readElicitationConfig – preferHttpFallback', () => {
  it('defaults to false when ELICITATION_PREFER_HTTP_FALLBACK is unset', () => {
    const config = readElicitationConfig({});
    expect(config.preferHttpFallback).toBe(false);
  });

  it('parses "true" (case-insensitive) as true', () => {
    expect(
      readElicitationConfig({ ELICITATION_PREFER_HTTP_FALLBACK: 'true' }).preferHttpFallback
    ).toBe(true);
    expect(
      readElicitationConfig({ ELICITATION_PREFER_HTTP_FALLBACK: 'TRUE' }).preferHttpFallback
    ).toBe(true);
    expect(
      readElicitationConfig({ ELICITATION_PREFER_HTTP_FALLBACK: 'True' }).preferHttpFallback
    ).toBe(true);
  });

  it('treats "false" / "0" / other strings as false', () => {
    expect(
      readElicitationConfig({ ELICITATION_PREFER_HTTP_FALLBACK: 'false' }).preferHttpFallback
    ).toBe(false);
    expect(
      readElicitationConfig({ ELICITATION_PREFER_HTTP_FALLBACK: '0' }).preferHttpFallback
    ).toBe(false);
    expect(
      readElicitationConfig({ ELICITATION_PREFER_HTTP_FALLBACK: 'yes' }).preferHttpFallback
    ).toBe(false);
    expect(readElicitationConfig({ ELICITATION_PREFER_HTTP_FALLBACK: '' }).preferHttpFallback).toBe(
      false
    );
  });
});

describe('requestConfirmation – preferHttpFallback flag', () => {
  const baseSchema = {
    type: 'object' as const,
    properties: { confirm: { type: 'boolean' as const } },
    required: ['confirm'],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function stubFetchAcceptingPoll() {
    const fetchSpy = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      if (init?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ requestId: 'test-req-id' }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ action: 'accept', content: { confirm: true } }),
      });
    });
    vi.stubGlobal('fetch', fetchSpy);
    return fetchSpy;
  }

  it('uses HTTP fallback when preferHttpFallback=true even if client advertises elicitation', async () => {
    const elicitInputSpy = vi.fn();
    const mockServer: MCPServerLike = {
      // Client claims to support elicitation (the AO/Claude Code headless case)
      getClientCapabilities: () => ({ elicitation: {} }),
      elicitInput: elicitInputSpy,
    };
    const fetchSpy = stubFetchAcceptingPoll();

    const config: ElicitationConfig = {
      enabled: true,
      requestUrl: 'http://localhost/request',
      pollUrl: 'http://localhost/poll',
      ttlMs: 60_000,
      pollIntervalMs: 1_000,
      sessionId: 'test-session-id',
      preferHttpFallback: true,
    };

    const result = await requestConfirmation(
      {
        server: mockServer,
        message: 'Confirm?',
        requestedSchema: baseSchema,
        meta: { 'com.pulsemcp/tool-name': 'test-tool' },
      },
      config
    );

    expect(result.action).toBe('accept');
    expect(result.content).toEqual({ confirm: true });
    // Native elicitation must NOT be called
    expect(elicitInputSpy).not.toHaveBeenCalled();
    // HTTP fallback must be used
    expect(fetchSpy).toHaveBeenCalled();

    // Lock in that the preferHttpFallback path forwards _meta correctly
    // (session-id from config, tool-name from options.meta).
    const postCall = fetchSpy.mock.calls.find(
      ([, init]) => (init as RequestInit | undefined)?.method === 'POST'
    );
    expect(postCall).toBeDefined();
    const postBody = JSON.parse((postCall![1] as RequestInit).body as string);
    expect(postBody._meta['com.pulsemcp/session-id']).toBe('test-session-id');
    expect(postBody._meta['com.pulsemcp/tool-name']).toBe('test-tool');
    expect(postBody._meta['com.pulsemcp/request-id']).toBeDefined();
    expect(postBody._meta['com.pulsemcp/expires-at']).toBeDefined();
  });

  it('uses native elicitation when preferHttpFallback=false (default) and client supports it', async () => {
    const elicitInputSpy = vi
      .fn()
      .mockResolvedValue({ action: 'accept', content: { confirm: true } });
    const mockServer: MCPServerLike = {
      getClientCapabilities: () => ({ elicitation: {} }),
      elicitInput: elicitInputSpy,
    };
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const config: ElicitationConfig = {
      enabled: true,
      requestUrl: 'http://localhost/request',
      pollUrl: 'http://localhost/poll',
      ttlMs: 60_000,
      pollIntervalMs: 1_000,
      preferHttpFallback: false,
    };

    const result = await requestConfirmation(
      { server: mockServer, message: 'Confirm?', requestedSchema: baseSchema },
      config
    );

    expect(result.action).toBe('accept');
    expect(elicitInputSpy).toHaveBeenCalledOnce();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('uses native elicitation when preferHttpFallback is unset and client supports it', async () => {
    const elicitInputSpy = vi
      .fn()
      .mockResolvedValue({ action: 'accept', content: { confirm: true } });
    const mockServer: MCPServerLike = {
      getClientCapabilities: () => ({ elicitation: {} }),
      elicitInput: elicitInputSpy,
    };
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    // No preferHttpFallback field at all — undefined behaves as false
    const config: ElicitationConfig = {
      enabled: true,
      requestUrl: 'http://localhost/request',
      pollUrl: 'http://localhost/poll',
      ttlMs: 60_000,
      pollIntervalMs: 1_000,
    };

    const result = await requestConfirmation(
      { server: mockServer, message: 'Confirm?', requestedSchema: baseSchema },
      config
    );

    expect(result.action).toBe('accept');
    expect(elicitInputSpy).toHaveBeenCalledOnce();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('falls back to native elicitation when preferHttpFallback=true but URLs are not configured', async () => {
    const elicitInputSpy = vi
      .fn()
      .mockResolvedValue({ action: 'accept', content: { confirm: true } });
    const mockServer: MCPServerLike = {
      getClientCapabilities: () => ({ elicitation: {} }),
      elicitInput: elicitInputSpy,
    };

    // Flag is set but URLs are missing — should still use native
    const config: ElicitationConfig = {
      enabled: true,
      ttlMs: 60_000,
      pollIntervalMs: 1_000,
      preferHttpFallback: true,
    };

    const result = await requestConfirmation(
      { server: mockServer, message: 'Confirm?', requestedSchema: baseSchema },
      config
    );

    expect(result.action).toBe('accept');
    expect(elicitInputSpy).toHaveBeenCalledOnce();
  });

  it('throws Tier 4 error when preferHttpFallback=true, URLs missing, and client lacks elicitation', async () => {
    const mockServer: MCPServerLike = {
      getClientCapabilities: () => ({}), // no elicitation
      elicitInput: vi.fn(),
    };

    const config: ElicitationConfig = {
      enabled: true,
      ttlMs: 60_000,
      pollIntervalMs: 1_000,
      preferHttpFallback: true,
    };

    await expect(
      requestConfirmation(
        { server: mockServer, message: 'Confirm?', requestedSchema: baseSchema },
        config
      )
    ).rejects.toThrow(/no mechanism is available/);
  });
});
