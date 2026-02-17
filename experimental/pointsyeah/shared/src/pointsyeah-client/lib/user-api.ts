import { logDebug } from '../../logging.js';
import { API2_BASE, FETCH_TIMEOUT_MS } from '../../constants.js';

/**
 * Make an authenticated GET request to the PointsYeah API.
 */
async function apiGet(path: string, idToken: string): Promise<unknown> {
  logDebug('userApi', `GET ${path}`);

  const response = await fetch(`${API2_BASE}${path}`, {
    method: 'GET',
    headers: {
      // PointsYeah API expects the raw Cognito ID token without a Bearer prefix
      Authorization: idToken,
      'Content-Type': 'application/json',
      Origin: 'https://www.pointsyeah.com',
      Referer: 'https://www.pointsyeah.com/',
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get the user's search history.
 */
export async function getSearchHistory(idToken: string): Promise<unknown> {
  return apiGet('/flight/history', idToken);
}
