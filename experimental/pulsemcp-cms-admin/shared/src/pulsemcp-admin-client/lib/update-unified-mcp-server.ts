import type {
  UnifiedMCPServer,
  UpdateUnifiedMCPServerParams,
  SaveMCPImplementationParams,
} from '../../types.js';
import { mapToUnifiedServer, type RailsImplementation } from './unified-mcp-server-mapper.js';

/**
 * Update a unified MCP server by its implementation ID.
 * This abstracts the complexity of updating the MCPImplementation and MCPServer relationship.
 */
export async function updateUnifiedMCPServer(
  apiKey: string,
  baseUrl: string,
  implementationId: number,
  params: UpdateUnifiedMCPServerParams
): Promise<UnifiedMCPServer> {
  // Transform unified params to implementation params
  const implParams: SaveMCPImplementationParams = {};

  // Basic info
  if (params.name !== undefined) implParams.name = params.name;
  if (params.short_description !== undefined)
    implParams.short_description = params.short_description;
  if (params.description !== undefined) implParams.description = params.description;
  if (params.status !== undefined) implParams.status = params.status;
  if (params.classification !== undefined) implParams.classification = params.classification;
  if (params.implementation_language !== undefined)
    implParams.implementation_language = params.implementation_language;
  if (params.url !== undefined) implParams.url = params.url;
  if (params.internal_notes !== undefined) implParams.internal_notes = params.internal_notes;

  // Provider handling
  if (params.provider_id !== undefined) implParams.provider_id = params.provider_id;
  if (params.provider_name !== undefined) implParams.provider_name = params.provider_name;
  if (params.provider_slug !== undefined) implParams.provider_slug = params.provider_slug;
  if (params.provider_url !== undefined) implParams.provider_url = params.provider_url;

  // Source code location
  if (params.source_code) {
    if (params.source_code.github_owner !== undefined)
      implParams.github_owner = params.source_code.github_owner;
    if (params.source_code.github_repo !== undefined)
      implParams.github_repo = params.source_code.github_repo;
    if (params.source_code.github_subfolder !== undefined)
      implParams.github_subfolder = params.source_code.github_subfolder;
  }

  // Canonical URLs
  if (params.canonical_urls !== undefined) {
    implParams.canonical = params.canonical_urls;
  }

  // Remote endpoints
  if (params.remotes !== undefined) {
    implParams.remote = params.remotes.map((r) => ({
      id: r.id,
      display_name: r.display_name,
      url_direct: r.url_direct,
      url_setup: r.url_setup,
      transport: r.transport,
      host_platform: r.host_platform,
      host_infrastructure: r.host_infrastructure,
      authentication_method: r.authentication_method,
      cost: r.cost,
      status: r.status,
      internal_notes: r.internal_notes,
    }));
  }

  // Use the existing save-mcp-implementation endpoint
  const { saveMCPImplementation } = await import('./save-mcp-implementation.js');
  const result = await saveMCPImplementation(apiKey, baseUrl, implementationId, implParams);

  // Map the result back to a unified server
  const unified = mapToUnifiedServer(result as unknown as RailsImplementation);
  if (!unified) {
    // If the result doesn't have mcp_server, the implementation isn't linked to an MCPServer.
    // This is unexpected for the mcp_servers tool group - throw an error to surface the issue.
    throw new Error(
      `Implementation ${result.id} (${result.name}) is not linked to an MCPServer. ` +
        `Use the implementations tools instead to manage this record.`
    );
  }

  return unified;
}
