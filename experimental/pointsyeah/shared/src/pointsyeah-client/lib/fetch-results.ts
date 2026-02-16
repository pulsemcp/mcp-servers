import type { FlightSearchResponse } from '../../types.js';
import { logDebug } from '../../logging.js';

const API2_BASE = 'https://api2.pointsyeah.com';

/**
 * Poll for flight search results using a task ID.
 * This is a plain HTTP call - no Playwright needed.
 */
export async function fetchSearchResults(
  taskId: string,
  idToken: string
): Promise<FlightSearchResponse> {
  logDebug('fetchResults', `Polling results for task ${taskId}`);

  const response = await fetch(`${API2_BASE}/flight/search/fetch_result`, {
    method: 'POST',
    headers: {
      Authorization: idToken,
      'Content-Type': 'application/json',
      Origin: 'https://www.pointsyeah.com',
      Referer: 'https://www.pointsyeah.com/',
    },
    body: JSON.stringify({ task_id: taskId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch search results: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as FlightSearchResponse;
}
