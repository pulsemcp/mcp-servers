#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from '../shared/index.js';

// Validate environment variables
function validateEnvironment() {
  const required: Array<{ name: string; description: string }> = [];

  // Check required variables
  const missing = required.filter(({ name }) => !process.env[name]);

  if (missing.length > 0) {
    console.error('Missing required environment variables:');
    missing.forEach(({ name, description }) => {
      console.error(`  ${name}: ${description}`);
    });
    process.exit(1);
  }

  // Validate OPTIMIZE_FOR if provided
  const optimizeFor = process.env.OPTIMIZE_FOR;
  if (optimizeFor && !['cost', 'speed'].includes(optimizeFor)) {
    console.error(`Invalid OPTIMIZE_FOR value: ${optimizeFor}. Must be 'cost' or 'speed'.`);
    process.exit(1);
  }

  // Log available services
  const available = [];
  if (process.env.FIRECRAWL_API_KEY) available.push('Firecrawl');
  if (process.env.BRIGHTDATA_BEARER_TOKEN) available.push('BrightData');

  console.error(
    `Pulse Fetch starting with services: native${available.length > 0 ? ', ' + available.join(', ') : ''}`
  );

  if (optimizeFor) {
    console.error(`Optimization strategy: ${optimizeFor}`);
  }
}

async function main() {
  validateEnvironment();

  const { server, registerHandlers } = createMCPServer();
  await registerHandlers(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
