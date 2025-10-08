import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { promises as fs } from 'fs';
import { resolve, normalize, relative } from 'path';
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
      const client = clientFactory();
      const agentState = await client.getAgentState();

      if (!agentState) {
        throw new Error('No agent initialized - cannot read resources');
      }

      // Security: Prevent path traversal attacks
      // Ensure the requested file is within the agent's working directory
      const normalizedPath = normalize(resolve(filePath));
      const normalizedWorkingDir = normalize(resolve(agentState.workingDirectory));

      // Use path.relative to check if the path escapes the working directory
      const relativePath = relative(normalizedWorkingDir, normalizedPath);
      const isOutside =
        relativePath.startsWith('..') ||
        resolve(normalizedWorkingDir, relativePath) !== normalizedPath;

      if (isOutside) {
        logger.error(`Path traversal attempt detected: ${filePath}`);
        throw new Error(`Access denied: path is outside agent working directory`);
      }

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

        // Provide more specific error messages
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          throw new Error(`Resource not found: ${uri}`);
        } else if ((error as NodeJS.ErrnoException).code === 'EACCES') {
          throw new Error(`Permission denied reading resource: ${uri}`);
        } else if ((error as NodeJS.ErrnoException).code === 'EISDIR') {
          throw new Error(`Cannot read directory as resource: ${uri}`);
        } else {
          throw new Error(`Failed to read resource: ${uri}`);
        }
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
