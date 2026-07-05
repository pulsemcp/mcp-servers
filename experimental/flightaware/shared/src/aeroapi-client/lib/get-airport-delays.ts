import { aeroApiRequest } from '../request.js';
import type { AirportDelaysResult } from '../../types.js';

export interface GetAirportDelaysOptions {
  id: string;
}

/**
 * GET /airports/{id}/delays — current delay information for an airport,
 * broken down by reason category.
 */
export async function getAirportDelays(
  apiKey: string,
  options: GetAirportDelaysOptions
): Promise<AirportDelaysResult> {
  return aeroApiRequest<AirportDelaysResult>(
    apiKey,
    `/airports/${encodeURIComponent(options.id)}/delays`
  );
}
