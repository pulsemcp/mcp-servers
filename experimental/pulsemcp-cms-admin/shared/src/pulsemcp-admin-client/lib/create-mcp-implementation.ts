import type { MCPImplementation, CreateMCPImplementationParams } from '../../types.js';

export async function createMCPImplementation(
  apiKey: string,
  baseUrl: string,
  params: CreateMCPImplementationParams
): Promise<MCPImplementation> {
  const url = new URL(`/api/implementations`, baseUrl);

  // Build form data for the POST request
  const formData = new URLSearchParams();

  // Required fields for creation
  formData.append('mcp_implementation[name]', params.name);
  formData.append('mcp_implementation[type]', params.type);

  // Optional fields
  if (params.short_description !== undefined) {
    formData.append('mcp_implementation[short_description]', params.short_description);
  }
  if (params.description !== undefined) {
    formData.append('mcp_implementation[description]', params.description);
  }
  if (params.status !== undefined) {
    formData.append('mcp_implementation[status]', params.status);
  }
  if (params.slug !== undefined) {
    formData.append('mcp_implementation[slug]', params.slug);
  }
  if (params.url !== undefined) {
    // Backend expects 'marketing_url' field, but tool exposes it as 'url' for better UX
    formData.append('mcp_implementation[marketing_url]', params.url);
  }
  if (params.provider_name !== undefined) {
    formData.append('mcp_implementation[provider_name]', params.provider_name);
  }
  // Note: github_stars is read-only (derived from GitHub repository) - not sent on create
  if (params.classification !== undefined) {
    formData.append('mcp_implementation[classification]', params.classification);
  }
  if (params.implementation_language !== undefined) {
    formData.append('mcp_implementation[implementation_language]', params.implementation_language);
  }
  // Note: mcp_server_id and mcp_client_id are created automatically based on 'type' - not sent on create

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

  // Package registry fields
  if (params.package_registry !== undefined) {
    formData.append('mcp_implementation[package_registry]', params.package_registry);
  }
  if (params.package_name !== undefined) {
    formData.append('mcp_implementation[package_name]', params.package_name);
  }

  // Flags
  if (params.recommended !== undefined) {
    formData.append('mcp_implementation[recommended]', params.recommended.toString());
  }

  // Date overrides
  if (params.created_on_override !== undefined) {
    formData.append('mcp_implementation[created_on_override]', params.created_on_override);
  }

  // Tags
  if (params.tags !== undefined) {
    if (params.tags.length > 0) {
      params.tags.forEach((tagSlug, index) => {
        formData.append(`mcp_implementation[tags][${index}]`, tagSlug);
      });
    } else {
      // Empty array explicitly provided - send empty array marker to Rails
      formData.append('mcp_implementation[tags]', '[]');
    }
  }

  // Internal notes
  if (params.internal_notes !== undefined) {
    formData.append('mcp_implementation[internal_notes]', params.internal_notes);
  }

  // Remote endpoints
  // Rails expects nested attributes to use the _attributes suffix for has_many associations
  if (params.remote !== undefined) {
    if (params.remote.length > 0) {
      params.remote.forEach((remote, index) => {
        if (remote.id !== undefined) {
          formData.append(
            `mcp_implementation[remote_attributes][${index}][id]`,
            remote.id.toString()
          );
        }
        if (remote.url_direct !== undefined) {
          formData.append(
            `mcp_implementation[remote_attributes][${index}][url_direct]`,
            remote.url_direct
          );
        }
        if (remote.url_setup !== undefined) {
          formData.append(
            `mcp_implementation[remote_attributes][${index}][url_setup]`,
            remote.url_setup
          );
        }
        if (remote.transport !== undefined) {
          formData.append(
            `mcp_implementation[remote_attributes][${index}][transport]`,
            remote.transport
          );
        }
        if (remote.host_platform !== undefined) {
          formData.append(
            `mcp_implementation[remote_attributes][${index}][host_platform]`,
            remote.host_platform
          );
        }
        if (remote.host_infrastructure !== undefined) {
          formData.append(
            `mcp_implementation[remote_attributes][${index}][host_infrastructure]`,
            remote.host_infrastructure
          );
        }
        if (remote.authentication_method !== undefined) {
          formData.append(
            `mcp_implementation[remote_attributes][${index}][authentication_method]`,
            remote.authentication_method
          );
        }
        if (remote.cost !== undefined) {
          formData.append(`mcp_implementation[remote_attributes][${index}][cost]`, remote.cost);
        }
        if (remote.status !== undefined) {
          formData.append(`mcp_implementation[remote_attributes][${index}][status]`, remote.status);
        }
        if (remote.display_name !== undefined) {
          formData.append(
            `mcp_implementation[remote_attributes][${index}][display_name]`,
            remote.display_name
          );
        }
        if (remote.internal_notes !== undefined) {
          formData.append(
            `mcp_implementation[remote_attributes][${index}][internal_notes]`,
            remote.internal_notes
          );
        }
      });
    }
  }

  // Canonical URLs
  // Rails expects nested attributes to use the _attributes suffix for has_many associations
  if (params.canonical !== undefined) {
    if (params.canonical.length > 0) {
      params.canonical.forEach((canonicalUrl, index) => {
        formData.append(
          `mcp_implementation[canonical_attributes][${index}][url]`,
          canonicalUrl.url
        );
        formData.append(
          `mcp_implementation[canonical_attributes][${index}][scope]`,
          canonicalUrl.scope
        );
        if (canonicalUrl.note !== undefined) {
          formData.append(
            `mcp_implementation[canonical_attributes][${index}][note]`,
            canonicalUrl.note
          );
        }
      });
    }
  }

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API key');
    }
    if (response.status === 403) {
      throw new Error('User lacks admin privileges');
    }
    if (response.status === 422) {
      const errorData = (await response.json()) as { errors?: string[]; error?: string };
      // Handle both array format and single error string format from Rails
      // Also handle empty arrays - an empty array should fall back to the default message
      const errors =
        errorData.errors && errorData.errors.length > 0
          ? errorData.errors
          : errorData.error
            ? [errorData.error]
            : ['Unknown validation error'];
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
    throw new Error(
      `Failed to create MCP implementation: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  return data as MCPImplementation;
}
