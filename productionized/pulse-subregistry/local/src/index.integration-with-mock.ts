#!/usr/bin/env node

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from '../shared/index.js';
import type { IPulseSubregistryClient } from '../shared/index.js';
import type {
  ListServersResponse,
  GetServerResponse,
  ListServersOptions,
  GetServerOptions,
} from '../shared/types.js';

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const VERSION = packageJson.version;

// Mock client implementation for integration testing
class MockPulseSubregistryClient implements IPulseSubregistryClient {
  private tenantId?: string;

  setTenantId(tenantId: string | undefined): void {
    this.tenantId = tenantId;
  }

  async listServers(options?: ListServersOptions): Promise<ListServersResponse> {
    const mockServers = process.env.MOCK_SERVERS_DATA;
    const mockSuccess = process.env.MOCK_LIST_SUCCESS !== 'false';
    const mockNextCursor = process.env.MOCK_NEXT_CURSOR;

    if (!mockSuccess) {
      throw new Error(process.env.MOCK_ERROR_MESSAGE || 'Mock list servers failed');
    }

    // Parse raw server data and wrap in ServerEntry structure
    const rawServers = mockServers
      ? JSON.parse(mockServers)
      : [
          {
            name: 'test-server-1',
            description: 'A test server for integration testing',
            version: '1.0.0',
            url: 'https://example.com/test-1',
          },
          {
            name: 'test-server-2',
            description: 'Another test server',
            version: '2.0.0',
            repository: 'https://github.com/example/test-2',
          },
        ];

    // Wrap servers in ServerEntry structure { server: {...}, _meta: {...} }
    let servers = rawServers.map((s: Record<string, unknown>) => ({
      server: s,
      _meta: {},
    }));

    // Apply search filter if provided
    if (options?.search) {
      const searchLower = options.search.toLowerCase();
      servers = servers.filter(
        (entry: { server: { name: string; description?: string } }) =>
          entry.server.name.toLowerCase().includes(searchLower) ||
          (entry.server.description && entry.server.description.toLowerCase().includes(searchLower))
      );
    }

    // Apply limit if provided
    if (options?.limit) {
      servers = servers.slice(0, options.limit);
    }

    return {
      servers,
      metadata: {
        count: servers.length,
        nextCursor: mockNextCursor,
      },
    };
  }

  async getServer(options: GetServerOptions): Promise<GetServerResponse> {
    const mockServerData = process.env.MOCK_SERVER_DATA;
    const mockSuccess = process.env.MOCK_GET_SUCCESS !== 'false';

    if (!mockSuccess) {
      throw new Error(process.env.MOCK_ERROR_MESSAGE || `Server not found: ${options.serverName}`);
    }

    const server = mockServerData
      ? JSON.parse(mockServerData)
      : {
          name: options.serverName,
          description: `Mock server: ${options.serverName}`,
          version: options.version === 'latest' ? '1.0.0' : options.version,
          url: `https://example.com/${options.serverName}`,
          repository: `https://github.com/example/${options.serverName}`,
        };

    return {
      server,
      _meta: {
        activeTenantId: this.tenantId || null,
      },
    };
  }
}

async function main() {
  const showAdminTools = process.env.SHOW_ADMIN_TOOLS === 'true';
  const { server, registerHandlers } = createMCPServer({ version: VERSION, showAdminTools });

  // Create mock client factory for testing
  const mockClient = new MockPulseSubregistryClient();
  const mockClientFactory = () => mockClient;

  await registerHandlers(server, mockClientFactory);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Integration test server error:', error);
  process.exit(1);
});
