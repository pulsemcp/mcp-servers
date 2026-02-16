import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Tool {
  name: string;
  inputSchema: {
    required?: string[];
    properties?: Record<string, unknown>;
  };
}

describe('SerpAPI Hotels MCP Server Integration Tests', () => {
  let client: TestMCPClient;

  beforeAll(async () => {
    const serverPath = path.join(__dirname, '../../local/build/index.integration-with-mock.js');

    client = new TestMCPClient({
      serverPath,
      env: {},
      debug: false,
    });

    await client.connect();
  }, 30000);

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  describe('Server Lifecycle', () => {
    it('should connect successfully', () => {
      expect(client).toBeDefined();
    });
  });

  describe('Tool Listing', () => {
    it('should list all available tools', async () => {
      const result = await client.listTools();
      const tools = result.tools as Tool[];

      expect(tools).toBeDefined();
      expect(Array.isArray(tools)).toBe(true);

      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('search_hotels');
      expect(toolNames).toContain('get_hotel_details');
    });

    it('should have 2 tools total', async () => {
      const result = await client.listTools();
      const tools = result.tools as Tool[];
      expect(tools.length).toBe(2);
    });
  });

  describe('Tool Schemas', () => {
    it('search_hotels should have required parameters', async () => {
      const result = await client.listTools();
      const tools = result.tools as Tool[];
      const searchTool = tools.find((t) => t.name === 'search_hotels');

      expect(searchTool).toBeDefined();
      expect(searchTool!.inputSchema.required).toContain('query');
      expect(searchTool!.inputSchema.required).toContain('check_in_date');
      expect(searchTool!.inputSchema.required).toContain('check_out_date');
    });

    it('get_hotel_details should have required parameters', async () => {
      const result = await client.listTools();
      const tools = result.tools as Tool[];
      const detailsTool = tools.find((t) => t.name === 'get_hotel_details');

      expect(detailsTool).toBeDefined();
      expect(detailsTool!.inputSchema.required).toContain('query');
      expect(detailsTool!.inputSchema.required).toContain('property_token');
      expect(detailsTool!.inputSchema.required).toContain('check_in_date');
      expect(detailsTool!.inputSchema.required).toContain('check_out_date');
    });
  });

  describe('Tool Execution', () => {
    it('should search hotels', async () => {
      const result = await client.callTool('search_hotels', {
        query: 'Hotels in New York',
        check_in_date: '2026-03-01',
        check_out_date: '2026-03-05',
      });

      expect(result).toHaveProperty('content');
      const content = (result as { content: Array<{ text: string }> }).content[0];
      const parsed = JSON.parse(content.text);

      expect(parsed.properties).toBeDefined();
      expect(Array.isArray(parsed.properties)).toBe(true);
      expect(parsed.properties.length).toBeGreaterThan(0);
      expect(parsed.properties[0].name).toBeDefined();
      expect(parsed.properties[0].rate_per_night).toBeDefined();
      expect(parsed.properties[0].overall_rating).toBeDefined();
    });

    it('should get hotel details', async () => {
      const result = await client.callTool('get_hotel_details', {
        query: 'Hotels in New York',
        property_token: 'mock-property-token-1',
        check_in_date: '2026-03-01',
        check_out_date: '2026-03-05',
      });

      expect(result).toHaveProperty('content');
      const content = (result as { content: Array<{ text: string }> }).content[0];
      const parsed = JSON.parse(content.text);

      expect(parsed.property).toBeDefined();
      expect(parsed.property.name).toBeDefined();
      expect(parsed.property.prices).toBeDefined();
      expect(parsed.reviews_breakdown).toBeDefined();
      expect(Array.isArray(parsed.reviews_breakdown)).toBe(true);
    });

    it('should search hotels with optional filters', async () => {
      const result = await client.callTool('search_hotels', {
        query: 'Hotels in Paris',
        check_in_date: '2026-04-01',
        check_out_date: '2026-04-05',
        adults: 3,
        currency: 'EUR',
        sort_by: 3,
        min_price: 100,
        max_price: 500,
      });

      expect(result).toHaveProperty('content');
      const content = (result as { content: Array<{ text: string }> }).content[0];
      const parsed = JSON.parse(content.text);
      expect(parsed.properties).toBeDefined();
    });
  });

  describe('Resources', () => {
    it('should list resources', async () => {
      const result = await client.listResources();
      expect(result.resources).toBeDefined();
      expect(Array.isArray(result.resources)).toBe(true);

      const configResource = result.resources.find(
        (r: { uri: string }) => r.uri === 'serpapi-hotels://config'
      );
      expect(configResource).toBeDefined();
    });

    it('should read config resource', async () => {
      const result = await client.readResource('serpapi-hotels://config');
      expect(result.contents).toBeDefined();
      expect(result.contents.length).toBeGreaterThan(0);

      const config = JSON.parse(result.contents[0].text as string);
      expect(config.server.name).toBe('serpapi-hotels-mcp-server');
      expect(config.availableTools).toContain('search_hotels');
      expect(config.availableTools).toContain('get_hotel_details');
    });
  });
});
