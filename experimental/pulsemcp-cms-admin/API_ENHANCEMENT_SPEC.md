# API Enhancement Spec: Expand `format_implementation` Response

## Context

The MCP server tool `get_draft_mcp_implementations` needs richer data per implementation to provide full context for review. The current `format_implementation` method in `admin/api/implementations_controller.rb` returns a subset of available data.

## Current Response (for reference)

```ruby
{
  id, name, short_description, description, type, status, slug,
  url: marketing_url,
  provider_name, provider_id,
  github_stars, github_owner, github_repo, github_subfolder,
  classification, implementation_language,
  mcp_server_id, mcp_client_id,
  internal_notes,
  created_at, updated_at
}
```

## Requested Additions

### 1. Provider Full Details

Currently only returns `provider_name` and `provider_id`. Add:

```ruby
provider_url: impl.provider&.url,
provider_slug: impl.provider&.slug,
```

### 2. GitHub Repository Extended Info

Currently returns owner/repo/subfolder/stars. Add:

```ruby
github_repository_created_date: impl.github_repository&.repository_created_date,
github_repository_status: impl.github_repository&.repository_status,
github_last_updated: impl.github_repository&.last_updated,
```

### 3. MCP Server Inline Details (when `mcp_server_id` present)

Instead of just returning `mcp_server_id`, embed the full server object:

```ruby
mcp_server: impl.mcp_server ? {
  id: impl.mcp_server.id,
  name: impl.mcp_server.name,
  slug: impl.mcp_server.slug,
  description: impl.mcp_server.description,
  classification: impl.mcp_server.classification,
  implementation_language: impl.mcp_server.implementation_language,

  # Downloads & metrics
  downloads_estimate_total: impl.mcp_server.downloads_estimate_total,
  downloads_estimate_most_recent_week: impl.mcp_server.downloads_estimate_most_recent_week,
  downloads_estimate_last_four_weeks: impl.mcp_server.downloads_estimate_last_four_weeks,
  visitors_estimate_total: impl.mcp_server.visitors_estimate_total,

  # Registry info
  registry_package_id: impl.mcp_server.registry_package_id,
  registry_package_soft_verified: impl.mcp_server.registry_package_soft_verified,

  # Tags (array of tag objects)
  tags: impl.mcp_server.tags.map { |t| { id: t.id, name: t.name, slug: t.slug } },

  # Remotes (array of remote endpoint objects)
  remotes: impl.mcp_server.mcp_server_remotes.map { |r| {
    id: r.id,
    display_name: r.display_name,
    url: r.url,
    transport: r.transport,           # e.g., "sse", "streamable_http"
    host_platform: r.host_platform,   # e.g., "smithery", "provider", "other"
    host_infra: r.host_infra,         # e.g., "cloudflare", "vercel", "fly_io"
    authentication: r.authentication, # e.g., "open", "oauth", "api_key"
    cost: r.cost,                     # e.g., "free", "free_tier", "paid"
    internal_notes: r.internal_notes
  } },

  # Counts
  mcp_server_remotes_count: impl.mcp_server.mcp_server_remotes_count
} : nil,
```

### 4. MCP Client Inline Details (when `mcp_client_id` present)

Similar pattern for clients:

```ruby
mcp_client: impl.mcp_client ? {
  id: impl.mcp_client.id,
  name: impl.mcp_client.name,
  slug: impl.mcp_client.slug,
  description: impl.mcp_client.description,
  featured: impl.mcp_client.featured,
  logo_url: impl.mcp_client.logo_url
} : nil,
```

## Eager Loading Update

The `includes` clause already has most associations, but ensure remotes and tags are included:

```ruby
scope = McpImplementation
  .includes(
    :source_code_location,
    :github_repository,
    :provider,
    mcp_client: [],
    mcp_server: [:tags, :mcp_server_remotes]
  )
```

## Impact

This eliminates the need for the MCP server to make separate API calls for each `mcp_server_id` and `mcp_client_id`, reducing N+1 queries and providing complete context in a single response.

## Priority

High - the current workaround of fetching servers/clients individually is inefficient and still doesn't provide tags/remotes data.
