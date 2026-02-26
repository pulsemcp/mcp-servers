import type {
  MarkDiscoveredUrlProcessedParams,
  MarkDiscoveredUrlProcessedResponse,
} from '../../types.js';

export async function markDiscoveredUrlProcessed(
  apiKey: string,
  baseUrl: string,
  params: MarkDiscoveredUrlProcessedParams
): Promise<MarkDiscoveredUrlProcessedResponse> {
  const url = new URL(`/admin/api/discovered_urls/${params.id}/mark_processed`, baseUrl);

  const body: Record<string, unknown> = {
    result: params.result,
  };
  if (params.notes !== undefined) {
    body.notes = params.notes;
  }
  if (params.mcp_implementation_id !== undefined) {
    body.mcp_implementation_id = params.mcp_implementation_id;
  }

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API key');
    }
    if (response.status === 403) {
      throw new Error('User lacks write privileges');
    }
    if (response.status === 404) {
      throw new Error(`Discovered URL with ID ${params.id} not found`);
    }
    if (response.status === 422) {
      const errorData = (await response.json()) as { errors?: string[]; error?: string };
      const errors =
        errorData.errors && errorData.errors.length > 0
          ? errorData.errors
          : errorData.error
            ? [errorData.error]
            : ['Unknown validation error'];
      throw new Error(`Validation error: ${errors.join(', ')}`);
    }
    throw new Error(
      `Failed to mark discovered URL as processed: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as MarkDiscoveredUrlProcessedResponse;
  return data;
}
