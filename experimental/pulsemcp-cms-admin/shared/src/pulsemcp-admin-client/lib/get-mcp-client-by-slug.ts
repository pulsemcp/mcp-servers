import type { MCPClient } from '../../types.js';

export async function getMCPClientBySlug(
  apiKey: string,
  baseUrl: string,
  slug: string
): Promise<MCPClient> {
  // MCP clients endpoint not yet available in admin API
  // Return mock data for now
  const mockClients: MCPClient[] = [
    { id: 1, name: 'Claude Desktop', slug: 'claude-desktop' },
    { id: 2, name: 'Cline', slug: 'cline' },
    { id: 3, name: 'Continue', slug: 'continue' },
  ];

  const client = mockClients.find((c) => c.slug === slug);
  if (!client) {
    throw new Error(`MCP client not found: ${slug}`);
  }

  return client;
}
