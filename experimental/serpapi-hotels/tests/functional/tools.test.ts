import { describe, it, expect, beforeEach } from 'vitest';
import { createRegisterTools } from '../../shared/src/tools.js';
import { createMockSerpApiClient } from '../mocks/serpapi-client.functional-mock.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { ISerpApiClient } from '../../shared/src/server.js';

describe('SerpAPI Hotels Tools', () => {
  let mockClient: ISerpApiClient;
  let callTool: (name: string, args: unknown) => Promise<unknown>;

  beforeEach(() => {
    mockClient = createMockSerpApiClient();

    let toolCallHandler:
      | ((request: { params: { name: string; arguments: unknown } }) => Promise<unknown>)
      | null = null;

    const mockServer = {
      setRequestHandler: (schema: unknown, handler: (request: unknown) => Promise<unknown>) => {
        if (schema === CallToolRequestSchema) {
          toolCallHandler = handler as (request: {
            params: { name: string; arguments: unknown };
          }) => Promise<unknown>;
        }
      },
    };

    const registerTools = createRegisterTools(() => mockClient);
    registerTools(mockServer as never);

    callTool = async (name: string, args: unknown) => {
      if (!toolCallHandler) throw new Error('Tool handler not registered');
      return toolCallHandler({ params: { name, arguments: args } });
    };
  });

  describe('search_hotels', () => {
    it('should search hotels successfully', async () => {
      const result = await callTool('search_hotels', {
        query: 'Hotels in New York',
        check_in_date: '2026-03-01',
        check_out_date: '2026-03-05',
      });

      const content = (result as { content: Array<{ text: string }> }).content[0];
      const parsed = JSON.parse(content.text);

      expect(parsed.properties).toHaveLength(2);
      expect(parsed.properties[0].name).toBe('Test Hotel Grand');
      expect(parsed.properties[0].rate_per_night.extracted_lowest).toBe(200);
      expect(parsed.properties[0].overall_rating).toBe(4.5);
      expect(parsed.properties[0].reviews).toBe(1200);
      expect(parsed.properties[0].property_token).toBe('test-token-1');
    });

    it('should pass search parameters correctly', async () => {
      const result = await callTool('search_hotels', {
        query: 'Beach resorts in Cancun',
        check_in_date: '2026-06-15',
        check_out_date: '2026-06-20',
        adults: 3,
        currency: 'EUR',
      });

      const content = (result as { content: Array<{ text: string }> }).content[0];
      const parsed = JSON.parse(content.text);

      expect(parsed.search_parameters.query).toBe('Beach resorts in Cancun');
      expect(parsed.search_parameters.check_in_date).toBe('2026-06-15');
      expect(parsed.search_parameters.check_out_date).toBe('2026-06-20');
      expect(parsed.search_parameters.adults).toBe(3);
      expect(parsed.search_parameters.currency).toBe('EUR');
    });

    it('should return error for invalid date format', async () => {
      const result = await callTool('search_hotels', {
        query: 'Hotels in Paris',
        check_in_date: '03/01/2026',
        check_out_date: '2026-03-05',
      });

      const content = (result as { content: Array<{ text: string }>; isError?: boolean })
        .content[0];
      expect(content.text).toContain('Error');
    });

    it('should return error for missing required fields', async () => {
      const result = await callTool('search_hotels', {
        query: 'Hotels in Paris',
      });

      const content = (result as { content: Array<{ text: string }>; isError?: boolean })
        .content[0];
      expect(content.text).toContain('Error');
    });

    it('should return error when check_out_date is before check_in_date', async () => {
      const result = await callTool('search_hotels', {
        query: 'Hotels in Paris',
        check_in_date: '2026-03-05',
        check_out_date: '2026-03-01',
      });

      const content = (result as { content: Array<{ text: string }>; isError?: boolean })
        .content[0];
      expect(content.text).toContain('check_out_date must be after check_in_date');
    });

    it('should include amenities and nearby places', async () => {
      const result = await callTool('search_hotels', {
        query: 'Hotels in New York',
        check_in_date: '2026-03-01',
        check_out_date: '2026-03-05',
      });

      const content = (result as { content: Array<{ text: string }> }).content[0];
      const parsed = JSON.parse(content.text);

      expect(parsed.properties[0].amenities).toContain('Free Wi-Fi');
      expect(parsed.properties[0].amenities).toContain('Pool');
      expect(parsed.properties[0].nearby_places[0].name).toBe('Central Park');
    });

    it('should include pricing from multiple sources', async () => {
      const result = await callTool('search_hotels', {
        query: 'Hotels in New York',
        check_in_date: '2026-03-01',
        check_out_date: '2026-03-05',
      });

      const content = (result as { content: Array<{ text: string }> }).content[0];
      const parsed = JSON.parse(content.text);

      expect(parsed.properties[0].prices).toHaveLength(1);
      expect(parsed.properties[0].prices[0].source).toBe('Booking.com');
    });
  });

  describe('get_hotel_details', () => {
    it('should get hotel details successfully', async () => {
      const result = await callTool('get_hotel_details', {
        property_token: 'test-token-1',
        check_in_date: '2026-03-01',
        check_out_date: '2026-03-05',
      });

      const content = (result as { content: Array<{ text: string }> }).content[0];
      const parsed = JSON.parse(content.text);

      expect(parsed.property.name).toBe('Test Hotel Grand');
      expect(parsed.property.overall_rating).toBe(4.5);
      expect(parsed.property.prices).toHaveLength(2);
      expect(parsed.reviews_breakdown).toHaveLength(2);
    });

    it('should include reviews breakdown', async () => {
      const result = await callTool('get_hotel_details', {
        property_token: 'test-token-1',
        check_in_date: '2026-03-01',
        check_out_date: '2026-03-05',
      });

      const content = (result as { content: Array<{ text: string }> }).content[0];
      const parsed = JSON.parse(content.text);

      const cleanliness = parsed.reviews_breakdown.find(
        (r: { name: string }) => r.name === 'Cleanliness'
      );
      expect(cleanliness).toBeDefined();
      expect(cleanliness.positive).toBe(270);
      expect(cleanliness.negative).toBe(15);

      const location = parsed.reviews_breakdown.find(
        (r: { name: string }) => r.name === 'Location'
      );
      expect(location).toBeDefined();
      expect(location.total_mentioned).toBe(500);
    });

    it('should include booking links from multiple sources', async () => {
      const result = await callTool('get_hotel_details', {
        property_token: 'test-token-1',
        check_in_date: '2026-03-01',
        check_out_date: '2026-03-05',
      });

      const content = (result as { content: Array<{ text: string }> }).content[0];
      const parsed = JSON.parse(content.text);

      expect(parsed.property.prices[0].source).toBe('Booking.com');
      expect(parsed.property.prices[1].source).toBe('Hotels.com');
    });

    it('should return error for missing property_token', async () => {
      const result = await callTool('get_hotel_details', {
        check_in_date: '2026-03-01',
        check_out_date: '2026-03-05',
      });

      const content = (result as { content: Array<{ text: string }>; isError?: boolean })
        .content[0];
      expect(content.text).toContain('Error');
    });

    it('should return error when check_out_date is before check_in_date', async () => {
      const result = await callTool('get_hotel_details', {
        property_token: 'test-token-1',
        check_in_date: '2026-03-05',
        check_out_date: '2026-03-01',
      });

      const content = (result as { content: Array<{ text: string }>; isError?: boolean })
        .content[0];
      expect(content.text).toContain('check_out_date must be after check_in_date');
    });
  });
});
