import type { TracesListResponse } from '../../types.js';
import type { GetTracesParams } from '../langfuse-client.js';

export async function getTraces(
  baseUrl: string,
  authHeader: string,
  params?: GetTracesParams
): Promise<TracesListResponse> {
  const url = new URL(`${baseUrl}/api/public/traces`);

  if (params) {
    if (params.page !== undefined) url.searchParams.set('page', String(params.page));
    if (params.limit !== undefined) url.searchParams.set('limit', String(params.limit));
    if (params.userId) url.searchParams.set('userId', params.userId);
    if (params.name) url.searchParams.set('name', params.name);
    if (params.sessionId) url.searchParams.set('sessionId', params.sessionId);
    if (params.fromTimestamp) url.searchParams.set('fromTimestamp', params.fromTimestamp);
    if (params.toTimestamp) url.searchParams.set('toTimestamp', params.toTimestamp);
    if (params.orderBy) url.searchParams.set('orderBy', params.orderBy);
    if (params.version) url.searchParams.set('version', params.version);
    if (params.release) url.searchParams.set('release', params.release);
    if (params.tags) {
      for (const tag of params.tags) {
        url.searchParams.append('tags', tag);
      }
    }
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

  return response.json() as Promise<TracesListResponse>;
}
