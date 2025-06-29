import { describe, it, expect, beforeEach, vi } from 'vitest';
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
        format: 'markdown',
      });

      expect(result).toEqual({
        success: true,
        content: 'Native content',
        source: 'native',
      });
      expect(mockClients.native.scrape).toHaveBeenCalledWith('https://example.com');
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
        format: 'markdown',
      });

      expect(result).toEqual({
        success: true,
        content: 'Firecrawl content',
        source: 'firecrawl',
      });
      expect(mockClients.firecrawl!.scrape).toHaveBeenCalledWith('https://example.com', {
        onlyMainContent: undefined,
        formats: ['markdown'],
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
        format: 'markdown',
      });

      expect(result).toEqual({
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
        format: 'markdown',
      });

      expect(result).toEqual({
        success: false,
        content: null,
        source: 'none',
        error: 'All fallback strategies failed',
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
        format: 'markdown',
      });

      expect(result).toEqual({
        success: true,
        content: 'Firecrawl content',
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

      expect(result).toEqual({
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

      expect(result).toEqual({
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

      expect(result).toEqual({
        success: true,
        content: 'Content despite error',
        source: 'native',
      });
    });
  });
});
