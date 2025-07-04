import { describe, it, expect, beforeEach, vi } from 'vitest';
import { scrapeUniversal } from '../../shared/src/scraping-strategies.js';
import type { IScrapingClients } from '../../shared/src/server.js';

describe('Scraping Error Diagnostics', () => {
  let mockClients: IScrapingClients;

  beforeEach(() => {
    mockClients = {
      native: {
        scrape: vi.fn(),
      },
      firecrawl: {
        scrape: vi.fn(),
      },
      brightData: {
        scrape: vi.fn(),
      },
    };
  });

  describe('diagnostics object structure', () => {
    it('should include diagnostics when all strategies fail', async () => {
      vi.mocked(mockClients.native.scrape).mockResolvedValue({
        success: false,
        status: 403,
        error: 'Forbidden',
      });
      vi.mocked(mockClients.firecrawl!.scrape).mockResolvedValue({
        success: false,
        error: 'Rate limited',
      });
      vi.mocked(mockClients.brightData!.scrape).mockResolvedValue({
        success: false,
        error: 'Proxy error',
      });

      const result = await scrapeUniversal(mockClients, {
        url: 'https://example.com',
      });

      expect(result.success).toBe(false);
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.strategiesAttempted).toEqual([
        'native',
        'firecrawl',
        'brightdata',
      ]);
      expect(result.diagnostics?.strategyErrors).toEqual({
        native: 'Forbidden',
        firecrawl: 'Rate limited',
        brightdata: 'Proxy error',
      });
      expect(result.diagnostics?.timing).toBeDefined();
      expect(Object.keys(result.diagnostics?.timing || {})).toEqual([
        'native',
        'firecrawl',
        'brightdata',
      ]);
    });

    it('should include timing information for each attempted strategy', async () => {
      // Mock delays to test timing
      vi.mocked(mockClients.native.scrape).mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { success: false };
      });
      vi.mocked(mockClients.firecrawl!.scrape).mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        return { success: false };
      });
      vi.mocked(mockClients.brightData!.scrape).mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 30));
        return { success: false };
      });

      const result = await scrapeUniversal(mockClients, {
        url: 'https://example.com',
      });

      expect(result.diagnostics?.timing?.native).toBeGreaterThanOrEqual(8);
      expect(result.diagnostics?.timing?.firecrawl).toBeGreaterThanOrEqual(18);
      expect(result.diagnostics?.timing?.brightdata).toBeGreaterThanOrEqual(28);
    });
  });

  describe('error message formatting', () => {
    it('should generate detailed error message with all failed strategies', async () => {
      vi.mocked(mockClients.native.scrape).mockResolvedValue({
        success: false,
        status: 403,
      });
      vi.mocked(mockClients.firecrawl!.scrape).mockResolvedValue({
        success: false,
        error: 'Authentication failed',
      });
      vi.mocked(mockClients.brightData!.scrape).mockResolvedValue({
        success: false,
        error: 'Connection timeout',
      });

      const result = await scrapeUniversal(mockClients, {
        url: 'https://example.com',
      });

      // Check for auth error first since it should stop early
      if (result.isAuthError) {
        expect(result.error).toContain('authentication error');
      } else {
        expect(result.error).toContain('All strategies failed');
        expect(result.error).toContain('Attempted: native, firecrawl, brightdata');
        expect(result.error).toContain('native: HTTP 403');
        expect(result.error).toContain('firecrawl: Authentication failed');
        expect(result.error).toContain('brightdata: Connection timeout');
      }
    });

    it('should handle missing error messages gracefully', async () => {
      vi.mocked(mockClients.native.scrape).mockResolvedValue({ success: false });
      vi.mocked(mockClients.firecrawl!.scrape).mockResolvedValue({ success: false });
      vi.mocked(mockClients.brightData!.scrape).mockResolvedValue({ success: false });

      const result = await scrapeUniversal(mockClients, {
        url: 'https://example.com',
      });

      expect(result.diagnostics?.strategyErrors.native).toBe('HTTP unknown');
      // Firecrawl and BrightData should have errors since they were attempted
      expect(result.diagnostics?.strategiesAttempted).toContain('firecrawl');
      expect(result.diagnostics?.strategiesAttempted).toContain('brightdata');
      expect(result.diagnostics?.strategyErrors.firecrawl).toBeDefined();
      expect(result.diagnostics?.strategyErrors.brightdata).toBeDefined();
    });
  });

  describe('exception handling', () => {
    it('should capture exceptions as errors in diagnostics', async () => {
      vi.mocked(mockClients.native.scrape).mockRejectedValue(new Error('Network error'));
      vi.mocked(mockClients.firecrawl!.scrape).mockRejectedValue(new Error('API error'));
      vi.mocked(mockClients.brightData!.scrape).mockRejectedValue(new Error('Proxy error'));

      const result = await scrapeUniversal(mockClients, {
        url: 'https://example.com',
      });

      expect(result.diagnostics?.strategyErrors.native).toBe('Network error');
      expect(result.diagnostics?.strategyErrors.firecrawl).toBe('API error');
      expect(result.diagnostics?.strategyErrors.brightdata).toBe('Proxy error');
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(mockClients.native.scrape).mockRejectedValue('String error');
      vi.mocked(mockClients.firecrawl!.scrape).mockRejectedValue(null);
      vi.mocked(mockClients.brightData!.scrape).mockRejectedValue(undefined);

      const result = await scrapeUniversal(mockClients, {
        url: 'https://example.com',
      });

      expect(result.diagnostics?.strategyErrors.native).toBe('Unknown error');
      expect(result.diagnostics?.strategyErrors.firecrawl).toBe('Unknown error');
      expect(result.diagnostics?.strategyErrors.brightdata).toBe('Unknown error');
    });
  });

  describe('missing clients', () => {
    it('should report missing firecrawl client in diagnostics', async () => {
      const clientsWithoutFirecrawl = {
        ...mockClients,
        firecrawl: undefined,
      };
      vi.mocked(mockClients.native.scrape).mockResolvedValue({ success: false });
      vi.mocked(mockClients.brightData!.scrape).mockResolvedValue({ success: false });

      const result = await scrapeUniversal(clientsWithoutFirecrawl, {
        url: 'https://example.com',
      });

      expect(result.diagnostics?.strategyErrors.firecrawl).toBe('Firecrawl client not configured');
      expect(result.diagnostics?.strategiesAttempted).not.toContain('firecrawl');
    });

    it('should report missing brightdata client in diagnostics', async () => {
      const clientsWithoutBrightData = {
        ...mockClients,
        brightData: undefined,
      };
      vi.mocked(mockClients.native.scrape).mockResolvedValue({ success: false });
      vi.mocked(mockClients.firecrawl!.scrape).mockResolvedValue({ success: false });

      const result = await scrapeUniversal(clientsWithoutBrightData, {
        url: 'https://example.com',
      });

      expect(result.diagnostics?.strategyErrors.brightdata).toBe(
        'BrightData client not configured'
      );
      expect(result.diagnostics?.strategiesAttempted).not.toContain('brightdata');
    });
  });

  describe('successful scraping', () => {
    it('should include diagnostics even on success', async () => {
      vi.mocked(mockClients.native.scrape).mockResolvedValue({
        success: true,
        status: 200,
        data: 'Content',
      });

      const result = await scrapeUniversal(mockClients, {
        url: 'https://example.com',
      });

      expect(result.success).toBe(true);
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.strategiesAttempted).toEqual(['native']);
      expect(result.diagnostics?.strategyErrors).toEqual({});
      expect(result.diagnostics?.timing?.native).toBeDefined();
    });

    it('should include failed strategies in diagnostics when fallback succeeds', async () => {
      vi.mocked(mockClients.native.scrape).mockResolvedValue({
        success: false,
        status: 403,
      });
      vi.mocked(mockClients.firecrawl!.scrape).mockResolvedValue({
        success: true,
        data: { html: '<p>Content</p>' },
      });

      const result = await scrapeUniversal(mockClients, {
        url: 'https://example.com',
      });

      expect(result.success).toBe(true);
      expect(result.source).toBe('firecrawl');
      expect(result.diagnostics?.strategiesAttempted).toEqual(['native', 'firecrawl']);
      expect(result.diagnostics?.strategyErrors.native).toBe('HTTP 403');
      expect(result.diagnostics?.strategyErrors.firecrawl).toBeUndefined();
    });
  });

  describe('authentication errors', () => {
    it('should stop immediately on firecrawl authentication error', async () => {
      vi.mocked(mockClients.native.scrape).mockResolvedValue({ success: false });
      vi.mocked(mockClients.firecrawl!.scrape).mockResolvedValue({
        success: false,
        error: 'Unauthorized: Invalid API key',
      });

      const result = await scrapeUniversal(mockClients, {
        url: 'https://example.com',
      });

      expect(result.isAuthError).toBe(true);
      expect(result.error).toContain('Firecrawl authentication error');
      expect(result.diagnostics?.strategiesAttempted).toEqual(['native', 'firecrawl']);
      // BrightData should not be attempted after auth error
      expect(mockClients.brightData!.scrape).not.toHaveBeenCalled();
    });

    it('should stop immediately on brightdata authentication error', async () => {
      vi.mocked(mockClients.native.scrape).mockResolvedValue({ success: false });
      vi.mocked(mockClients.firecrawl!.scrape).mockResolvedValue({ success: false });
      vi.mocked(mockClients.brightData!.scrape).mockResolvedValue({
        success: false,
        error: 'Authentication failed: Invalid token',
      });

      const result = await scrapeUniversal(mockClients, {
        url: 'https://example.com',
      });

      expect(result.isAuthError).toBe(true);
      expect(result.error).toContain('BrightData authentication error');
      expect(result.diagnostics?.strategyErrors.brightdata).toBe(
        'Authentication failed: Authentication failed: Invalid token'
      );
    });
  });

  describe('speed optimization mode', () => {
    const originalEnv = process.env.OPTIMIZE_FOR;

    beforeEach(() => {
      process.env.OPTIMIZE_FOR = 'speed';
    });

    afterEach(() => {
      process.env.OPTIMIZE_FOR = originalEnv;
    });

    it('should skip native strategy and include in diagnostics', async () => {
      vi.mocked(mockClients.firecrawl!.scrape).mockResolvedValue({ success: false });
      vi.mocked(mockClients.brightData!.scrape).mockResolvedValue({ success: false });

      const result = await scrapeUniversal(mockClients, {
        url: 'https://example.com',
      });

      expect(result.diagnostics?.strategiesAttempted).toEqual(['firecrawl', 'brightdata']);
      expect(mockClients.native.scrape).not.toHaveBeenCalled();
      // Native should not have an error since it wasn't attempted
      expect(result.diagnostics?.strategyErrors.native).toBeUndefined();
    });

    it('should still report missing clients in speed mode', async () => {
      const clientsWithoutFirecrawl = {
        ...mockClients,
        firecrawl: undefined,
      };
      vi.mocked(mockClients.brightData!.scrape).mockResolvedValue({ success: false });

      const result = await scrapeUniversal(clientsWithoutFirecrawl, {
        url: 'https://example.com',
      });

      expect(result.diagnostics?.strategyErrors.firecrawl).toBe('Firecrawl client not configured');
      expect(result.diagnostics?.strategyErrors.brightdata).toBeDefined();
      expect(result.diagnostics?.strategiesAttempted).toEqual(['brightdata']);
    });
  });
});
