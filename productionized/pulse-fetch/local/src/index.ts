#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from '../shared/index.js';
import { runHealthChecks } from '../shared/healthcheck.js';

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
  if (process.env.BRIGHTDATA_API_KEY) available.push('BrightData');

  console.error(
    `Pulse Fetch starting with services: native${available.length > 0 ? ', ' + available.join(', ') : ''}`
  );

  if (optimizeFor) {
    console.error(`Optimization strategy: ${optimizeFor}`);
  }
}

async function main() {
  validateEnvironment();

  // Run health checks if SKIP_HEALTH_CHECKS is not set
  if (process.env.SKIP_HEALTH_CHECKS !== 'true') {
    console.error('Running authentication health checks...');
    const healthResults = await runHealthChecks();

    const failedChecks = healthResults.filter((result) => !result.success);
    if (failedChecks.length > 0) {
      console.error('\nAuthentication health check failures:');
      failedChecks.forEach(({ service, error }) => {
        console.error(`  ${service}: ${error}`);
      });
      console.error('\nTo skip health checks, set SKIP_HEALTH_CHECKS=true');
      process.exit(1);
    }

    const successfulChecks = healthResults.filter((result) => result.success);
    if (successfulChecks.length > 0) {
      console.error('Health checks passed for:', successfulChecks.map((r) => r.service).join(', '));
    }
  }

  const { server, registerHandlers } = createMCPServer();
  await registerHandlers(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
