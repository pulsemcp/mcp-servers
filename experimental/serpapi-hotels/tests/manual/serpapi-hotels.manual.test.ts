import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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
      expect(toolNames).toContain('get_hotel_reviews');
      expect(tools.length).toBe(3);

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

      // Try multiple properties since some tokens may not work with the details endpoint
      let parsed = null;
      for (const prop of searchParsed.properties.slice(0, 3)) {
        if (!prop.property_token) continue;

        const result = await client.callTool('get_hotel_details', {
          query: 'Hotels in New York',
          property_token: prop.property_token,
          check_in_date: '2026-04-01',
          check_out_date: '2026-04-05',
        });

        const content = (result as { content: Array<{ text: string }> }).content[0];
        if (content.text.startsWith('Error')) {
          console.log(`Property token ${prop.property_token} returned error, trying next...`);
          continue;
        }

        parsed = JSON.parse(content.text);
        break;
      }

      if (!parsed) {
        throw new Error('All property tokens returned errors from SerpAPI details endpoint');
      }

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

  describe('get_hotel_reviews', () => {
    it('should get reviews for a hotel', async () => {
      // First, search to get a property_token
      const searchResult = await client.callTool('search_hotels', {
        query: 'Hotels in New York',
        check_in_date: '2026-04-01',
        check_out_date: '2026-04-05',
      });

      const searchContent = (searchResult as { content: Array<{ text: string }> }).content[0];
      const searchParsed = JSON.parse(searchContent.text);

      // Try multiple properties since some tokens may not work
      let parsed = null;
      for (const prop of searchParsed.properties.slice(0, 3)) {
        if (!prop.property_token) continue;

        const result = await client.callTool('get_hotel_reviews', {
          property_token: prop.property_token,
        });

        const content = (result as { content: Array<{ text: string }> }).content[0];
        if (content.text.startsWith('Error')) {
          console.log(
            `Property token ${prop.property_token} returned error for reviews, trying next...`
          );
          continue;
        }

        parsed = JSON.parse(content.text);
        break;
      }

      if (!parsed) {
        throw new Error('All property tokens returned errors from SerpAPI reviews endpoint');
      }

      expect(parsed.reviews).toBeDefined();
      expect(parsed.reviews.length).toBeGreaterThan(0);
      expect(parsed.reviews[0].snippet).toBeDefined();
      expect(parsed.reviews[0].rating).toBeDefined();

      console.log(`Got ${parsed.reviews.length} reviews`);
      console.log(`First review by: ${parsed.reviews[0].user.name}`);
      console.log(`Rating: ${parsed.reviews[0].rating}/${parsed.reviews[0].best_rating}`);
      console.log(
        `Snippet: ${parsed.reviews[0].snippet?.substring(0, 100)}${parsed.reviews[0].snippet?.length > 100 ? '...' : ''}`
      );

      if (parsed.reviews[0].response) {
        console.log(`Hotel response: ${parsed.reviews[0].response.snippet.substring(0, 80)}...`);
      }
    });

    it('should sort reviews by most recent', async () => {
      const searchResult = await client.callTool('search_hotels', {
        query: 'Hotels in New York',
        check_in_date: '2026-04-01',
        check_out_date: '2026-04-05',
      });

      const searchContent = (searchResult as { content: Array<{ text: string }> }).content[0];
      const searchParsed = JSON.parse(searchContent.text);
      const propertyToken = searchParsed.properties[0]?.property_token;

      if (!propertyToken) {
        console.log('No property_token - skipping sort test');
        return;
      }

      const result = await client.callTool('get_hotel_reviews', {
        property_token: propertyToken,
        sort_by: 2, // Most recent
      });

      const content = (result as { content: Array<{ text: string }> }).content[0];
      if (content.text.startsWith('Error')) {
        throw new Error(`Reviews sort test failed: ${content.text}`);
      }

      const parsed = JSON.parse(content.text);
      expect(parsed.reviews).toBeDefined();
      expect(parsed.search_parameters.sort_by).toBe(2);

      console.log(`Got ${parsed.reviews.length} reviews sorted by most recent`);
      if (parsed.reviews[0]?.date) {
        console.log(`Most recent review date: ${parsed.reviews[0].date}`);
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
      expect(config.availableTools).toContain('get_hotel_reviews');

      console.log('Server config:', JSON.stringify(config, null, 2));
    });
  });
});
