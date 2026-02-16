import { describe, it, expect } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY;

describe('SerpAPI Hotels MCP Server - Manual Tests', () => {
  let client: TestMCPClient;

  if (!SERPAPI_API_KEY) {
    it.skip('SERPAPI_API_KEY not set - skipping manual tests', () => {});
    return;
  }

  beforeAll(async () => {
    const serverPath = path.join(__dirname, '../../local/build/index.js');

    client = new TestMCPClient({
      serverPath,
      env: {
        SERPAPI_API_KEY,
      },
      debug: false,
    });

    await client.connect();
  }, 30000);

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  describe('Tool Listing', () => {
    it('should list all tools', async () => {
      const result = await client.listTools();
      const tools = result.tools as Array<{ name: string }>;

      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('search_hotels');
      expect(toolNames).toContain('get_hotel_details');
      expect(tools.length).toBe(2);

      console.log('Available tools:', toolNames.join(', '));
    });
  });

  describe('search_hotels', () => {
    it('should search for hotels in a city', async () => {
      const result = await client.callTool('search_hotels', {
        query: 'Hotels in New York',
        check_in_date: '2026-04-01',
        check_out_date: '2026-04-05',
      });

      const content = (result as { content: Array<{ text: string }> }).content[0];
      const parsed = JSON.parse(content.text);

      expect(parsed.properties).toBeDefined();
      expect(parsed.properties.length).toBeGreaterThan(0);
      expect(parsed.properties[0].name).toBeDefined();
      expect(parsed.properties[0].rate_per_night).toBeDefined();

      console.log(`Found ${parsed.properties.length} hotels`);
      console.log(
        `First hotel: ${parsed.properties[0].name} - ${parsed.properties[0].rate_per_night?.lowest}/night`
      );
    });

    it('should search with price filters', async () => {
      const result = await client.callTool('search_hotels', {
        query: 'Hotels in Chicago',
        check_in_date: '2026-04-01',
        check_out_date: '2026-04-05',
        min_price: 50,
        max_price: 200,
      });

      const content = (result as { content: Array<{ text: string }> }).content[0];
      const parsed = JSON.parse(content.text);

      expect(parsed.properties).toBeDefined();
      console.log(`Found ${parsed.properties.length} hotels in price range $50-$200`);
    });

    it('should sort by lowest price', async () => {
      const result = await client.callTool('search_hotels', {
        query: 'Hotels in San Francisco',
        check_in_date: '2026-04-01',
        check_out_date: '2026-04-03',
        sort_by: 3,
      });

      const content = (result as { content: Array<{ text: string }> }).content[0];
      const parsed = JSON.parse(content.text);

      expect(parsed.properties).toBeDefined();
      expect(parsed.properties.length).toBeGreaterThan(0);

      console.log(
        `Sorted by price - cheapest: ${parsed.properties[0].name} at ${parsed.properties[0].rate_per_night?.lowest}/night`
      );
    });

    it('should filter by rating', async () => {
      const result = await client.callTool('search_hotels', {
        query: 'Hotels in Miami',
        check_in_date: '2026-05-01',
        check_out_date: '2026-05-05',
        rating: 8,
      });

      const content = (result as { content: Array<{ text: string }> }).content[0];
      const parsed = JSON.parse(content.text);

      expect(parsed.properties).toBeDefined();
      console.log(`Found ${parsed.properties.length} hotels rated 4.0+`);
    });

    it('should search with different currency', async () => {
      const result = await client.callTool('search_hotels', {
        query: 'Hotels in London',
        check_in_date: '2026-04-01',
        check_out_date: '2026-04-05',
        currency: 'GBP',
        gl: 'uk',
      });

      const content = (result as { content: Array<{ text: string }> }).content[0];
      const parsed = JSON.parse(content.text);

      expect(parsed.properties).toBeDefined();
      expect(parsed.search_parameters.currency).toBe('GBP');

      console.log(`Found ${parsed.properties.length} hotels in London (GBP pricing)`);
    });

    it('should handle pagination token', async () => {
      const firstResult = await client.callTool('search_hotels', {
        query: 'Hotels in Los Angeles',
        check_in_date: '2026-04-01',
        check_out_date: '2026-04-05',
      });

      const firstContent = (firstResult as { content: Array<{ text: string }> }).content[0];
      const firstParsed = JSON.parse(firstContent.text);

      if (firstParsed.next_page_token) {
        const nextResult = await client.callTool('search_hotels', {
          query: 'Hotels in Los Angeles',
          check_in_date: '2026-04-01',
          check_out_date: '2026-04-05',
          next_page_token: firstParsed.next_page_token,
        });

        const nextContent = (nextResult as { content: Array<{ text: string }> }).content[0];
        const nextParsed = JSON.parse(nextContent.text);

        expect(nextParsed.properties).toBeDefined();
        console.log(`Page 2: Found ${nextParsed.properties.length} more hotels`);
      } else {
        console.log('No pagination token returned - only one page of results');
      }
    });
  });

  describe('get_hotel_details', () => {
    it('should get details for a specific hotel', async () => {
      // First, search to get a property_token
      const searchResult = await client.callTool('search_hotels', {
        query: 'Hotels in New York',
        check_in_date: '2026-04-01',
        check_out_date: '2026-04-05',
      });

      const searchContent = (searchResult as { content: Array<{ text: string }> }).content[0];
      const searchParsed = JSON.parse(searchContent.text);
      const propertyToken = searchParsed.properties[0]?.property_token;

      if (!propertyToken) {
        console.log('No property_token in search results - skipping details test');
        return;
      }

      const result = await client.callTool('get_hotel_details', {
        property_token: propertyToken,
        check_in_date: '2026-04-01',
        check_out_date: '2026-04-05',
      });

      const content = (result as { content: Array<{ text: string }> }).content[0];
      const parsed = JSON.parse(content.text);

      expect(parsed.property).toBeDefined();
      expect(parsed.property.name).toBeDefined();

      console.log(`Hotel: ${parsed.property.name}`);
      console.log(`Rating: ${parsed.property.overall_rating} (${parsed.property.reviews} reviews)`);
      console.log(`Prices from ${parsed.property.prices?.length || 0} sources`);
      console.log(`Reviews breakdown: ${parsed.reviews_breakdown?.length || 0} categories`);

      if (parsed.property.amenities?.length > 0) {
        console.log(`Amenities: ${parsed.property.amenities.slice(0, 5).join(', ')}...`);
      }
    });
  });

  describe('Resources', () => {
    it('should read server config', async () => {
      const result = await client.readResource('serpapi-hotels://config');
      const config = JSON.parse(result.contents[0].text as string);

      expect(config.server.name).toBe('serpapi-hotels-mcp-server');
      expect(config.availableTools).toContain('search_hotels');
      expect(config.availableTools).toContain('get_hotel_details');

      console.log('Server config:', JSON.stringify(config, null, 2));
    });
  });
});
