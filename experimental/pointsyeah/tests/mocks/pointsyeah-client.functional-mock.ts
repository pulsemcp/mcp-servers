import { vi } from 'vitest';
import type { IPointsYeahClient } from '../../shared/src/server.js';

export function createMockPointsYeahClient(): IPointsYeahClient {
  return {
    searchFlights: vi.fn().mockResolvedValue({
      total: 1,
      results: [
        {
          program: 'United MileagePlus',
          code: 'UA',
          date: '2026-04-01',
          departure: 'SFO',
          arrival: 'EWR',
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
      ],
    }),

    getSearchHistory: vi.fn().mockResolvedValue([
      { route: 'SFO -> NYC', date: '2026-03-15' },
      { route: 'LAX -> LHR', date: '2026-03-10' },
    ]),
  };
}
