import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock external dependencies before importing the client
vi.mock('../../shared/src/pointsyeah-client/lib/explorer-search.js', () => ({
  explorerSearch: vi.fn(),
  fetchFlightDetail: vi.fn(),
}));

vi.mock('../../shared/src/pointsyeah-client/lib/auth.js', () => ({
  refreshCognitoTokens: vi.fn().mockResolvedValue({
    accessToken: 'mock-access',
    idToken: 'mock-id-token',
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
  }),
}));

vi.mock('../../shared/src/state.js', () => ({
  getServerState: vi.fn().mockReturnValue({
    authenticated: true,
    refreshToken: 'mock-refresh-token',
  }),
  resetState: vi.fn(),
  setRefreshToken: vi.fn(),
  setAuthenticated: vi.fn(),
}));

import { PointsYeahClient } from '../../shared/src/server.js';
import {
  explorerSearch,
  fetchFlightDetail,
} from '../../shared/src/pointsyeah-client/lib/explorer-search.js';
import type { ExplorerSearchResponse, ExplorerDetailResponse } from '../../shared/src/types.js';

const mockedExplorerSearch = vi.mocked(explorerSearch);
const mockedFetchFlightDetail = vi.mocked(fetchFlightDetail);

function makeSearchResult(departure: string, arrival: string, program: string = 'TestProgram') {
  return {
    program,
    departure_date: '2026-03-03',
    departure: { code: departure, city: 'Test City', country_name: 'Test' },
    arrival: { code: arrival, city: 'Test City', country_name: 'Test' },
    miles: 10000,
    tax: 5.6,
    cabin: 'Economy',
    detail_url: `https://cdn.example.com/${departure}-${arrival}.json`,
    stops: 0,
    seats: 3,
    duration: 120,
    transfer: [],
  };
}

function makeDetailResponse(
  departure: string,
  arrival: string,
  program: string = 'TestProgram'
): ExplorerDetailResponse {
  return {
    program,
    code: 'TP',
    date: '2026-03-03',
    departure,
    arrival,
    routes: [
      {
        payment: {
          currency: 'USD',
          tax: 5.6,
          miles: 10000,
          cabin: 'Economy',
          unit: 'points',
          seats: 3,
          cash_price: 0,
        },
        segments: [
          {
            departure_info: {
              date_time: '2026-03-03T08:00:00',
              airport: { airport_code: departure, city_name: 'Test' },
            },
            arrival_info: {
              date_time: '2026-03-03T10:00:00',
              airport: { airport_code: arrival, city_name: 'Test' },
            },
            cabin: 'Economy',
            flight: { airline_code: 'TP', airline_name: 'TestAir', number: 'TP123' },
            aircraft: '737',
            duration: 120,
          },
        ],
        duration: 120,
        transfer: null,
        program: 'TestProgram',
        code: 'TP',
      },
    ],
  };
}

