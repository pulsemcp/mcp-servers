import type { MCPServer } from '../../types.js';

export async function getMCPServerBySlug(
  apiKey: string,
  baseUrl: string,
  slug: string
): Promise<MCPServer> {
  // MCP servers endpoint not yet available in admin API
  // Return mock data for now
  const mockServers: MCPServer[] = [
    { id: 1, name: 'GitHub MCP', slug: 'github-mcp' },
    { id: 2, name: 'Slack MCP', slug: 'slack-mcp' },
    { id: 3, name: 'Google Drive MCP', slug: 'gdrive' },
  ];

  const server = mockServers.find((s) => s.slug === slug);
  if (!server) {
    throw new Error(`MCP server not found: ${slug}`);
  }

  return server;
}
