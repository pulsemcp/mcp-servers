import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { promises as fs } from 'fs';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ClientFactory } from './server.js';
import { createLogger } from './logging.js';

const logger = createLogger('resources');

export function createRegisterResources(clientFactory: ClientFactory) {
  return (server: Server) => {
    // List available resources
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const client = clientFactory();
      const agentState = await client.getAgentState();

      const resources = [];

      if (agentState) {
        resources.push({
          uri: `file://${agentState.workingDirectory}/state.json`,
          name: 'Subagent State',
          description:
            'Current state of the Claude Code subagent including status, installed servers, and metadata',
          mimeType: 'application/json',
        });

        resources.push({
          uri: `file://${agentState.workingDirectory}/transcript.json`,
          name: 'Subagent Transcript',
          description: 'Full conversation history with the subagent for debugging purposes',
          mimeType: 'application/json',
        });
      }

      return { resources };
    });

    // Read resource contents
    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      if (!uri.startsWith('file://')) {
        throw new Error(`Unsupported URI scheme: ${uri}`);
      }

      const filePath = uri.slice(7); // Remove 'file://' prefix

      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const mimeType = filePath.endsWith('.json') ? 'application/json' : 'text/plain';

        return {
          contents: [
            {
              uri,
              mimeType,
              text: content,
            },
          ],
        };
      } catch (error) {
        logger.error(`Failed to read resource ${uri}:`, error);
        throw new Error(`Resource not found: ${uri}`);
      }
    });
  };
}

// Keep the original registerResources for backward compatibility
export function registerResources(server: Server) {
  const factory = () => {
    throw new Error(
      'No client factory provided - use createRegisterResources for dependency injection'
    );
  };
  const register = createRegisterResources(factory);
  register(server);
}
