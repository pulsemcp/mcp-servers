import type {
  OfficialMirrorQueueStatus,
  OfficialMirrorQueueResponse,
  OfficialMirrorQueueItem,
  OfficialMirrorSummary,
} from '../../types.js';

interface RailsMirrorSummary {
  id: number;
  name: string;
  version: string;
  description?: string;
  github_url?: string;
  website_url?: string;
  published_at?: string;
}

interface RailsQueueItem {
  id: number;
  name: string;
  status: OfficialMirrorQueueStatus;
  mirrors_count: number;
  linked_server_slug?: string | null;
  linked_server_id?: number | null;
  latest_mirror?: RailsMirrorSummary | null;
  created_at?: string;
  updated_at?: string;
}

interface RailsQueueResponse {
  data: RailsQueueItem[];
  meta: {
    current_page: number;
    total_pages: number;
    total_count: number;
    has_next: boolean;
    limit: number;
  };
}

function mapMirrorSummary(mirror?: RailsMirrorSummary | null): OfficialMirrorSummary | null {
  if (!mirror) return null;
  return {
    id: mirror.id,
    name: mirror.name,
    version: mirror.version,
    description: mirror.description,
    github_url: mirror.github_url,
    website_url: mirror.website_url,
    published_at: mirror.published_at,
  };
}

function mapQueueItem(item: RailsQueueItem): OfficialMirrorQueueItem {
  return {
    id: item.id,
    name: item.name,
    status: item.status,
    mirrors_count: item.mirrors_count,
    linked_server_slug: item.linked_server_slug,
    linked_server_id: item.linked_server_id,
    latest_mirror: mapMirrorSummary(item.latest_mirror),
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
}

export async function getOfficialMirrorQueueItems(
  apiKey: string,
  baseUrl: string,
  params?: {
    status?: OfficialMirrorQueueStatus;
    q?: string;
    limit?: number;
    offset?: number;
  }
): Promise<OfficialMirrorQueueResponse> {
  const url = new URL('/api/official_mirror_queues', baseUrl);

  // Add query parameters if provided
  if (params?.status) {
    url.searchParams.append('status', params.status);
  }
  if (params?.q) {
    url.searchParams.append('q', params.q);
  }
  if (params?.limit) {
    url.searchParams.append('limit', params.limit.toString());
  }
  if (params?.offset) {
    url.searchParams.append('offset', params.offset.toString());
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
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
    if (response.status === 422) {
      const errorData = (await response.json()) as { error?: string };
      throw new Error(errorData.error || 'Validation failed');
    }
    throw new Error(
      `Failed to fetch official mirror queue items: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as RailsQueueResponse;

  return {
    items: data.data.map(mapQueueItem),
    pagination: {
      current_page: data.meta.current_page,
      total_pages: data.meta.total_pages,
      total_count: data.meta.total_count,
      has_next: data.meta.has_next,
      limit: data.meta.limit,
    },
  };
}
