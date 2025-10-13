import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { IClaudeCodeClient } from '../claude-code-client/claude-code-client.js';
import { createLogger } from '../logging.js';

const logger = createLogger('diagnose-agent-tool');

export function diagnoseAgentTool(server: Server, clientFactory: () => IClaudeCodeClient) {
  return {
    name: 'diagnose_agent',
    description: `Provides diagnostic information about the current agent state, useful for troubleshooting initialization issues.

This tool returns detailed information about:
- Whether an agent is properly initialized
- Current agent state (working directory, session ID, etc.)
- State file location and accessibility
- Project working directory configuration

Example response:
{
  "hasAgent": true,
  "agentState": {
    "hasWorkingDir": true,
    "hasSessionId": true,
    "hasStateDir": true,
    "hasState": true,
    "workingDir": "/path/to/agent/working/dir",
    "sessionId": "uuid-session-id"
  },
  "stateFile": {
    "path": "/path/to/state.json",
    "exists": true,
    "readable": true
  },
  "projectWorkingDirectory": "/current/working/directory"
}

Use cases:
- Troubleshooting "No agent initialized" errors
- Verifying state restoration after server restart
- Checking if state.json is in the expected location
- Debugging PROJECT_WORKING_DIRECTORY configuration issues`,

    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },

    handler: async () => {
      try {
        const client = clientFactory();
        const diagnostics = await client.getStateDiagnostics();

        logger.debug('Agent diagnostics:', diagnostics);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(diagnostics, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error('Failed to get agent diagnostics:', error);
        throw error;
      }
    },
  };
}
