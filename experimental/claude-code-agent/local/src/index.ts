#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from '../shared/index.js';
import { logServerStart, logError } from '../shared/logging.js';

// Set default environment variables
function setDefaults(): void {
  const projectRoot = process.cwd();

  // Set defaults for configuration paths
  if (!process.env.TRUSTED_SERVERS_PATH) {
    process.env.TRUSTED_SERVERS_PATH = `${projectRoot}/servers.md`;
  }
  if (!process.env.SERVER_CONFIGS_PATH) {
    process.env.SERVER_CONFIGS_PATH = `${projectRoot}/servers.json`;
  }

  // Set default log level to info (not too verbose)
  if (!process.env.CLAUDE_AGENT_LOG_LEVEL) {
    process.env.CLAUDE_AGENT_LOG_LEVEL = 'info';
  }

  // Log the configuration being used
  logServerStart('Configuration:');
  console.error(`  TRUSTED_SERVERS_PATH: ${process.env.TRUSTED_SERVERS_PATH}`);
  console.error(`  SERVER_CONFIGS_PATH: ${process.env.SERVER_CONFIGS_PATH}`);
  console.error(`  CLAUDE_CODE_PATH: ${process.env.CLAUDE_CODE_PATH || 'claude (default)'}`);
  console.error(
    `  CLAUDE_AGENT_BASE_DIR: ${process.env.CLAUDE_AGENT_BASE_DIR || '/tmp/claude-agents (default)'}`
  );
  console.error(`  CLAUDE_AGENT_LOG_LEVEL: ${process.env.CLAUDE_AGENT_LOG_LEVEL}`);
  console.error(
    `  CLAUDE_SKIP_PERMISSIONS: ${process.env.CLAUDE_SKIP_PERMISSIONS || 'true (default)'}`
  );
}

async function main() {
  // Set default environment variables
  setDefaults();

  // Create server using factory
  const { server, registerHandlers } = createMCPServer();

  // Register all handlers (resources and tools)
  await registerHandlers(server);

  // Set up process cleanup handlers to prevent orphaned child processes
  const cleanup = async () => {
    console.error('Received shutdown signal, cleaning up...');
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logServerStart('claude-code-agent');
}

// Run the server
main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
