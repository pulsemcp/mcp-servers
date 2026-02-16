import type {
  FlightSearchParams,
  ExplorerSearchResponse,
  ExplorerDetailResponse,
} from '../../types.js';
import { logDebug } from '../../logging.js';
import { API_BASE, FETCH_TIMEOUT_MS } from '../../constants.js';

/**
 * Search for award flights using the PointsYeah explorer API.
 */
export async function explorerSearch(
  params: FlightSearchParams,
  idToken: string | null
): Promise<ExplorerSearchResponse> {
  logDebug(
    'explorerSearch',
    `Searching: ${params.departure} -> ${params.arrival} on ${params.departDate}`
  );

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Origin: 'https://www.pointsyeah.com',
    Referer: 'https://www.pointsyeah.com/',
  };

  if (idToken) {
    headers.authorization = idToken;
  }

  const body = {
    depart_airports: [params.departure],
    arrive_airports: [params.arrival],
    depart_date: params.departDate,
    trip_type: params.tripType === '1' ? 1 : 2,
    adults: params.adults,
    children: params.children,
    cabins: params.cabins,
    ...(params.returnDate ? { return_date: params.returnDate } : {}),
  };

  const response = await fetch(`${API_BASE}/explorer/search`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Explorer search failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as ExplorerSearchResponse;
}

/**
 * Fetch detailed flight information from a CloudFront detail URL.
 * The detail URL contains full route/segment/transfer information.
 */
export async function fetchFlightDetail(detailUrl: string): Promise<ExplorerDetailResponse> {
  logDebug('explorerSearch', `Fetching detail: ${detailUrl}`);

  const response = await fetch(detailUrl, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch flight detail: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as ExplorerDetailResponse;
}
