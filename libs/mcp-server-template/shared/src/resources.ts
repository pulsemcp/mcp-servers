import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getServerState } from './state.js';

// =============================================================================
// RESOURCES IMPLEMENTATION
// =============================================================================
// Resources expose data that can be read by MCP clients.
// Common resource types:
// - Configuration/status resources (like the config example below)
// - Data resources (files, database records, API responses)
// - Dynamic resources (generated content based on state)
// =============================================================================

export function registerResources(server: Server) {
  // List available resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: 'NAME://config',
          name: 'Server Configuration',
          description:
            'Current server configuration and status. Useful for debugging and verifying setup.',
          mimeType: 'application/json',
        },
        {
          uri: 'NAME://example',
          name: 'Example Resource',
          description: 'An example resource implementation showing the basic pattern.',
          mimeType: 'text/plain',
        },
      ],
    };
  });

  // Read resource contents
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    // =========================================================================
    // CONFIG RESOURCE - Server Status and Configuration
    // =========================================================================
    // This resource exposes server configuration for debugging.
    // It helps users verify their setup and troubleshoot issues.
    // Sensitive values (like API keys) are masked for security.
    // =========================================================================
    if (uri === 'NAME://config') {
      const state = getServerState();

      const config = {
        server: {
          name: 'NAME-mcp-server',
          version: '0.1.0',
          transport: 'stdio',
        },
        environment: {
          // Show which environment variables are configured (masked for security)
          YOUR_API_KEY: process.env.YOUR_API_KEY ? '***configured***' : 'not set',
          ENABLED_TOOLGROUPS: process.env.ENABLED_TOOLGROUPS || 'all (default)',
          SKIP_HEALTH_CHECKS: process.env.SKIP_HEALTH_CHECKS || 'false',
        },
        state: {
          selectedResourceId: state.selectedResourceId || 'none',
          isResourceLocked: state.isResourceLocked,
        },
        capabilities: {
          tools: true,
          resources: true,
          // Add other capabilities as needed
        },
      };

      return {
        contents: [
          {
            uri: 'NAME://config',
            mimeType: 'application/json',
            text: JSON.stringify(config, null, 2),
          },
        ],
      };
    }

    // =========================================================================
    // EXAMPLE RESOURCE - Basic Pattern
    // =========================================================================
    if (uri === 'NAME://example') {
      return {
        contents: [
          {
            uri: 'NAME://example',
            mimeType: 'text/plain',
            text: 'This is an example resource content.\n\nReplace this with your actual resource implementation.',
          },
        ],
      };
    }

    throw new Error(`Resource not found: ${uri}`);
  });
}
