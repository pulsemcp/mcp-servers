import type {
  OfficialMirrorQueueStatus,
  OfficialMirrorQueueItemDetail,
  OfficialMirror,
  LinkedServer,
} from '../../types.js';

interface RailsMirror {
  id: number;
  name: string;
  version: string;
  official_version_id: string;
  description?: string;
  github_url?: string;
  website_url?: string;
  categories?: string[];
  license?: string;
  remotes?: unknown[];
  packages?: unknown[];
  published_at?: string;
  schema_version?: string;
  datetime_ingested?: string;
  created_at?: string;
  updated_at?: string;
}

interface RailsLinkedServer {
  id: number;
  slug: string;
  classification?: string;
  implementation_language?: string;
  provider_name?: string;
  provider_slug?: string;
  implementation_name?: string;
  implementation_status?: string;
}

interface RailsQueueItemDetail {
  id: number;
  name: string;
  status: OfficialMirrorQueueStatus;
  mirrors_count: number;
  linked_server?: RailsLinkedServer | null;
  server_linkage_consistent: boolean;
  mirrors: RailsMirror[];
  created_at?: string;
  updated_at?: string;
}

function mapMirror(mirror: RailsMirror): OfficialMirror {
  return {
    id: mirror.id,
    name: mirror.name,
    version: mirror.version,
    official_version_id: mirror.official_version_id,
    description: mirror.description,
    github_url: mirror.github_url,
    website_url: mirror.website_url,
    categories: mirror.categories,
    license: mirror.license,
    remotes: mirror.remotes,
    packages: mirror.packages,
    published_at: mirror.published_at,
    schema_version: mirror.schema_version,
    datetime_ingested: mirror.datetime_ingested,
    created_at: mirror.created_at,
    updated_at: mirror.updated_at,
  };
}

function mapLinkedServer(server?: RailsLinkedServer | null): LinkedServer | null {
  if (!server) return null;
  return {
    id: server.id,
    slug: server.slug,
    classification: server.classification,
    implementation_language: server.implementation_language,
    provider_name: server.provider_name,
    provider_slug: server.provider_slug,
    implementation_name: server.implementation_name,
    implementation_status: server.implementation_status,
  };
}

export async function getOfficialMirrorQueueItem(
  apiKey: string,
  baseUrl: string,
  id: number
): Promise<OfficialMirrorQueueItemDetail> {
  const url = new URL(`/api/official_mirror_queues/${id}`, baseUrl);

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
    if (response.status === 400) {
      throw new Error('Invalid queue entry ID');
    }
    if (response.status === 404) {
      throw new Error(`Queue entry not found: ${id}`);
    }
    throw new Error(
      `Failed to fetch official mirror queue item: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as RailsQueueItemDetail;

  return {
    id: data.id,
    name: data.name,
    status: data.status,
    mirrors_count: data.mirrors_count,
    linked_server: mapLinkedServer(data.linked_server),
    server_linkage_consistent: data.server_linkage_consistent,
    mirrors: data.mirrors.map(mapMirror),
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}
