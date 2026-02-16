import { describe, it, expect, beforeEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { searchFlightsTool } from '../../shared/src/tools/search-flights.js';
import { getSearchHistoryTool } from '../../shared/src/tools/get-search-history.js';
import { createMockPointsYeahClient } from '../mocks/pointsyeah-client.functional-mock.js';
import type { IPointsYeahClient } from '../../shared/src/server.js';

const mockServer = {} as Server;

describe('PointsYeah Tools', () => {
  let mockClient: IPointsYeahClient;
  let clientFactory: () => IPointsYeahClient;

  beforeEach(() => {
    mockClient = createMockPointsYeahClient();
    clientFactory = () => mockClient;
  });

  describe('search_flights', () => {
    it('should search for flights and return formatted results', async () => {
      const tool = searchFlightsTool(mockServer, clientFactory);
      const result = await tool.handler({
        departure: 'SFO',
        arrival: 'NYC',
        departDate: '2026-04-01',
        returnDate: '2026-04-08',
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Award Flight Search Results');
      expect(result.content[0].text).toContain('United MileagePlus');
      expect(result.content[0].text).toContain('25,000');
      expect(result.content[0].text).toContain('UA123');
      expect(result.content[0].text).toContain('Chase Ultimate Rewards');
    });

    it('should require returnDate for round-trip searches', async () => {
      const tool = searchFlightsTool(mockServer, clientFactory);
      const result = await tool.handler({
        departure: 'SFO',
        arrival: 'NYC',
        departDate: '2026-04-01',
      });

      expect(result.content[0].text).toContain('returnDate is required');
      expect(result.isError).toBe(true);
    });

    it('should allow one-way searches without returnDate', async () => {
      const tool = searchFlightsTool(mockServer, clientFactory);
      const result = await tool.handler({
        departure: 'SFO',
        arrival: 'NYC',
        departDate: '2026-04-01',
        tripType: '1',
      });

      expect(result.content[0].text).toContain('Award Flight Search Results');
    });

    it('should validate departure date format', async () => {
      const tool = searchFlightsTool(mockServer, clientFactory);
      const result = await tool.handler({
        departure: 'SFO',
        arrival: 'NYC',
        departDate: 'invalid-date',
      });

      expect(result.isError).toBe(true);
    });

    it('should validate required fields', async () => {
      const tool = searchFlightsTool(mockServer, clientFactory);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
    });
  });

  describe('get_search_history', () => {
    it('should return search history', async () => {
      const tool = getSearchHistoryTool(mockServer, clientFactory);
      const result = await tool.handler({});

      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].route).toBe('SFO -> NYC');
    });
  });
});
