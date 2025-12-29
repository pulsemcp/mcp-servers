import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { saveMCPImplementation } from '../../shared/src/pulsemcp-admin-client/lib/save-mcp-implementation.js';

describe('saveMCPImplementation API client', () => {
  const mockApiKey = 'test-api-key';
  const mockBaseUrl = 'https://api.example.com';

  let originalFetch: typeof global.fetch;

  const mockSuccessResponse = () => ({
    ok: true,
    json: async () => ({
      id: 100,
      name: 'Test Implementation',
      slug: 'test-impl',
      type: 'server',
      status: 'draft',
      updated_at: '2024-01-20T16:30:00Z',
    }),
  });

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('url parameter mapping', () => {
    it('should send url parameter as marketing_url to the Rails backend', async () => {
      let capturedBody: string | undefined;

      global.fetch = vi.fn().mockImplementation(async (_url, options) => {
        capturedBody = options?.body?.toString();
        return {
          ok: true,
          json: async () => ({
            id: 100,
            name: 'Test Implementation',
            slug: 'test-impl',
            type: 'server',
            status: 'draft',
            url: 'https://github.com/example/test',
            updated_at: '2024-01-20T16:30:00Z',
          }),
        };
      });

      await saveMCPImplementation(mockApiKey, mockBaseUrl, 100, {
        url: 'https://github.com/example/test',
      });

      expect(capturedBody).toBeDefined();
      // The form data should contain marketing_url, not url
      expect(capturedBody).toContain('mcp_implementation%5Bmarketing_url%5D');
      expect(capturedBody).not.toContain('mcp_implementation%5Burl%5D=');
      // Verify the URL-encoded form contains the correct key-value pair
      const params = new URLSearchParams(capturedBody);
      expect(params.get('mcp_implementation[marketing_url]')).toBe(
        'https://github.com/example/test'
      );
    });

    it('should not send marketing_url when url is not provided', async () => {
      let capturedBody: string | undefined;

      global.fetch = vi.fn().mockImplementation(async (_url, options) => {
        capturedBody = options?.body?.toString();
        return {
          ok: true,
          json: async () => ({
            id: 100,
            name: 'Updated Name',
            slug: 'test-impl',
            type: 'server',
            status: 'draft',
            updated_at: '2024-01-20T16:30:00Z',
          }),
        };
      });

      await saveMCPImplementation(mockApiKey, mockBaseUrl, 100, {
        name: 'Updated Name',
      });

      expect(capturedBody).toBeDefined();
      expect(capturedBody).not.toContain('marketing_url');
    });
  });

  describe('empty array handling for nested attributes', () => {
    it('should send empty array marker for canonical when empty array is provided', async () => {
      let capturedBody: string | undefined;

      global.fetch = vi.fn().mockImplementation(async (_url, options) => {
        capturedBody = options?.body?.toString();
        return mockSuccessResponse();
      });

      await saveMCPImplementation(mockApiKey, mockBaseUrl, 100, {
        canonical: [],
      });

      expect(capturedBody).toBeDefined();
      const params = new URLSearchParams(capturedBody);
      // When canonical is an empty array, Rails should receive the empty array marker
      expect(params.get('mcp_implementation[canonical_attributes]')).toBe('[]');
    });

    it('should send empty array marker for remote when empty array is provided', async () => {
      let capturedBody: string | undefined;

      global.fetch = vi.fn().mockImplementation(async (_url, options) => {
        capturedBody = options?.body?.toString();
        return mockSuccessResponse();
      });

      await saveMCPImplementation(mockApiKey, mockBaseUrl, 100, {
        remote: [],
      });

      expect(capturedBody).toBeDefined();
      const params = new URLSearchParams(capturedBody);
      // When remote is an empty array, Rails should receive the empty array marker
      expect(params.get('mcp_implementation[remote_attributes]')).toBe('[]');
    });

    it('should not send canonical_attributes when canonical is undefined', async () => {
      let capturedBody: string | undefined;

      global.fetch = vi.fn().mockImplementation(async (_url, options) => {
        capturedBody = options?.body?.toString();
        return mockSuccessResponse();
      });

      await saveMCPImplementation(mockApiKey, mockBaseUrl, 100, {
        name: 'Test',
      });

      expect(capturedBody).toBeDefined();
      expect(capturedBody).not.toContain('canonical_attributes');
    });

    it('should not send remote_attributes when remote is undefined', async () => {
      let capturedBody: string | undefined;

      global.fetch = vi.fn().mockImplementation(async (_url, options) => {
        capturedBody = options?.body?.toString();
        return mockSuccessResponse();
      });

      await saveMCPImplementation(mockApiKey, mockBaseUrl, 100, {
        name: 'Test',
      });

      expect(capturedBody).toBeDefined();
      expect(capturedBody).not.toContain('remote_attributes');
    });

    it('should send canonical entries when non-empty array is provided', async () => {
      let capturedBody: string | undefined;

      global.fetch = vi.fn().mockImplementation(async (_url, options) => {
        capturedBody = options?.body?.toString();
        return mockSuccessResponse();
      });

      await saveMCPImplementation(mockApiKey, mockBaseUrl, 100, {
        canonical: [
          { url: 'https://example.com', scope: 'url' as const },
          { url: 'https://example.org', scope: 'domain' as const, note: 'test note' },
        ],
      });

      expect(capturedBody).toBeDefined();
      const params = new URLSearchParams(capturedBody);
      expect(params.get('mcp_implementation[canonical_attributes][0][url]')).toBe(
        'https://example.com'
      );
      expect(params.get('mcp_implementation[canonical_attributes][0][scope]')).toBe('url');
      expect(params.get('mcp_implementation[canonical_attributes][1][url]')).toBe(
        'https://example.org'
      );
      expect(params.get('mcp_implementation[canonical_attributes][1][scope]')).toBe('domain');
      expect(params.get('mcp_implementation[canonical_attributes][1][note]')).toBe('test note');
    });
  });
});
