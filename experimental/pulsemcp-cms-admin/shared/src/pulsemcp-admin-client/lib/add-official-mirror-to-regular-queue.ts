import type { OfficialMirrorQueueActionResponse, OfficialMirrorQueueItem } from '../../types.js';

interface RailsActionResponse {
  success: boolean;
  message: string;
  queue_item: {
    id: number;
    name: string;
    status: string;
    mirrors_count: number;
    linked_server_slug?: string | null;
    linked_server_id?: number | null;
    latest_mirror?: {
      id: number;
      name: string;
      version: string;
      description?: string;
      github_url?: string;
      website_url?: string;
      published_at?: string;
    } | null;
    created_at?: string;
    updated_at?: string;
  };
}

function mapQueueItem(item: RailsActionResponse['queue_item']): OfficialMirrorQueueItem {
  return {
    id: item.id,
    name: item.name,
    status: item.status as OfficialMirrorQueueItem['status'],
    mirrors_count: item.mirrors_count,
    linked_server_slug: item.linked_server_slug,
    linked_server_id: item.linked_server_id,
    latest_mirror: item.latest_mirror
      ? {
          id: item.latest_mirror.id,
          name: item.latest_mirror.name,
          version: item.latest_mirror.version,
          description: item.latest_mirror.description,
          github_url: item.latest_mirror.github_url,
          website_url: item.latest_mirror.website_url,
          published_at: item.latest_mirror.published_at,
        }
      : null,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
}

export async function addOfficialMirrorToRegularQueue(
  apiKey: string,
  baseUrl: string,
  id: number
): Promise<OfficialMirrorQueueActionResponse> {
  const url = new URL(`/api/official_mirror_queues/${id}/add_to_regular_queue`, baseUrl);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API key');
    }
    if (response.status === 403) {
      throw new Error('User lacks admin privileges');
    }
    if (response.status === 400) {
      throw new Error('Invalid queue entry ID');
    }
    if (response.status === 404) {
      throw new Error(`Queue entry not found: ${id}`);
    }
    if (response.status === 422) {
      const errorData = (await response.json()) as { error?: string };
      throw new Error(errorData.error || 'Validation failed');
    }
    throw new Error(
      `Failed to add official mirror to regular queue: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as RailsActionResponse;

  return {
    success: data.success,
    message: data.message,
    queue_item: mapQueueItem(data.queue_item),
  };
}
