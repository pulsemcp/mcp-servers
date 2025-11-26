import type { MCPImplementation, SaveMCPImplementationParams } from '../../types.js';

export async function saveMCPImplementation(
  apiKey: string,
  baseUrl: string,
  id: number,
  params: SaveMCPImplementationParams
): Promise<MCPImplementation> {
  const url = new URL(`/api/implementations/${id}`, baseUrl);

  // Build form data for the PUT request
  const formData = new URLSearchParams();

  // Add all provided fields using Rails conventions
  if (params.name !== undefined) {
    formData.append('mcp_implementation[name]', params.name);
  }
  if (params.short_description !== undefined) {
    formData.append('mcp_implementation[short_description]', params.short_description);
  }
  if (params.description !== undefined) {
    formData.append('mcp_implementation[description]', params.description);
  }
  if (params.type !== undefined) {
    formData.append('mcp_implementation[type]', params.type);
  }
  if (params.status !== undefined) {
    formData.append('mcp_implementation[status]', params.status);
  }
  if (params.slug !== undefined) {
    formData.append('mcp_implementation[slug]', params.slug);
  }
  if (params.url !== undefined) {
    formData.append('mcp_implementation[url]', params.url);
  }
  if (params.provider_name !== undefined) {
    formData.append('mcp_implementation[provider_name]', params.provider_name);
  }
  if (params.github_stars !== undefined) {
    formData.append(
      'mcp_implementation[github_stars]',
      params.github_stars === null ? '' : params.github_stars.toString()
    );
  }
  if (params.classification !== undefined) {
    formData.append('mcp_implementation[classification]', params.classification);
  }
  if (params.implementation_language !== undefined) {
    formData.append('mcp_implementation[implementation_language]', params.implementation_language);
  }
  if (params.mcp_server_id !== undefined) {
    formData.append(
      'mcp_implementation[mcp_server_id]',
      params.mcp_server_id === null ? '' : params.mcp_server_id.toString()
    );
  }
  if (params.mcp_client_id !== undefined) {
    formData.append(
      'mcp_implementation[mcp_client_id]',
      params.mcp_client_id === null ? '' : params.mcp_client_id.toString()
    );
  }

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

  // Remote endpoints
  if (params.remote !== undefined && params.remote.length > 0) {
    params.remote.forEach((remote, index) => {
      if (remote.id !== undefined) {
        formData.append(`mcp_implementation[remote][${index}][id]`, remote.id);
      }
      if (remote.url_direct !== undefined) {
        formData.append(`mcp_implementation[remote][${index}][url_direct]`, remote.url_direct);
      }
      if (remote.url_setup !== undefined) {
        formData.append(`mcp_implementation[remote][${index}][url_setup]`, remote.url_setup);
      }
      if (remote.transport !== undefined) {
        formData.append(`mcp_implementation[remote][${index}][transport]`, remote.transport);
      }
      if (remote.host_platform !== undefined) {
        formData.append(`mcp_implementation[remote][${index}][host_platform]`, remote.host_platform);
      }
      if (remote.host_infrastructure !== undefined) {
        formData.append(
          `mcp_implementation[remote][${index}][host_infrastructure]`,
          remote.host_infrastructure
        );
      }
      if (remote.authentication_method !== undefined) {
        formData.append(
          `mcp_implementation[remote][${index}][authentication_method]`,
          remote.authentication_method
        );
      }
      if (remote.cost !== undefined) {
        formData.append(`mcp_implementation[remote][${index}][cost]`, remote.cost);
      }
      if (remote.status !== undefined) {
        formData.append(`mcp_implementation[remote][${index}][status]`, remote.status);
      }
      if (remote.display_name !== undefined) {
        formData.append(`mcp_implementation[remote][${index}][display_name]`, remote.display_name);
      }
      if (remote.internal_notes !== undefined) {
        formData.append(
          `mcp_implementation[remote][${index}][internal_notes]`,
          remote.internal_notes
        );
      }
    });
  }

  // Canonical URLs
  if (params.canonical !== undefined && params.canonical.length > 0) {
    params.canonical.forEach((canonicalUrl, index) => {
      formData.append(`mcp_implementation[canonical][${index}][url]`, canonicalUrl.url);
      formData.append(`mcp_implementation[canonical][${index}][scope]`, canonicalUrl.scope);
      if (canonicalUrl.note !== undefined) {
        formData.append(`mcp_implementation[canonical][${index}][note]`, canonicalUrl.note);
      }
    });
  }

  const response = await fetch(url.toString(), {
    method: 'PUT',
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
    if (response.status === 404) {
      throw new Error(`MCP implementation not found: ${id}`);
    }
    if (response.status === 422) {
      const errorData = (await response.json()) as { errors?: string[] };
      const errors = errorData.errors || ['Validation failed'];
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
    throw new Error(`Failed to save MCP implementation: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data as MCPImplementation;
}
