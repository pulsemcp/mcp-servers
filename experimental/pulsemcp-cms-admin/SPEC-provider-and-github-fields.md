# Spec: Add Provider and GitHub Fields to save_mcp_implementation Tool

## Summary

The `save_mcp_implementation` MCP tool is missing several fields required to successfully publish MCP implementations to "live" status. This causes validation failures when the agent flow attempts to post approved entries.

**Error observed:**

```
Error saving MCP implementation: Validation failed: Provider can't be blank
```

## Background

### System Architecture

The publishing flow involves three layers:

1. **Agent Setup** (pulsemcp-server-queue) - Prepares structured data with nested objects for provider, source code location, etc.
2. **MCP Server** (pulsemcp-cms-admin) - Exposes `save_mcp_implementation` tool that calls the REST API
3. **REST API** (pulsemcp/web-app) - Rails backend with `McpImplementationUpdateService`

### Current Data Flow

The **preparer agent** outputs structured data like:

```json
{
  "mcp_implementation": {
    "id": 11460,
    "name": "Blueprint",
    "slug": "arcadeai-blueprint",
    "status": "draft"
  },
  "provider": {
    "name": "ArcadeAI",
    "url": "https://arcade.dev",
    "slug": "arcadeai"
  },
  "source_code_location": {
    "github_owner": "ArcadeAI",
    "github_repo": "blueprint-mcp",
    "github_subfolder": null
  }
}
```

The **poster agent** flattens this and calls `save_mcp_implementation` with:

```json
{
  "id": 11460,
  "name": "Blueprint",
  "slug": "arcadeai-blueprint",
  "status": "live",
  "provider_name": "ArcadeAI"
}
```

### Root Cause

The REST API's `McpImplementationUpdateService.handle_provider` method requires specific parameters to create or link providers:

```ruby
def handle_provider(params)
  if params[:provider_id] == "new"
    # Creates new provider using provider_name, provider_slug, provider_url
    slug = params[:provider_slug].presence || params[:provider_name]&.parameterize
    existing_provider = Provider.find_by(url: params[:provider_url]) if params[:provider_url].present?
    existing_provider ||= Provider.find_by(slug: slug) if slug.present?

    existing_provider || Provider.create!(
      name: params[:provider_name],
      slug: params[:provider_slug],
      url: params[:provider_url]
    )
  elsif params[:provider_id].present?
    # Links to existing provider by ID
    Provider.find(params[:provider_id])
  end
  # Returns nil if neither condition is met!
end
```

**The problem:** The MCP server only sends `provider_name`. Without `provider_id: "new"`, the service returns `nil` for the provider. The model validation then fails:

```ruby
validates :provider, presence: true, if: -> { status == "live" }
```

Similarly, GitHub repository fields (`github_owner`, `github_repo`, `github_subfolder`) are accepted by the API but not exposed by the MCP tool, preventing proper source code location linking.

---

## Required Changes

### 1. Update Type Definitions

**File:** `shared/src/types.ts`

Add the missing fields to `SaveMCPImplementationParams`:

```typescript
export interface SaveMCPImplementationParams {
  // Existing fields
  name?: string;
  short_description?: string;
  description?: string;
  type?: 'server' | 'client';
  status?: 'draft' | 'live' | 'archived';
  slug?: string;
  url?: string;
  provider_name?: string;
  github_stars?: number;
  classification?: 'official' | 'community' | 'reference';
  implementation_language?: string;
  mcp_server_id?: number | null;
  mcp_client_id?: number | null;

  // NEW: Provider creation/linking fields
  provider_id?: string | number; // "new" to create, or numeric ID to link existing
  provider_slug?: string; // Optional slug (auto-generated from name if omitted)
  provider_url?: string; // Optional provider website URL

  // NEW: GitHub repository fields
  github_owner?: string; // GitHub organization or username
  github_repo?: string; // Repository name
  github_subfolder?: string; // Optional subfolder within repo (for monorepos)

  // NEW: Other missing fields the API supports
  internal_notes?: string; // Admin-only notes
  marketing_url?: string; // Alternative to 'url' field (explicit naming)
}
```

### 2. Update API Client

**File:** `shared/src/pulsemcp-admin-client/lib/save-mcp-implementation.ts`

Add the new fields to the form data construction:

```typescript
// After existing provider_name handling (around line 38):

// Provider creation/linking
if (params.provider_id !== undefined) {
  formData.append('mcp_implementation[provider_id]', params.provider_id.toString());
}
if (params.provider_slug !== undefined) {
  formData.append('mcp_implementation[provider_slug]', params.provider_slug);
}
if (params.provider_url !== undefined) {
  formData.append('mcp_implementation[provider_url]', params.provider_url);
}

// GitHub repository fields
if (params.github_owner !== undefined) {
  formData.append('mcp_implementation[github_owner]', params.github_owner);
}
if (params.github_repo !== undefined) {
  formData.append('mcp_implementation[github_repo]', params.github_repo);
}
if (params.github_subfolder !== undefined) {
  formData.append('mcp_implementation[github_subfolder]', params.github_subfolder);
}

// Internal notes
if (params.internal_notes !== undefined) {
  formData.append('mcp_implementation[internal_notes]', params.internal_notes);
}
```

### 3. Update Tool Definition

**File:** `shared/src/tools/save-mcp-implementation.ts`

Add the new parameters to the tool's input schema:

