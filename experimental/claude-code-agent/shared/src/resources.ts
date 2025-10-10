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
      const stateDirectory = await client.getStateDirectory();

      const resources = [];

      if (agentState && stateDirectory) {
        resources.push({
          uri: `file://${stateDirectory}/state.json`,
          name: 'Subagent State',
          description:
            'Current state of the Claude Code subagent including status, installed servers, and metadata',
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
      const stateDirectory = await client.getStateDirectory();

      if (!agentState || !stateDirectory) {
        throw new Error('No agent initialized - cannot read resources');
      }

      // Security: Prevent path traversal attacks
      // Ensure the requested file is within either the agent's working directory or state directory
      const normalizedPath = normalize(resolve(filePath));
      const normalizedWorkingDir = normalize(resolve(agentState.workingDirectory));
      const normalizedStateDir = normalize(resolve(stateDirectory));

      // Check if the path is within the working directory
      const relativeToWorkingDir = relative(normalizedWorkingDir, normalizedPath);
      const isOutsideWorkingDir =
        relativeToWorkingDir.startsWith('..') ||
        resolve(normalizedWorkingDir, relativeToWorkingDir) !== normalizedPath;

      // Check if the path is within the state directory
      const relativeToStateDir = relative(normalizedStateDir, normalizedPath);
      const isOutsideStateDir =
        relativeToStateDir.startsWith('..') ||
        resolve(normalizedStateDir, relativeToStateDir) !== normalizedPath;

      if (isOutsideWorkingDir && isOutsideStateDir) {
        logger.error(`Path traversal attempt detected: ${filePath}`);
        throw new Error(`Access denied: path is outside agent working and state directories`);
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
