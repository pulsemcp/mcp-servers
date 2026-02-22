import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock external dependencies before importing the client
vi.mock('../../shared/src/pointsyeah-client/lib/search.js', () => ({
  createSearchTask: vi.fn(),
}));

vi.mock('../../shared/src/pointsyeah-client/lib/fetch-results.js', () => ({
  fetchSearchResults: vi.fn(),
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
import { createSearchTask } from '../../shared/src/pointsyeah-client/lib/search.js';
import { fetchSearchResults } from '../../shared/src/pointsyeah-client/lib/fetch-results.js';
import type {
  FlightSearchParams,
  FlightSearchTask,
  FlightSearchResponse,
} from '../../shared/src/types.js';
import type { PlaywrightSearchDeps } from '../../shared/src/pointsyeah-client/lib/search.js';

const mockedCreateSearchTask = vi.mocked(createSearchTask);
const mockedFetchSearchResults = vi.mocked(fetchSearchResults);

function makeSearchParams(overrides: Partial<FlightSearchParams> = {}): FlightSearchParams {
  return {
    departure: 'SFO',
    arrival: 'NRT',
    departDate: '2026-03-03',
    tripType: '1',
    adults: 1,
    children: 0,
    cabins: ['Economy'],
    ...overrides,
  };
}

function makeTask(taskId: string = 'test-task-123'): FlightSearchTask {
  return {
    task_id: taskId,
    total_sub_tasks: 5,
    status: 'pending',
  };
}

function makeSearchResponse(
  results: NonNullable<FlightSearchResponse['data']>['result'],
  status: string = 'done'
): FlightSearchResponse {
  return {
    code: 0,
    success: true,
    data: {
      result: results,
      status,
    },
  };
}

function makeFlightResult(program: string, departure: string, arrival: string) {
  return {
    program,
    code: program.substring(0, 2).toUpperCase(),
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
            duration: 120,
            flight_number: 'TP123',
            dt: '2026-03-03T08:00:00',
            da: departure,
            at: '2026-03-03T10:00:00',
            aa: arrival,
            cabin: 'Economy',
          },
        ],
        transfer: [],
      },
    ],
  };
}

const mockPlaywright: PlaywrightSearchDeps = {
  launchBrowser: vi.fn(),
};

/**
 * Helper: run searchFlights with fake timers advancing so poll delays resolve instantly.
 * We kick off the search (which awaits setTimeout internally), then repeatedly
 * advance timers and flush microtasks until the search promise settles.
 */
async function runSearchWithFakeTimers(
  client: PointsYeahClient,
  params: FlightSearchParams
): Promise<{ total: number; results: NonNullable<FlightSearchResponse['data']>['result'] }> {
  const searchPromise = client.searchFlights(params);

  // Advance timers in a loop until the promise resolves or rejects
  let settled = false;
  const resultHolder: { value?: Awaited<typeof searchPromise>; error?: unknown } = {};
  searchPromise
    .then((v) => {
      resultHolder.value = v;
      settled = true;
    })
    .catch((e) => {
      resultHolder.error = e;
      settled = true;
    });

  while (!settled) {
    // Advance past the 3-second poll interval
    await vi.advanceTimersByTimeAsync(3100);
  }

  if (resultHolder.error) throw resultHolder.error;
  return resultHolder.value!;
}