describe('PointsYeahClient route filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should filter out results that do not match the requested route', async () => {
    // API returns results for ICN->AMS when we searched for SFO->SAN
    const searchResponse: ExplorerSearchResponse = {
      total: 2,
      results: [
        makeSearchResult('ICN', 'AMS', 'Miles & More'),
        makeSearchResult('ICN', 'AMS', 'Lufthansa'),
      ],
    };
    mockedExplorerSearch.mockResolvedValue(searchResponse);

    const client = new PointsYeahClient();
    const result = await client.searchFlights({
      departure: 'SFO',
      arrival: 'SAN',
      departDate: '2026-03-03',
      tripType: '1',
      adults: 1,
      children: 0,
      cabins: ['Economy'],
    });

    // All results should be filtered out since they don't match SFO->SAN
    expect(result.results).toHaveLength(0);
    expect(mockedFetchFlightDetail).not.toHaveBeenCalled();
  });

  it('should keep results that match the requested route', async () => {
    const searchResponse: ExplorerSearchResponse = {
      total: 1,
      results: [makeSearchResult('SFO', 'SAN', 'United MileagePlus')],
    };
    mockedExplorerSearch.mockResolvedValue(searchResponse);
    mockedFetchFlightDetail.mockResolvedValue(
      makeDetailResponse('SFO', 'SAN', 'United MileagePlus')
    );

    const client = new PointsYeahClient();
    const result = await client.searchFlights({
      departure: 'SFO',
      arrival: 'SAN',
      departDate: '2026-03-03',
      tripType: '1',
      adults: 1,
      children: 0,
      cabins: ['Economy'],
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].program).toBe('United MileagePlus');
    expect(mockedFetchFlightDetail).toHaveBeenCalledTimes(1);
  });

  it('should filter a mix of matching and non-matching results', async () => {
    const searchResponse: ExplorerSearchResponse = {
      total: 3,
      results: [
        makeSearchResult('SFO', 'SAN', 'United MileagePlus'),
        makeSearchResult('ICN', 'AMS', 'Miles & More'),
        makeSearchResult('SFO', 'SAN', 'Alaska Airlines'),
      ],
    };
    mockedExplorerSearch.mockResolvedValue(searchResponse);
    mockedFetchFlightDetail
      .mockResolvedValueOnce(makeDetailResponse('SFO', 'SAN', 'United MileagePlus'))
      .mockResolvedValueOnce(makeDetailResponse('SFO', 'SAN', 'Alaska Airlines'));

    const client = new PointsYeahClient();
    const result = await client.searchFlights({
      departure: 'SFO',
      arrival: 'SAN',
      departDate: '2026-03-03',
      tripType: '1',
      adults: 1,
      children: 0,
      cabins: ['Economy'],
    });

    expect(result.results).toHaveLength(2);
    expect(result.results[0].program).toBe('United MileagePlus');
    expect(result.results[1].program).toBe('Alaska Airlines');
    // Should only fetch details for matching results, not the ICN->AMS one
    expect(mockedFetchFlightDetail).toHaveBeenCalledTimes(2);
  });

  it('should match case-insensitively', async () => {
    const searchResponse: ExplorerSearchResponse = {
      total: 1,
      results: [makeSearchResult('sfo', 'san', 'United MileagePlus')],
    };
    mockedExplorerSearch.mockResolvedValue(searchResponse);
    mockedFetchFlightDetail.mockResolvedValue(
      makeDetailResponse('SFO', 'SAN', 'United MileagePlus')
    );

    const client = new PointsYeahClient();
    const result = await client.searchFlights({
      departure: 'SFO',
      arrival: 'SAN',
      departDate: '2026-03-03',
      tripType: '1',
      adults: 1,
      children: 0,
      cabins: ['Economy'],
    });

    expect(result.results).toHaveLength(1);
  });

  it('should filter results where only departure matches', async () => {
    const searchResponse: ExplorerSearchResponse = {
      total: 1,
      results: [makeSearchResult('SFO', 'LAX', 'United MileagePlus')],
    };
    mockedExplorerSearch.mockResolvedValue(searchResponse);

    const client = new PointsYeahClient();
    const result = await client.searchFlights({
      departure: 'SFO',
      arrival: 'SAN',
      departDate: '2026-03-03',
      tripType: '1',
      adults: 1,
      children: 0,
      cabins: ['Economy'],
    });

    expect(result.results).toHaveLength(0);
    expect(mockedFetchFlightDetail).not.toHaveBeenCalled();
  });

  it('should filter results where only arrival matches', async () => {
    const searchResponse: ExplorerSearchResponse = {
      total: 1,
      results: [makeSearchResult('LAX', 'SAN', 'Southwest')],
    };
    mockedExplorerSearch.mockResolvedValue(searchResponse);

    const client = new PointsYeahClient();
    const result = await client.searchFlights({
      departure: 'SFO',
      arrival: 'SAN',
      departDate: '2026-03-03',
      tripType: '1',
      adults: 1,
      children: 0,
      cabins: ['Economy'],
    });

    expect(result.results).toHaveLength(0);
    expect(mockedFetchFlightDetail).not.toHaveBeenCalled();
  });
});
