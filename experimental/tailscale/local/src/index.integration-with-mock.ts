#!/usr/bin/env node
/**
 * Integration test entry point with mock client.
 * This file wires the MCP server up to a mock Tailscale client so the full MCP
 * protocol flow can be exercised without any live external API calls.
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer, logServerStart, logError } from '../shared/index.js';

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const VERSION = packageJson.version;

import type {
  ITailscaleClient,
  Device,
  DevicesResponse,
  DeviceRoutes,
  PolicyFile,
  PolicyValidationResult,
  Key,
  KeysResponse,
  CreateKeyParams,
  CreateOAuthClientParams,
} from '../shared/index.js';

const MOCK_POLICY = `{
  // Example tailnet policy file
  "acls": [
    { "action": "accept", "src": ["*"], "dst": ["*:*"] },
  ],
  "tagOwners": {
    "tag:ci": ["autogroup:admin"],
  },
}`;

const MOCK_DEVICE: Device = {
  id: '1234567890',
  nodeId: 'nABC123',
  name: 'laptop.tailnet.ts.net',
  hostname: 'laptop',
  addresses: ['100.101.102.103', 'fd7a:115c:a1e0::1'],
  user: 'alice@example.com',
  os: 'linux',
  clientVersion: '1.80.0',
  updateAvailable: false,
  created: '2024-01-01T00:00:00Z',
  lastSeen: '2024-06-01T12:00:00Z',
  authorized: true,
  tags: ['tag:ci'],
};

/**
 * Integration mock implementation of ITailscaleClient.
 *
 * Returns deterministic canned data and records nothing — it exists purely to
 * drive the MCP protocol layer during integration tests.
 */
class IntegrationMockTailscaleClient implements ITailscaleClient {
  async getPolicyFile(): Promise<PolicyFile> {
    return { content: MOCK_POLICY, etag: '"mock-etag-123"' };
  }

  async validatePolicyFile(content: string): Promise<PolicyValidationResult> {
    if (content.includes('INVALID')) {
      return { valid: false, message: 'mock validation error' };
    }
    return { valid: true };
  }

  async updatePolicyFile(content: string): Promise<PolicyFile> {
    return { content, etag: '"mock-etag-456"' };
  }

  async listDevices(): Promise<DevicesResponse> {
    return { devices: [MOCK_DEVICE] };
  }

  async getDevice(): Promise<Device> {
    return MOCK_DEVICE;
  }

  async getDeviceRoutes(): Promise<DeviceRoutes> {
    return {
      advertisedRoutes: ['10.0.0.0/24'],
      enabledRoutes: ['10.0.0.0/24'],
    };
  }

  async authorizeDevice(): Promise<void> {
    return;
  }

  async setDeviceTags(): Promise<void> {
    return;
  }

  async setDeviceRoutes(_deviceId: string, routes: string[]): Promise<DeviceRoutes> {
    return { advertisedRoutes: routes, enabledRoutes: routes };
  }

  async deleteDevice(): Promise<void> {
    return;
  }

  async listKeys(): Promise<KeysResponse> {
    return {
      keys: [
        {
          id: 'kMockKey1',
          description: 'CI provisioning key',
          created: '2024-01-01T00:00:00Z',
          expires: '2024-04-01T00:00:00Z',
        },
      ],
    };
  }

  async getKey(keyId: string): Promise<Key> {
    return {
      id: keyId,
      description: 'CI provisioning key',
      created: '2024-01-01T00:00:00Z',
      expires: '2024-04-01T00:00:00Z',
      capabilities: {
        devices: {
          create: { reusable: true, ephemeral: false, preauthorized: true, tags: ['tag:ci'] },
        },
      },
    };
  }

  async createAuthKey(params: CreateKeyParams): Promise<Key> {
    return {
      id: 'kMockCreated1',
      key: 'tskey-auth-kMockCreated1-secretvalue',
      created: '2024-06-01T00:00:00Z',
      expires: '2024-09-01T00:00:00Z',
      capabilities: {
        devices: {
          create: {
            reusable: params.reusable ?? false,
            ephemeral: params.ephemeral ?? false,
            preauthorized: params.preauthorized ?? false,
            tags: params.tags ?? [],
          },
        },
      },
      description: params.description,
    };
  }

  async createOAuthClient(params: CreateOAuthClientParams): Promise<Key> {
    return {
      id: 'kMockOAuthClient1',
      key: 'tskey-client-kMockOAuthClient1-clientsecretvalue',
      keyType: 'client',
      created: '2024-06-01T00:00:00Z',
      scopes: params.scopes,
      tags: params.tags ?? [],
      description: params.description,
    };
  }

  async deleteKey(): Promise<void> {
    return;
  }
}

async function main() {
  // Create server using factory
  const { server, registerHandlers } = createMCPServer({ version: VERSION });

  // Create mock client for testing
  const mockClient = new IntegrationMockTailscaleClient();

  // Register all handlers with mock client
  await registerHandlers(server, () => mockClient);

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logServerStart('tailscale-vpn-mcp-server (integration-mock)');
}

// Run the server
main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