```typescript
// In the inputSchema.properties section, add:

provider_id: {
  type: 'string',
  description: 'Provider ID: use "new" to create a new provider, or a numeric ID to link an existing one. Required when setting status to "live".'
},
provider_slug: {
  type: 'string',
  description: 'URL-friendly provider identifier. Auto-generated from provider_name if omitted. For individuals, prefix with "gh-" (e.g., "gh-username").'
},
provider_url: {
  type: 'string',
  description: 'Provider website URL. For companies, use official website. For individuals, use GitHub profile URL.'
},
github_owner: {
  type: 'string',
  description: 'GitHub organization or username that owns the repository.'
},
github_repo: {
  type: 'string',
  description: 'GitHub repository name (without owner prefix).'
},
github_subfolder: {
  type: 'string',
  description: 'Subfolder path within the repository, for monorepos. Omit for root-level projects.'
},
internal_notes: {
  type: 'string',
  description: 'Admin-only notes. Not displayed publicly. Used for tracking submission sources, reviewer comments, etc.'
},
```

Also update the handler function to pass these new parameters to the client.

---

## Usage Examples

### Creating a New Provider (Most Common Case)

When publishing a community MCP server with a new provider:

```json
{
  "id": 11460,
  "name": "Blueprint",
  "slug": "arcadeai-blueprint",
  "type": "server",
  "status": "live",
  "short_description": "Generates technical diagrams from text descriptions",
  "description": "Blueprint is a diagram generation MCP server...",
  "provider_id": "new",
  "provider_name": "ArcadeAI",
  "provider_slug": "arcadeai",
  "provider_url": "https://arcade.dev",
  "github_owner": "ArcadeAI",
  "github_repo": "blueprint-mcp",
  "classification": "community",
  "implementation_language": "python"
}
```

### Individual Developer (GitHub User)

For community servers by individual developers:

```json
{
  "id": 11495,
  "name": "NetBrain",
  "slug": "ikoreyoshii-netbrain",
  "type": "server",
  "status": "live",
  "provider_id": "new",
  "provider_name": "Koreyoshi",
  "provider_slug": "gh-IKoreyoshiI",
  "provider_url": "https://github.com/IKoreyoshiI",
  "github_owner": "IKoreyoshiI",
  "github_repo": "NetBrain_MCP",
  "classification": "community",
  "implementation_language": "python"
}
```

### Linking to Existing Provider

When the provider already exists in the database:

```json
{
  "id": 12345,
  "name": "New Cloudflare Server",
  "slug": "cloudflare-new-server",
  "type": "server",
  "status": "live",
  "provider_id": 42,
  "github_owner": "cloudflare",
  "github_repo": "new-mcp-server",
  "classification": "official",
  "implementation_language": "typescript"
}
```

---

## Field Reference

### Provider Fields

| Field           | Type               | Required                   | Description                                                                                   |
| --------------- | ------------------ | -------------------------- | --------------------------------------------------------------------------------------------- |
| `provider_id`   | `string \| number` | Yes for "live"             | `"new"` to create provider, or numeric ID to link existing                                    |
| `provider_name` | `string`           | Yes if `provider_id="new"` | Human-readable provider name                                                                  |
| `provider_slug` | `string`           | No                         | URL-safe identifier. Auto-generated from name if omitted. Use `gh-{username}` for individuals |
| `provider_url`  | `string`           | No                         | Provider website. Helps deduplicate providers                                                 |

### GitHub Fields

| Field              | Type     | Required | Description                        |
| ------------------ | -------- | -------- | ---------------------------------- |
| `github_owner`     | `string` | No       | Repository owner (org or username) |
| `github_repo`      | `string` | No       | Repository name                    |
| `github_subfolder` | `string` | No       | Path within repo for monorepos     |

### Provider Deduplication Logic

The REST API automatically deduplicates providers when `provider_id="new"`:

1. First checks for existing provider with matching `provider_url`
2. Then checks for existing provider with matching `slug`
3. Only creates new provider if no match found

This means it's safe to always pass `provider_id="new"` with full provider details - the API won't create duplicates.

---

## Testing Checklist

After implementing these changes:

- [ ] Verify creating implementation with `provider_id: "new"` creates provider
- [ ] Verify existing provider is reused when URL matches
- [ ] Verify existing provider is reused when slug matches
- [ ] Verify `provider_id: 123` links to existing provider
- [ ] Verify GitHub fields create/link source code location
- [ ] Verify subfolder field works for monorepo cases
- [ ] Verify status can be set to "live" when provider fields are complete
- [ ] Verify validation error is returned when status="live" without provider

---

## Agent Setup Updates Required

After the MCP server changes are deployed, the **poster agent** instructions need updating to pass the new fields. The poster skill at:

```
agent-setups/pulsemcp-server-queue/01_poster/.claude/skills/save-mcp-implementations/SKILL.md
```

Should be updated to map:

- `provider.name` → `provider_name`
- `provider.slug` → `provider_slug`
- `provider.url` → `provider_url`
- **NEW:** Always include `provider_id: "new"` when provider data exists
- `source_code_location.github_owner` → `github_owner`
- `source_code_location.github_repo` → `github_repo`
- `source_code_location.github_subfolder` → `github_subfolder`

---

## Related Files

### MCP Server (this repo)

- `shared/src/types.ts` - Type definitions
- `shared/src/pulsemcp-admin-client/lib/save-mcp-implementation.ts` - API client
- `shared/src/tools/save-mcp-implementation.ts` - Tool definition

### REST API (pulsemcp/web-app)

- `app/controllers/admin/api/implementations_controller.rb` - API endpoint (lines 302-359 for `build_update_params`)
- `app/services/mcp_implementation_update_service.rb` - Business logic (lines 154-169 for `handle_provider`)
- `app/models/mcp_implementation.rb` - Model with provider validation

### Agent Setup

- `agent-setups/pulsemcp-server-queue/01_poster/.claude/skills/save-mcp-implementations/SKILL.md` - Poster instructions
- `agent-setups/pulsemcp-server-queue/00_preparer/.claude/skills/process-draft-mcp-implementation/templates/entry.json` - Data template
