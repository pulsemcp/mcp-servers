import { describe, it, expect, vi } from 'vitest';
import { findProviders } from '../../shared/src/tools/find-providers.js';
import type { IPulseMCPAdminClient, Provider, ProvidersResponse } from '../../shared/src/index.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

describe('find_providers tool', () => {
  const mockServer = {} as Server;

  describe('find by ID', () => {
    it('should fetch and format a provider by ID', async () => {
      const mockProvider: Provider = {
        id: 1,
        name: 'Anthropic',
        slug: 'anthropic',
        url: 'https://anthropic.com',
        implementations_count: 5,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
      };

      const mockClient: Partial<IPulseMCPAdminClient> = {
        getProviderById: vi.fn().mockResolvedValue(mockProvider),
        searchProviders: vi.fn(),
      };

      const tool = findProviders(mockServer, () => mockClient as IPulseMCPAdminClient);
      const result = await tool.handler({ id: 1 });

      expect(mockClient.getProviderById).toHaveBeenCalledWith(1);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const text = result.content[0].text as string;
      expect(text).toContain('**Anthropic**');
      expect(text).toContain('ID: 1');
      expect(text).toContain('Slug: anthropic');
      expect(text).toContain('URL: https://anthropic.com');
      expect(text).toContain('Implementations: 5');
      expect(text).toContain('Created: 2024-01-01T00:00:00Z');
    });

    it('should handle provider not found', async () => {
      const mockClient: Partial<IPulseMCPAdminClient> = {
        getProviderById: vi.fn().mockResolvedValue(null),
        searchProviders: vi.fn(),
      };

      const tool = findProviders(mockServer, () => mockClient as IPulseMCPAdminClient);
      const result = await tool.handler({ id: 999 });

      expect(mockClient.getProviderById).toHaveBeenCalledWith(999);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const text = result.content[0].text as string;
      expect(text).toContain('Provider with ID 999 not found');
    });

    it('should handle provider with minimal fields', async () => {
      const mockProvider: Provider = {
        id: 2,
        name: 'Test Provider',
        slug: 'test-provider',
      };

      const mockClient: Partial<IPulseMCPAdminClient> = {
        getProviderById: vi.fn().mockResolvedValue(mockProvider),
        searchProviders: vi.fn(),
      };

      const tool = findProviders(mockServer, () => mockClient as IPulseMCPAdminClient);
      const result = await tool.handler({ id: 2 });

      expect(result.content).toHaveLength(1);
      const text = result.content[0].text as string;
      expect(text).toContain('**Test Provider**');
      expect(text).toContain('ID: 2');
      expect(text).toContain('Slug: test-provider');
      expect(text).not.toContain('URL:');
      expect(text).not.toContain('Implementations:');
    });
  });

  describe('search by query', () => {
    it('should search and format providers', async () => {
      const mockProviders: Provider[] = [
        {
          id: 1,
          name: 'Anthropic',
          slug: 'anthropic',
          url: 'https://anthropic.com',
          implementations_count: 5,
        },
        {
          id: 2,
          name: 'Anthropic Labs',
          slug: 'anthropic-labs',
          implementations_count: 2,
        },
      ];

      const mockResponse: ProvidersResponse = {
        providers: mockProviders,
        pagination: {
          current_page: 1,
          total_pages: 1,
          total_count: 2,
          has_next: false,
          limit: 30,
        },
      };

      const mockClient: Partial<IPulseMCPAdminClient> = {
        getProviderById: vi.fn(),
        searchProviders: vi.fn().mockResolvedValue(mockResponse),
      };

      const tool = findProviders(mockServer, () => mockClient as IPulseMCPAdminClient);
      const result = await tool.handler({ query: 'anthropic' });

      expect(mockClient.searchProviders).toHaveBeenCalledWith({
        query: 'anthropic',
        limit: undefined,
        offset: undefined,
      });
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const text = result.content[0].text as string;
      expect(text).toContain('Found 2 provider(s) matching "anthropic"');
      expect(text).toContain('showing 2 of 2 total');
      expect(text).toContain('1. **Anthropic**');
      expect(text).toContain('ID: 1 | Slug: anthropic');
      expect(text).toContain('URL: https://anthropic.com');
      expect(text).toContain('Implementations: 5');
      expect(text).toContain('2. **Anthropic Labs**');
      expect(text).toContain('ID: 2 | Slug: anthropic-labs');
      expect(text).toContain('Implementations: 2');
    });

    it('should handle pagination parameters', async () => {
      const mockProviders: Provider[] = [
        {
          id: 3,
          name: 'Provider Three',
          slug: 'provider-three',
          implementations_count: 1,
        },
      ];

      const mockResponse: ProvidersResponse = {
        providers: mockProviders,
        pagination: {
          current_page: 2,
          total_pages: 3,
          total_count: 75,
          has_next: true,
          limit: 25,
        },
      };

      const mockClient: Partial<IPulseMCPAdminClient> = {
        getProviderById: vi.fn(),
        searchProviders: vi.fn().mockResolvedValue(mockResponse),
      };

      const tool = findProviders(mockServer, () => mockClient as IPulseMCPAdminClient);
      const result = await tool.handler({ query: 'provider', limit: 25, offset: 25 });

      expect(mockClient.searchProviders).toHaveBeenCalledWith({
        query: 'provider',
        limit: 25,
        offset: 25,
      });

      const text = result.content[0].text as string;
      expect(text).toContain('showing 1 of 75 total');
      expect(text).toContain('More results available. Use offset=50 to see the next page');
    });

    it('should handle empty search results', async () => {
      const mockResponse: ProvidersResponse = {
        providers: [],
        pagination: {
          current_page: 1,
          total_pages: 0,
          total_count: 0,
          has_next: false,
          limit: 30,
        },
      };

      const mockClient: Partial<IPulseMCPAdminClient> = {
        getProviderById: vi.fn(),
        searchProviders: vi.fn().mockResolvedValue(mockResponse),
      };

      const tool = findProviders(mockServer, () => mockClient as IPulseMCPAdminClient);
      const result = await tool.handler({ query: 'nonexistent' });

      const text = result.content[0].text as string;
      expect(text).toContain('Found 0 provider(s) matching "nonexistent"');
    });

    it('should handle providers without optional fields', async () => {
      const mockProviders: Provider[] = [
        {
          id: 10,
          name: 'Minimal Provider',
          slug: 'minimal-provider',
        },
      ];

      const mockResponse: ProvidersResponse = {
        providers: mockProviders,
      };

      const mockClient: Partial<IPulseMCPAdminClient> = {
        getProviderById: vi.fn(),
        searchProviders: vi.fn().mockResolvedValue(mockResponse),
      };

      const tool = findProviders(mockServer, () => mockClient as IPulseMCPAdminClient);
      const result = await tool.handler({ query: 'minimal' });

      const text = result.content[0].text as string;
      expect(text).toContain('1. **Minimal Provider**');
      expect(text).toContain('ID: 10 | Slug: minimal-provider');
      expect(text).not.toContain('URL:');
      expect(text).not.toContain('Implementations:');
      expect(text).not.toContain('showing');
    });
  });

  describe('validation', () => {
    it('should reject when neither id nor query is provided', async () => {
      const mockClient: Partial<IPulseMCPAdminClient> = {
        getProviderById: vi.fn(),
        searchProviders: vi.fn(),
      };

      const tool = findProviders(mockServer, () => mockClient as IPulseMCPAdminClient);

      await expect(tool.handler({})).rejects.toThrow();
    });

    it('should reject invalid limit values', async () => {
      const mockClient: Partial<IPulseMCPAdminClient> = {
        getProviderById: vi.fn(),
        searchProviders: vi.fn(),
      };

      const tool = findProviders(mockServer, () => mockClient as IPulseMCPAdminClient);

      await expect(tool.handler({ query: 'test', limit: 0 })).rejects.toThrow();
      await expect(tool.handler({ query: 'test', limit: 101 })).rejects.toThrow();
    });

    it('should reject negative offset values', async () => {
      const mockClient: Partial<IPulseMCPAdminClient> = {
        getProviderById: vi.fn(),
        searchProviders: vi.fn(),
      };

      const tool = findProviders(mockServer, () => mockClient as IPulseMCPAdminClient);

      await expect(tool.handler({ query: 'test', offset: -1 })).rejects.toThrow();
    });

    it('should reject invalid id values', async () => {
      const mockClient: Partial<IPulseMCPAdminClient> = {
        getProviderById: vi.fn(),
        searchProviders: vi.fn(),
      };

      const tool = findProviders(mockServer, () => mockClient as IPulseMCPAdminClient);

      await expect(tool.handler({ id: 0 })).rejects.toThrow();
      await expect(tool.handler({ id: -1 })).rejects.toThrow();
      await expect(tool.handler({ id: 1.5 })).rejects.toThrow();
    });

    it('should reject empty query strings', async () => {
      const mockClient: Partial<IPulseMCPAdminClient> = {
        getProviderById: vi.fn(),
        searchProviders: vi.fn(),
      };

      const tool = findProviders(mockServer, () => mockClient as IPulseMCPAdminClient);

      await expect(tool.handler({ query: '' })).rejects.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle client errors when fetching by ID', async () => {
      const mockClient: Partial<IPulseMCPAdminClient> = {
        getProviderById: vi.fn().mockRejectedValue(new Error('API error')),
        searchProviders: vi.fn(),
      };

      const tool = findProviders(mockServer, () => mockClient as IPulseMCPAdminClient);
      const result = await tool.handler({ id: 1 });

      expect(result.isError).toBe(true);
      const text = result.content[0].text as string;
      expect(text).toContain('Error finding providers');
      expect(text).toContain('API error');
    });

    it('should handle client errors when searching', async () => {
      const mockClient: Partial<IPulseMCPAdminClient> = {
        getProviderById: vi.fn(),
        searchProviders: vi.fn().mockRejectedValue(new Error('Search failed')),
      };

      const tool = findProviders(mockServer, () => mockClient as IPulseMCPAdminClient);
      const result = await tool.handler({ query: 'test' });

      expect(result.isError).toBe(true);
      const text = result.content[0].text as string;
      expect(text).toContain('Error finding providers');
      expect(text).toContain('Search failed');
    });
  });
});
