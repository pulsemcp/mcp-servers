import type { ObservationsListResponse } from '../../types.js';
import type { GetObservationsParams } from '../langfuse-client.js';

export async function getObservations(
  baseUrl: string,
  authHeader: string,
  params?: GetObservationsParams
): Promise<ObservationsListResponse> {
  const url = new URL(`${baseUrl}/api/public/observations`);

  if (params) {
    if (params.page !== undefined) url.searchParams.set('page', String(params.page));
    if (params.limit !== undefined) url.searchParams.set('limit', String(params.limit));
    if (params.name) url.searchParams.set('name', params.name);
    if (params.userId) url.searchParams.set('userId', params.userId);
    if (params.type) url.searchParams.set('type', params.type);
    if (params.traceId) url.searchParams.set('traceId', params.traceId);
    if (params.level) url.searchParams.set('level', params.level);
    if (params.parentObservationId)
      url.searchParams.set('parentObservationId', params.parentObservationId);
    if (params.fromStartTime) url.searchParams.set('fromStartTime', params.fromStartTime);
    if (params.toStartTime) url.searchParams.set('toStartTime', params.toStartTime);
    if (params.version) url.searchParams.set('version', params.version);
    if (params.environment) {
      for (const env of params.environment) {
        url.searchParams.append('environment', env);
      }
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Langfuse API error (${response.status}): ${body}`);
  }

  return response.json() as Promise<ObservationsListResponse>;
}
