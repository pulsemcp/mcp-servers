import { vi } from 'vitest';

// Mock the state module - must be before any imports that use it
vi.mock('../../../shared/src/state', () => ({
  setSelectedAppId: vi.fn(),
  getSelectedAppId: vi.fn(),
  clearSelectedAppId: vi.fn(),
  getEffectiveAppId: vi.fn(),
  isAppIdLocked: vi.fn(),
}));

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createRegisterTools } from '../../../shared/src/tools';
import { getEffectiveAppId, isAppIdLocked } from '../../../shared/src/state';
import { createMockAppsignalClient } from '../../mocks/appsignal-client.functional-mock';
import type { IAppsignalClient } from '../../../shared/src/appsignal-client/appsignal-client';

interface Tool {
  name: string;
  schema: unknown;
  handler: (args: unknown) => Promise<unknown>;
  enabled: boolean;
}

interface ToolResult {
  content: Array<{ type: string; text: string }>;
}

describe('GraphQL Tools', () => {
  let mockServer: McpServer;
  let registeredTools: Map<string, Tool>;
  let mockClient: IAppsignalClient;

  // Helper to register tools with a custom mock client
  const registerToolsWithClient = (client: IAppsignalClient) => {
    const registerTools = createRegisterTools(() => client);
    registeredTools.clear();
    registerTools(mockServer);
  };

  beforeEach(() => {
    // Reset environment variables
    process.env.APPSIGNAL_API_KEY = 'test-api-key';
    process.env.APPSIGNAL_APP_ID = 'test-app-id';

    // Reset mocks
    vi.clearAllMocks();

    // Default mock implementations
    vi.mocked(isAppIdLocked).mockReturnValue(true);
    vi.mocked(getEffectiveAppId).mockReturnValue('test-app-id');

    // Create a mock server that captures tool registrations
    registeredTools = new Map();
    mockServer = {
      tool: vi.fn((...args) => {
        // Handle both 3 and 4 parameter versions
        let name, schema, handler;
        if (args.length === 3) {
          [name, schema, handler] = args;
        } else if (args.length === 4) {
          [name, , schema, handler] = args; // Skip description
        }
        const tool = { name, schema, handler, enabled: true };
        registeredTools.set(name, tool);
        return {
          enable: () => {
            tool.enabled = true;
          },
          disable: () => {
            tool.enabled = false;
          },
        };
      }),
    } as unknown as McpServer;

    // Create default mock client
    mockClient = createMockAppsignalClient();
  });

  afterEach(() => {
    delete process.env.APPSIGNAL_API_KEY;
    delete process.env.APPSIGNAL_APP_ID;
  });

  describe('get_graphql_schema', () => {
    it('should be registered and enabled', () => {
      registerToolsWithClient(mockClient);

      expect(registeredTools.has('get_graphql_schema')).toBe(true);
      const tool = registeredTools.get('get_graphql_schema');
      expect(tool?.enabled).toBe(true);
    });

    it('should return schema summary with types, queries, and mutations', async () => {
      registerToolsWithClient(mockClient);

      const tool = registeredTools.get('get_graphql_schema');
      expect(tool).toBeDefined();

      const result = (await tool!.handler({})) as ToolResult;
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const output = JSON.parse(result.content[0].text);
      expect(output.message).toContain('Schema Summary');
      expect(output.queryFields).toBeDefined();
      expect(output.mutationFields).toBeDefined();
      expect(output.types).toBeDefined();
      expect(output.typeCount).toBeGreaterThan(0);
    });

    it('should include Query fields with names', async () => {
      registerToolsWithClient(mockClient);

      const tool = registeredTools.get('get_graphql_schema');
      const result = (await tool!.handler({})) as ToolResult;
      const output = JSON.parse(result.content[0].text);

      expect(Array.isArray(output.queryFields)).toBe(true);
      // The schema should have some query fields
      expect(output.queryFields.length).toBeGreaterThan(0);
      expect(output.queryFields[0]).toHaveProperty('name');
    });

    it('should include types with kind and field count', async () => {
      registerToolsWithClient(mockClient);

      const tool = registeredTools.get('get_graphql_schema');
      const result = (await tool!.handler({})) as ToolResult;
      const output = JSON.parse(result.content[0].text);

      expect(Array.isArray(output.types)).toBe(true);
      expect(output.types.length).toBeGreaterThan(0);

      const type = output.types[0];
      expect(type).toHaveProperty('name');
      expect(type).toHaveProperty('kind');
      expect(['type', 'input', 'enum', 'interface', 'union', 'scalar']).toContain(type.kind);
    });
  });

  describe('get_graphql_schema_details', () => {
    it('should be registered and enabled', () => {
      registerToolsWithClient(mockClient);

      expect(registeredTools.has('get_graphql_schema_details')).toBe(true);
      const tool = registeredTools.get('get_graphql_schema_details');
      expect(tool?.enabled).toBe(true);
    });

    it('should return type definitions for requested types', async () => {
      registerToolsWithClient(mockClient);

      const tool = registeredTools.get('get_graphql_schema_details');
      expect(tool).toBeDefined();

      const result = (await tool!.handler({ typeNames: ['App'] })) as ToolResult;
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const output = JSON.parse(result.content[0].text);
      expect(output.message).toContain('1 requested type');
      expect(output.definitions).toBeDefined();
      expect(Array.isArray(output.definitions)).toBe(true);
    });

    it('should include error entry for types not found', async () => {
      registerToolsWithClient(mockClient);

      const tool = registeredTools.get('get_graphql_schema_details');
      const result = (await tool!.handler({
        typeNames: ['NonExistentType'],
      })) as ToolResult;
      const output = JSON.parse(result.content[0].text);

      // Should have an error entry
      const errorEntry = output.definitions.find((d: { name: string }) => d.name === '_errors');
      expect(errorEntry).toBeDefined();
      expect(errorEntry.definition).toContain('NonExistentType');
    });

    it('should handle multiple type names', async () => {
      registerToolsWithClient(mockClient);

      const tool = registeredTools.get('get_graphql_schema_details');
      const result = (await tool!.handler({
        typeNames: ['App', 'Organization'],
      })) as ToolResult;
      const output = JSON.parse(result.content[0].text);

      expect(output.message).toContain('2 requested type');
      expect(output.definitions.length).toBeGreaterThan(0);
    });
  });

  describe('custom_graphql_query', () => {
    it('should be registered', () => {
      registerToolsWithClient(mockClient);

      expect(registeredTools.has('custom_graphql_query')).toBe(true);
    });

    it('should execute query and return result', async () => {
      registerToolsWithClient(mockClient);

      const tool = registeredTools.get('custom_graphql_query');
      expect(tool).toBeDefined();

      const result = (await tool!.handler({
        query: '{ viewer { organizations { apps { id } } } }',
      })) as ToolResult;

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const output = JSON.parse(result.content[0].text);
      expect(output.viewer).toBeDefined();
    });

    it('should pass variables to the query', async () => {
      registerToolsWithClient(mockClient);

      const tool = registeredTools.get('custom_graphql_query');
      const result = (await tool!.handler({
        query: 'query GetApp($appId: String!) { app(id: $appId) { name } }',
        variables: { appId: 'custom-app-id' },
      })) as ToolResult;

      expect(result.content).toBeDefined();
      const output = JSON.parse(result.content[0].text);
      expect(output).toBeDefined();
    });

    it('should handle query errors gracefully', async () => {
      const errorClient = {
        ...mockClient,
        executeCustomQuery: vi
          .fn()
          .mockRejectedValue(new Error('Query failed: Cannot query field')),
      };
      registerToolsWithClient(errorClient);

      const tool = registeredTools.get('custom_graphql_query');
      const result = (await tool!.handler({
        query: '{ invalid }',
      })) as ToolResult;

      expect(result.content[0].text).toContain('Error');
      expect(result.content[0].text).toContain('Cannot query field');
      expect(result.content[0].text).toContain('Tip');
    });
  });
});
