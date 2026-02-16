import type { IPointsYeahClient } from '../server.js';
import type { FlightSearchParams, FlightResult, FlightSearchResults } from '../types.js';

interface MockData {
  searchResults?: FlightResult[];
  searchHistory?: unknown[];
  [key: string]: unknown;
}

/**
 * Creates a mock implementation of IPointsYeahClient for integration tests.
 * This mocks the EXTERNAL API client, NOT the MCP client.
 */
export function createIntegrationMockPointsYeahClient(
  mockData: MockData = {}
): IPointsYeahClient & { mockData: MockData } {
  return {
    mockData,

    async searchFlights(_params: FlightSearchParams): Promise<FlightSearchResults> {
      const results: FlightResult[] = mockData.searchResults || [
        {
          program: 'United MileagePlus',
          code: 'UA',
          date: '2026-04-01',
          departure: 'SFO',
          arrival: 'NYC',
          routes: [
            {
              payment: {
                currency: 'USD',
                tax: 5.6,
                miles: 25000,
                cabin: 'Economy',
                unit: 'points',
                seats: 3,
                cash_price: 0,
              },
              segments: [
                {
                  duration: 320,
                  flight_number: 'UA123',
                  dt: '2026-04-01T08:00:00',
                  da: 'SFO',
                  at: '2026-04-01T16:20:00',
                  aa: 'EWR',
                  cabin: 'Economy',
                },
              ],
              transfer: [{ bank: 'Chase Ultimate Rewards', actual_points: 25000, points: 25000 }],
            },
          ],
        },
      ];

      return { total: results.length, results };
    },

    async getSearchHistory(): Promise<unknown> {
      return mockData.searchHistory || [];
    },
  };
}