describe('PointsYeahClient live search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create a search task and poll for results', async () => {
    const task = makeTask();
    mockedCreateSearchTask.mockResolvedValue(task);
    mockedFetchSearchResults.mockResolvedValue(
      makeSearchResponse([makeFlightResult('United MileagePlus', 'SFO', 'NRT')])
    );

    const client = new PointsYeahClient(mockPlaywright);
    const result = await runSearchWithFakeTimers(client, makeSearchParams());

    expect(mockedCreateSearchTask).toHaveBeenCalledTimes(1);
    expect(mockedFetchSearchResults).toHaveBeenCalledTimes(1);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].program).toBe('United MileagePlus');
    expect(result.total).toBe(1);
  });

  it('should poll multiple times until status is done, accumulating results', async () => {
    const task = makeTask();
    mockedCreateSearchTask.mockResolvedValue(task);

    // First poll: processing, 1 result
    mockedFetchSearchResults.mockResolvedValueOnce(
      makeSearchResponse([makeFlightResult('United', 'SFO', 'NRT')], 'processing')
    );
    // Second poll: processing, 1 new result
    mockedFetchSearchResults.mockResolvedValueOnce(
      makeSearchResponse([makeFlightResult('ANA', 'SFO', 'NRT')], 'processing')
    );
    // Third poll: done, 1 new result
    mockedFetchSearchResults.mockResolvedValueOnce(
      makeSearchResponse([makeFlightResult('JAL', 'SFO', 'NRT')], 'done')
    );

    const client = new PointsYeahClient(mockPlaywright);
    const result = await runSearchWithFakeTimers(client, makeSearchParams());

    expect(mockedFetchSearchResults).toHaveBeenCalledTimes(3);
    // All 3 results accumulated across polls
    expect(result.results).toHaveLength(3);
    expect(result.total).toBe(3);
  });

  it('should return empty results when search completes with no flights', async () => {
    const task = makeTask();
    mockedCreateSearchTask.mockResolvedValue(task);
    mockedFetchSearchResults.mockResolvedValue(makeSearchResponse([]));

    const client = new PointsYeahClient(mockPlaywright);
    const result = await runSearchWithFakeTimers(client, makeSearchParams());

    expect(result.results).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('should throw when search task creation fails', async () => {
    mockedCreateSearchTask.mockRejectedValue(new Error('Search task creation failed (code: 500)'));

    const client = new PointsYeahClient(mockPlaywright);
    await expect(runSearchWithFakeTimers(client, makeSearchParams())).rejects.toThrow(
      'Search task creation failed'
    );
  });

  it('should throw when polling returns success: false', async () => {
    mockedCreateSearchTask.mockResolvedValue(makeTask());
    mockedFetchSearchResults.mockResolvedValue({
      code: 500,
      success: false,
      data: { result: [], status: 'processing' },
    });

    const client = new PointsYeahClient(mockPlaywright);
    await expect(runSearchWithFakeTimers(client, makeSearchParams())).rejects.toThrow(
      'Search polling failed'
    );
  });

  it('should return partial results when polling times out', async () => {
    mockedCreateSearchTask.mockResolvedValue(makeTask());
    // Always return processing (never reaches done)
    mockedFetchSearchResults.mockResolvedValue(
      makeSearchResponse([makeFlightResult('United', 'SFO', 'NRT')], 'processing')
    );

    const client = new PointsYeahClient(mockPlaywright);
    const result = await runSearchWithFakeTimers(client, makeSearchParams());

    // Should return partial results even though polling didn't complete
    expect(result.results).toHaveLength(1);
    expect(result.total).toBe(1);
    // Should have polled MAX_POLLS (120) times
    expect(mockedFetchSearchResults).toHaveBeenCalledTimes(120);
  });

  it('should pass search params to createSearchTask', async () => {
    const task = makeTask();
    mockedCreateSearchTask.mockResolvedValue(task);
    mockedFetchSearchResults.mockResolvedValue(makeSearchResponse([]));

    const params = makeSearchParams({
      departure: 'LAX',
      arrival: 'LHR',
      departDate: '2026-06-15',
      tripType: '2',
      returnDate: '2026-06-22',
      cabins: ['Business', 'First'],
    });

    const client = new PointsYeahClient(mockPlaywright);
    await runSearchWithFakeTimers(client, params);

    expect(mockedCreateSearchTask).toHaveBeenCalledWith(
      params,
      'mock-access',
      'mock-id-token',
      'mock-refresh-token',
      mockPlaywright
    );
  });

  it('should pass task_id to fetchSearchResults', async () => {
    const task = makeTask('my-task-456');
    mockedCreateSearchTask.mockResolvedValue(task);
    mockedFetchSearchResults.mockResolvedValue(makeSearchResponse([]));

    const client = new PointsYeahClient(mockPlaywright);
    await runSearchWithFakeTimers(client, makeSearchParams());

    expect(mockedFetchSearchResults).toHaveBeenCalledWith('my-task-456', 'mock-id-token');
  });

  it('should handle null data envelope in poll response without crashing', async () => {
    mockedCreateSearchTask.mockResolvedValue(makeTask());

    // First poll: null data envelope (regression test)
    mockedFetchSearchResults.mockResolvedValueOnce({
      code: 0,
      success: true,
      data: null,
    } as FlightSearchResponse);
    // Second poll: normal response with done status
    mockedFetchSearchResults.mockResolvedValueOnce(
      makeSearchResponse([makeFlightResult('United', 'SFO', 'NRT')])
    );

    const client = new PointsYeahClient(mockPlaywright);
    const result = await runSearchWithFakeTimers(client, makeSearchParams());

    expect(mockedFetchSearchResults).toHaveBeenCalledTimes(2);
    expect(result.results).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('should handle null result array in poll response without crashing', async () => {
    mockedCreateSearchTask.mockResolvedValue(makeTask());

    // First poll: null result array
    mockedFetchSearchResults.mockResolvedValueOnce(makeSearchResponse(null, 'processing'));
    // Second poll: normal response
    mockedFetchSearchResults.mockResolvedValueOnce(
      makeSearchResponse([makeFlightResult('Delta', 'SFO', 'NRT')])
    );

    const client = new PointsYeahClient(mockPlaywright);
    const result = await runSearchWithFakeTimers(client, makeSearchParams());

    expect(mockedFetchSearchResults).toHaveBeenCalledTimes(2);
    expect(result.results).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('should handle all-null poll responses and return empty results', async () => {
    mockedCreateSearchTask.mockResolvedValue(makeTask());

    // All polls return null data, then done with null result
    mockedFetchSearchResults.mockResolvedValueOnce({
      code: 0,
      success: true,
      data: null,
    } as FlightSearchResponse);
    mockedFetchSearchResults.mockResolvedValueOnce({
      code: 0,
      success: true,
      data: null,
    } as FlightSearchResponse);
    mockedFetchSearchResults.mockResolvedValueOnce(makeSearchResponse(null, 'done'));

    const client = new PointsYeahClient(mockPlaywright);
    const result = await runSearchWithFakeTimers(client, makeSearchParams());

    expect(result.results).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});
