import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { searchFlightsTool } from '../../shared/src/tools/search-flights.js';
import { getSearchHistoryTool } from '../../shared/src/tools/get-search-history.js';
import { setRefreshTokenTool } from '../../shared/src/tools/set-refresh-token.js';
import { createMockPointsYeahClient } from '../mocks/pointsyeah-client.functional-mock.js';
import type { IPointsYeahClient } from '../../shared/src/server.js';
import {
  resetState,
  getServerState,
  setRefreshToken,
  setAuthenticated,
} from '../../shared/src/state.js';

const mockServer = {} as Server;

describe('PointsYeah Tools', () => {
  let mockClient: IPointsYeahClient;
  let clientFactory: () => IPointsYeahClient;

  beforeEach(() => {
    mockClient = createMockPointsYeahClient();
    clientFactory = () => mockClient;
    resetState();
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

    it('should handle client errors gracefully', async () => {
      const errorClient: IPointsYeahClient = {
        searchFlights: vi.fn().mockRejectedValue(new Error('API request failed')),
        getSearchHistory: vi.fn(),
      };
      const tool = searchFlightsTool(mockServer, () => errorClient);
      const result = await tool.handler({
        departure: 'SFO',
        arrival: 'NYC',
        departDate: '2026-04-01',
        tripType: '1',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('API request failed');
    });

    it('should handle empty search results', async () => {
      const emptyClient: IPointsYeahClient = {
        searchFlights: vi.fn().mockResolvedValue({
          total: 0,
          results: [],
        }),
        getSearchHistory: vi.fn(),
      };
      const tool = searchFlightsTool(mockServer, () => emptyClient);
      const result = await tool.handler({
        departure: 'SFO',
        arrival: 'NYC',
        departDate: '2026-04-01',
        tripType: '1',
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('No award flights found');
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

  describe('set_refresh_token', () => {
    it('should reject tokens that are too short', async () => {
      const onAuthSuccess = vi.fn();
      const tool = setRefreshTokenTool(onAuthSuccess);
      const result = await tool.handler({ refreshToken: 'too-short' });

      expect(result.isError).toBe(true);
      expect(onAuthSuccess).not.toHaveBeenCalled();
    });

    it('should have the correct tool metadata', () => {
      const onAuthSuccess = vi.fn();
      const tool = setRefreshTokenTool(onAuthSuccess);

      expect(tool.name).toBe('set_refresh_token');
      expect(tool.description).toContain('PointsYeah refresh token');
      expect(tool.description).toContain('document.cookie');
      expect(tool.inputSchema.required).toContain('refreshToken');
    });

    it('should track auth state transitions correctly', () => {
      expect(getServerState().authenticated).toBe(false);
      expect(getServerState().refreshToken).toBeNull();

      setRefreshToken('valid-token');
      setAuthenticated(true);

      expect(getServerState().authenticated).toBe(true);
      expect(getServerState().refreshToken).toBe('valid-token');

      // Simulate token revocation
      setAuthenticated(false);
      expect(getServerState().authenticated).toBe(false);
      expect(getServerState().refreshToken).toBe('valid-token');
    });
  });
});
