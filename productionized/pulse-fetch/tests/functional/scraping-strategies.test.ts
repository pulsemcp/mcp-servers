import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  scrapeUniversal,
  scrapeWithSingleStrategy,
  scrapeWithStrategy,
} from '../../shared/src/scraping-strategies.js';
import type { IScrapingClients, IStrategyConfigClient } from '../../shared/src/server.js';
import type { ScrapingStrategy } from '../../shared/src/strategy-config/types.js';

describe('Scraping Strategies', () => {
  let mockClients: IScrapingClients;
  let mockConfigClient: IStrategyConfigClient;

  // Helper to check result without diagnostics for backward compatibility
  const expectResultWithoutDiagnostics = (
    actual: ScrapeResult,
    expected: ScrapeResult,
    shouldHaveDiagnostics = true
  ) => {
    const { diagnostics, ...actualWithoutDiagnostics } = actual;
    expect(actualWithoutDiagnostics).toEqual(expected);
    // Verify diagnostics exists and has expected structure (only for scrapeUniversal and scrapeWithStrategy)
    if (shouldHaveDiagnostics) {
      expect(diagnostics).toBeDefined();
      expect(diagnostics.strategiesAttempted).toBeDefined();
      expect(diagnostics.strategyErrors).toBeDefined();
      expect(diagnostics.timing).toBeDefined();
    }
  };

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

    mockConfigClient = {
      loadConfig: vi.fn(),
      saveConfig: vi.fn(),
      upsertEntry: vi.fn(),
      getStrategyForUrl: vi.fn(),
    };
  });

  describe('scrapeUniversal', () => {
    it('should try native first and return success', async () => {
      const mockNativeResult = {
        success: true,
        status: 200,
        data: 'Native content',
      };
      vi.mocked(mockClients.native.scrape).mockResolvedValue(mockNativeResult);

      const result = await scrapeUniversal(mockClients, {
        url: 'https://example.com',
      });

      expectResultWithoutDiagnostics(result, {
        success: true,
        content: 'Native content',
        source: 'native',
      });
      expect(mockClients.native.scrape).toHaveBeenCalledWith('https://example.com', {
        timeout: undefined,
      });
      expect(mockClients.firecrawl?.scrape).not.toHaveBeenCalled();
    });

    it('should fall back to firecrawl when native fails', async () => {
      const mockNativeResult = { success: false };
      const mockFirecrawlResult = {
        success: true,
        data: { markdown: 'Firecrawl content', html: '<p>Firecrawl content</p>' },
      };

      vi.mocked(mockClients.native.scrape).mockResolvedValue(mockNativeResult);
      vi.mocked(mockClients.firecrawl!.scrape).mockResolvedValue(mockFirecrawlResult);

      const result = await scrapeUniversal(mockClients, {
        url: 'https://example.com',
      });

      expectResultWithoutDiagnostics(result, {
        success: true,
        content: '<p>Firecrawl content</p>',
        source: 'firecrawl',
      });
      expect(mockClients.firecrawl!.scrape).toHaveBeenCalledWith('https://example.com', {
        formats: ['html'],
      });
    });

    it('should fall back to brightdata when both native and firecrawl fail', async () => {
      const mockBrightDataResult = {
        success: true,
        data: 'BrightData content',
      };

      vi.mocked(mockClients.native.scrape).mockResolvedValue({ success: false });
      vi.mocked(mockClients.firecrawl!.scrape).mockResolvedValue({ success: false });
      vi.mocked(mockClients.brightData!.scrape).mockResolvedValue(mockBrightDataResult);

      const result = await scrapeUniversal(mockClients, {
        url: 'https://example.com',
      });

      expectResultWithoutDiagnostics(result, {
        success: true,
        content: 'BrightData content',
        source: 'brightdata',
      });
    });

    it('should return failure when all strategies fail', async () => {
      vi.mocked(mockClients.native.scrape).mockResolvedValue({ success: false });
      vi.mocked(mockClients.firecrawl!.scrape).mockResolvedValue({ success: false });
      vi.mocked(mockClients.brightData!.scrape).mockResolvedValue({ success: false });

      const result = await scrapeUniversal(mockClients, {
        url: 'https://example.com',
      });

      expect(result.success).toBe(false);
      expect(result.content).toBe(null);
      expect(result.source).toBe('none');
      expect(result.error).toContain('All strategies failed');
      expect(result.diagnostics).toBeDefined();
    });

    describe('with OPTIMIZE_FOR environment variable', () => {
      const originalEnv = process.env.OPTIMIZE_FOR;

      afterEach(() => {
        process.env.OPTIMIZE_FOR = originalEnv;
      });

      it('should use cost optimization by default (native -> firecrawl -> brightdata)', async () => {
        delete process.env.OPTIMIZE_FOR;

        const mockNativeResult = {
          success: true,
          status: 200,
          data: 'Native content',
        };
        vi.mocked(mockClients.native.scrape).mockResolvedValue(mockNativeResult);

        const result = await scrapeUniversal(mockClients, {
          url: 'https://example.com',
        });

        expectResultWithoutDiagnostics(result, {
          success: true,
          content: 'Native content',
          source: 'native',
        });
        expect(mockClients.native.scrape).toHaveBeenCalled();
        expect(mockClients.firecrawl?.scrape).not.toHaveBeenCalled();
      });

      it('should skip native and use firecrawl first with speed optimization', async () => {
        process.env.OPTIMIZE_FOR = 'speed';

        const mockFirecrawlResult = {
          success: true,
          data: { markdown: 'Firecrawl content', html: '<p>Firecrawl content</p>' },
        };
        vi.mocked(mockClients.firecrawl!.scrape).mockResolvedValue(mockFirecrawlResult);

        const result = await scrapeUniversal(mockClients, {
          url: 'https://example.com',
        });

        expectResultWithoutDiagnostics(result, {
          success: true,
          content: '<p>Firecrawl content</p>',
          source: 'firecrawl',
        });
        expect(mockClients.native.scrape).not.toHaveBeenCalled();
        expect(mockClients.firecrawl!.scrape).toHaveBeenCalled();
      });

      it('should fall back to brightdata in speed mode when firecrawl fails', async () => {
        process.env.OPTIMIZE_FOR = 'speed';

        vi.mocked(mockClients.firecrawl!.scrape).mockResolvedValue({ success: false });
        const mockBrightDataResult = {
          success: true,
          data: 'BrightData content',
        };
        vi.mocked(mockClients.brightData!.scrape).mockResolvedValue(mockBrightDataResult);

        const result = await scrapeUniversal(mockClients, {
          url: 'https://example.com',
        });

        expectResultWithoutDiagnostics(result, {
          success: true,
          content: 'BrightData content',
          source: 'brightdata',
        });
        expect(mockClients.native.scrape).not.toHaveBeenCalled();
        expect(mockClients.firecrawl!.scrape).toHaveBeenCalled();
        expect(mockClients.brightData!.scrape).toHaveBeenCalled();
      });

      it('should handle cost mode explicitly set', async () => {
        process.env.OPTIMIZE_FOR = 'cost';

        const mockNativeResult = {
          success: true,
          status: 200,
          data: 'Native content',
        };
        vi.mocked(mockClients.native.scrape).mockResolvedValue(mockNativeResult);

        const result = await scrapeUniversal(mockClients, {
          url: 'https://example.com',
        });

        expectResultWithoutDiagnostics(result, {
          success: true,
          content: 'Native content',
          source: 'native',
        });
        expect(mockClients.native.scrape).toHaveBeenCalled();
      });
    });
  });

  describe('scrapeWithSingleStrategy', () => {
    it('should use native strategy successfully', async () => {
      const mockResult = { success: true, status: 200, data: 'Native content' };
      vi.mocked(mockClients.native.scrape).mockResolvedValue(mockResult);

      const result = await scrapeWithSingleStrategy(mockClients, 'native', {
        url: 'https://example.com',
      });

      expect(result).toEqual({
        success: true,
        content: 'Native content',
        source: 'native',
      });
    });

    it('should use firecrawl strategy successfully', async () => {
      const mockResult = {
        success: true,
        data: { markdown: 'Firecrawl content', html: '<p>Content</p>' },
      };
      vi.mocked(mockClients.firecrawl!.scrape).mockResolvedValue(mockResult);

      const result = await scrapeWithSingleStrategy(mockClients, 'firecrawl', {
        url: 'https://example.com',
      });

      expect(result).toEqual({
        success: true,
        content: '<p>Content</p>',
        source: 'firecrawl',
      });
    });

    it('should handle missing client gracefully', async () => {
      const clientsWithoutFirecrawl = {
        ...mockClients,
        firecrawl: undefined,
      };

      const result = await scrapeWithSingleStrategy(clientsWithoutFirecrawl, 'firecrawl', {
        url: 'https://example.com',
      });

      expect(result).toEqual({
        success: false,
        content: null,
        source: 'firecrawl',
        error: 'Firecrawl client not available',
      });
    });

    it('should handle unknown strategy', async () => {
      const result = await scrapeWithSingleStrategy(mockClients, 'unknown' as ScrapingStrategy, {
        url: 'https://example.com',
      });

      expect(result).toEqual({
        success: false,
        content: null,
        source: 'unknown',
        error: 'Unknown strategy: unknown',
      });
    });
  });

  describe('scrapeWithStrategy', () => {
    it('should use explicit strategy first', async () => {
      const mockResult = { success: true, status: 200, data: 'Native content' };
      vi.mocked(mockClients.native.scrape).mockResolvedValue(mockResult);

      const result = await scrapeWithStrategy(
        mockClients,
        mockConfigClient,
        { url: 'https://example.com' },
        'native'
      );

      expect(result).toEqual({
        success: true,
        content: 'Native content',
        source: 'native',
      });
      expect(mockConfigClient.getStrategyForUrl).not.toHaveBeenCalled();
    });

    it('should fall back to universal when explicit strategy fails', async () => {
      // Mock explicit strategy failure
      vi.mocked(mockClients.firecrawl!.scrape).mockResolvedValue({ success: false });

      // Mock universal fallback success (native)
      const mockNativeResult = { success: true, status: 200, data: 'Native fallback' };
      vi.mocked(mockClients.native.scrape).mockResolvedValue(mockNativeResult);

      const result = await scrapeWithStrategy(
        mockClients,
        mockConfigClient,
        { url: 'https://example.com' },
        'firecrawl'
      );

      expectResultWithoutDiagnostics(result, {
        success: true,
        content: 'Native fallback',
        source: 'native',
      });

      // Should save the successful strategy
      expect(mockConfigClient.upsertEntry).toHaveBeenCalledWith({
        prefix: 'example.com',
        default_strategy: 'native',
        notes: 'Auto-discovered after firecrawl failed',
      });
    });

    it('should use configured strategy from config file', async () => {
      vi.mocked(mockConfigClient.getStrategyForUrl).mockResolvedValue('brightdata');

      const mockBrightDataResult = { success: true, data: 'BrightData content' };
      vi.mocked(mockClients.brightData!.scrape).mockResolvedValue(mockBrightDataResult);

      const result = await scrapeWithStrategy(mockClients, mockConfigClient, {
        url: 'https://example.com',
      });

      expect(result).toEqual({
        success: true,
        content: 'BrightData content',
        source: 'brightdata',
      });
      expect(mockConfigClient.getStrategyForUrl).toHaveBeenCalledWith('https://example.com');
    });

    it('should fall back to universal when no configured strategy', async () => {
      vi.mocked(mockConfigClient.getStrategyForUrl).mockResolvedValue(null);

      const mockNativeResult = { success: true, status: 200, data: 'Universal content' };
      vi.mocked(mockClients.native.scrape).mockResolvedValue(mockNativeResult);

      const result = await scrapeWithStrategy(mockClients, mockConfigClient, {
        url: 'https://newsite.com',
      });

      expectResultWithoutDiagnostics(result, {
        success: true,
        content: 'Universal content',
        source: 'native',
      });

      // Should save the discovered strategy
      expect(mockConfigClient.upsertEntry).toHaveBeenCalledWith({
        prefix: 'newsite.com',
        default_strategy: 'native',
        notes: 'Auto-discovered via universal fallback',
      });
    });

    it('should handle config client errors gracefully', async () => {
      vi.mocked(mockConfigClient.getStrategyForUrl).mockRejectedValue(new Error('Config error'));

      const mockNativeResult = { success: true, status: 200, data: 'Content despite error' };
      vi.mocked(mockClients.native.scrape).mockResolvedValue(mockNativeResult);

      const result = await scrapeWithStrategy(mockClients, mockConfigClient, {
        url: 'https://example.com',
      });

      expectResultWithoutDiagnostics(result, {
        success: true,
        content: 'Content despite error',
        source: 'native',
      });
    });

    describe('URL pattern learning', () => {
      it('should save Yelp business pattern when successful', async () => {
        vi.mocked(mockConfigClient.getStrategyForUrl).mockResolvedValue(null);

        const mockBrightDataResult = { success: true, data: 'Yelp content' };
        vi.mocked(mockClients.native.scrape).mockResolvedValue({ success: false });
        vi.mocked(mockClients.firecrawl!.scrape).mockResolvedValue({ success: false });
        vi.mocked(mockClients.brightData!.scrape).mockResolvedValue(mockBrightDataResult);

        const result = await scrapeWithStrategy(mockClients, mockConfigClient, {
          url: 'https://yelp.com/biz/dolly-san-francisco',
        });

        expect(result.success).toBe(true);
        expect(mockConfigClient.upsertEntry).toHaveBeenCalledWith({
          prefix: 'yelp.com/biz/',
          default_strategy: 'brightdata',
          notes: 'Auto-discovered via universal fallback',
        });
      });

      it('should save Reddit subreddit pattern when successful', async () => {
        vi.mocked(mockConfigClient.getStrategyForUrl).mockResolvedValue(null);

        const mockFirecrawlResult = {
          success: true,
          data: { markdown: 'Reddit content', html: '<p>Reddit content</p>' },
        };
        vi.mocked(mockClients.native.scrape).mockResolvedValue({ success: false });
        vi.mocked(mockClients.firecrawl!.scrape).mockResolvedValue(mockFirecrawlResult);

        const result = await scrapeWithStrategy(mockClients, mockConfigClient, {
          url: 'https://reddit.com/r/programming/comments/123/title',
        });

        expect(result.success).toBe(true);
        expect(mockConfigClient.upsertEntry).toHaveBeenCalledWith({
          prefix: 'reddit.com/r/programming/comments/123/',
          default_strategy: 'firecrawl',
          notes: 'Auto-discovered via universal fallback',
        });
      });

      it('should save blog category pattern when successful', async () => {
        vi.mocked(mockConfigClient.getStrategyForUrl).mockResolvedValue(null);

        const mockNativeResult = { success: true, status: 200, data: 'Blog content' };
        vi.mocked(mockClients.native.scrape).mockResolvedValue(mockNativeResult);

        const result = await scrapeWithStrategy(mockClients, mockConfigClient, {
          url: 'https://example.com/blog/2024/article-title',
        });

        expect(result.success).toBe(true);
        expect(mockConfigClient.upsertEntry).toHaveBeenCalledWith({
          prefix: 'example.com/blog/2024/',
          default_strategy: 'native',
          notes: 'Auto-discovered via universal fallback',
        });
      });

      it('should save pattern after explicit strategy fails', async () => {
        // Explicit firecrawl strategy fails
        vi.mocked(mockClients.firecrawl!.scrape).mockResolvedValue({ success: false });

        // Universal fallback succeeds with brightdata
        vi.mocked(mockClients.native.scrape).mockResolvedValue({ success: false });
        vi.mocked(mockClients.brightData!.scrape).mockResolvedValue({
          success: true,
          data: 'Stack Overflow content',
        });

        const result = await scrapeWithStrategy(
          mockClients,
          mockConfigClient,
          { url: 'https://stackoverflow.com/questions/123456/how-to-do-x' },
          'firecrawl'
        );

        expect(result.success).toBe(true);
        expect(mockConfigClient.upsertEntry).toHaveBeenCalledWith({
          prefix: 'stackoverflow.com/questions/123456/',
          default_strategy: 'brightdata',
          notes: 'Auto-discovered after firecrawl failed',
        });
      });

      it('should handle hostname-only URLs correctly', async () => {
        vi.mocked(mockConfigClient.getStrategyForUrl).mockResolvedValue(null);

        const mockNativeResult = { success: true, status: 200, data: 'Homepage content' };
        vi.mocked(mockClients.native.scrape).mockResolvedValue(mockNativeResult);

        const result = await scrapeWithStrategy(mockClients, mockConfigClient, {
          url: 'https://simple-site.com',
        });

        expect(result.success).toBe(true);
        expect(mockConfigClient.upsertEntry).toHaveBeenCalledWith({
          prefix: 'simple-site.com',
          default_strategy: 'native',
          notes: 'Auto-discovered via universal fallback',
        });
      });
    });
  });
});
