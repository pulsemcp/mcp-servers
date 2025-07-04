import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { scrapeTool } from '../../shared/src/tools/scrape.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { IScrapingClients, StrategyConfigFactory } from '../../shared/src/server.js';
import { ResourceStorageFactory } from '../../shared/src/storage/index.js';

// Mock dependencies
vi.mock('../../shared/src/scraping-strategies.js', () => ({
  scrapeWithStrategy: vi.fn().mockResolvedValue({
    success: true,
    content: '<h1>Test Content</h1><p>This is test content.</p>',
    source: 'native',
  }),
}));

vi.mock('../../shared/src/storage/index.js', () => ({
  ResourceStorageFactory: {
    create: vi.fn().mockResolvedValue({
      findByUrlAndExtract: vi.fn().mockResolvedValue([]),
      writeMulti: vi.fn().mockResolvedValue({
        raw: 'scraped://test.com/page_2024-01-01T00:00:00Z',
        cleaned: 'scraped://test.com/page_2024-01-01T00:00:00Z/cleaned',
        extracted: null,
      }),
    }),
    reset: vi.fn(),
  },
}));

vi.mock('../../shared/src/extract/index.js', () => ({
  ExtractClientFactory: {
    isAvailable: vi.fn().mockReturnValue(false),
    createFromEnv: vi.fn().mockReturnValue(null),
  },
}));

vi.mock('../../shared/src/clean/index.js', () => ({
  createCleaner: vi.fn().mockReturnValue({
    clean: vi.fn().mockResolvedValue('# Test Content\n\nThis is test content.'),
  }),
}));

describe('Resource Shape Validation', () => {
  let mockServer: Server;
  let mockClientsFactory: () => IScrapingClients;
  let mockStrategyConfigFactory: StrategyConfigFactory;

  beforeEach(() => {
    vi.clearAllMocks();
    ResourceStorageFactory.reset();

    mockServer = {} as Server;
    mockClientsFactory = () => ({}) as IScrapingClients;
    mockStrategyConfigFactory = () => ({
      getAllDomainConfigs: vi.fn().mockReturnValue([]),
      getDomainConfig: vi.fn().mockReturnValue(null),
    });
  });

  it('should return properly formatted embedded resource for saveAndReturn mode', async () => {
    const tool = scrapeTool(mockServer, mockClientsFactory, mockStrategyConfigFactory);

    const result = await tool.handler({
      url: 'https://test.com/page',
      resultHandling: 'saveAndReturn',
    });

    // Validate against MCP SDK schema
    const validation = CallToolResultSchema.safeParse(result);

    if (!validation.success) {
      console.error('Validation error:', JSON.stringify(validation.error, null, 2));
    }

    expect(validation.success).toBe(true);

    // Check the specific structure
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('resource');

    // The resource should be wrapped in a resource property
    expect(result.content[0]).toHaveProperty('resource');
    expect(result.content[0].resource).toMatchObject({
      uri: expect.stringContaining('scraped://'),
      name: 'https://test.com/page',
      mimeType: 'text/markdown',
      description: expect.stringContaining('Scraped content from'),
      text: expect.stringContaining('Test Content'),
    });
  });

  it('should return properly formatted resource_link for saveOnly mode', async () => {
    const tool = scrapeTool(mockServer, mockClientsFactory, mockStrategyConfigFactory);

    const result = await tool.handler({
      url: 'https://test.com/page',
      resultHandling: 'saveOnly',
    });

    // Validate against MCP SDK schema
    const validation = CallToolResultSchema.safeParse(result);
    expect(validation.success).toBe(true);

    // Check the specific structure
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('resource_link');
    expect(result.content[0]).not.toHaveProperty('resource');
    expect(result.content[0]).toMatchObject({
      type: 'resource_link',
      uri: expect.stringContaining('scraped://'),
      name: 'https://test.com/page',
      mimeType: 'text/markdown',
      description: expect.stringContaining('Scraped content from'),
    });
  });

  it('should return properly formatted text for returnOnly mode', async () => {
    const tool = scrapeTool(mockServer, mockClientsFactory, mockStrategyConfigFactory);

    const result = await tool.handler({
      url: 'https://test.com/page',
      resultHandling: 'returnOnly',
    });

    // Validate against MCP SDK schema
    const validation = CallToolResultSchema.safeParse(result);
    expect(validation.success).toBe(true);

    // Check the specific structure
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining('Test Content'),
    });
    expect(result.content[0]).not.toHaveProperty('resource');
  });
});
