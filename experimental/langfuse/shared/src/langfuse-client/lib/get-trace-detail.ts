import type { TraceDetail } from '../../types.js';

export async function getTraceDetail(
  baseUrl: string,
  authHeader: string,
  traceId: string
): Promise<TraceDetail> {
  const url = `${baseUrl}/api/public/traces/${encodeURIComponent(traceId)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Langfuse API error (${response.status}): ${body}`);
  }

  return response.json() as Promise<TraceDetail>;
}
