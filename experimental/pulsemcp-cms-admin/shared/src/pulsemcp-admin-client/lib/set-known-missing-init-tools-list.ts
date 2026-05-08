import type { SetKnownMissingInitToolsListResponse } from '../../types.js';
import { adminFetch } from './admin-fetch.js';

export async function setKnownMissingInitToolsList(
  apiKey: string,
  baseUrl: string,
  id: number,
  knownMissingInitToolsList: boolean,
  knownMissingInitToolsListFilterTo?: string | null
): Promise<SetKnownMissingInitToolsListResponse> {
  const url = new URL(`/api/mcp_servers/${id}/known_missing_init_tools_list`, baseUrl);

  const body: Record<string, unknown> = {
    known_missing_init_tools_list: knownMissingInitToolsList,
  };
  if (knownMissingInitToolsListFilterTo !== undefined) {
    // null is sent as JSON null; the Rails controller treats nil/blank as "clear".
    body.known_missing_init_tools_list_filter_to = knownMissingInitToolsListFilterTo;
  }

  const response = await adminFetch(url.toString(), {
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
      throw new Error(`MCP server not found: ${id}`);
    }
    if (response.status === 400) {
      const errBody = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(errBody.error ?? 'Bad request');
    }
    if (response.status === 422) {
      const errBody = (await response.json().catch(() => ({}))) as {
        error?: string;
        details?: string[];
      };
      const detailStr = errBody.details?.length ? ` (${errBody.details.join(', ')})` : '';
      throw new Error(`${errBody.error ?? 'Validation failed'}${detailStr}`);
    }
    throw new Error(
      `Failed to set known_missing_init_tools_list: ${response.status} ${response.statusText}`
    );
  }

  return (await response.json()) as SetKnownMissingInitToolsListResponse;
}
