import { logDebug } from '../../logging.js';

const API_BASE = 'https://api.pointsyeah.com/v2/live';

/**
 * Make an authenticated GET request to the PointsYeah API.
 */
async function apiGet(path: string, idToken: string): Promise<unknown> {
  logDebug('userApi', `GET ${path}`);

  const response = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers: {
      Authorization: idToken,
      'Content-Type': 'application/json',
      Origin: 'https://www.pointsyeah.com',
      Referer: 'https://www.pointsyeah.com/',
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Make an authenticated POST request to the PointsYeah API.
 */
async function apiPost(path: string, idToken: string, body: unknown = {}): Promise<unknown> {
  logDebug('userApi', `POST ${path}`);

  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: idToken,
      'Content-Type': 'application/json',
      Origin: 'https://www.pointsyeah.com',
      Referer: 'https://www.pointsyeah.com/',
    },
    body: JSON.stringify(body),
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

/**
 * Get user membership information.
 */
export async function getUserMembership(idToken: string): Promise<unknown> {
  return apiGet('/user/membership', idToken);
}

/**
 * Get user preferences.
 */
export async function getUserPreferences(idToken: string): Promise<unknown> {
  return apiGet('/user/get_preferences', idToken);
}

/**
 * Get flight deal recommendations.
 */
export async function getFlightRecommendations(
  idToken: string,
  body: unknown = {}
): Promise<unknown> {
  return apiPost('/explorer/recommend', idToken, body);
}

/**
 * Get hotel deal recommendations.
 */
export async function getHotelRecommendations(
  idToken: string,
  body: unknown = {}
): Promise<unknown> {
  return apiPost('/hotel/explorer/recommend', idToken, body);
}

/**
 * Get the explorer listing count.
 */
export async function getExplorerCount(idToken: string): Promise<unknown> {
  return apiGet('/explorer/count', idToken);
}
