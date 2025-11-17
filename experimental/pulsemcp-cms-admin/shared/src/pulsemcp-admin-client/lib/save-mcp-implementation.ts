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
    formData.append('mcp_implementation[github_stars]', params.github_stars.toString());
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
    throw new Error(
      `Failed to save MCP implementation: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  return data as MCPImplementation;
}
