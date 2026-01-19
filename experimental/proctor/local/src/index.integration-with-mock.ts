#!/usr/bin/env node
/**
 * Integration test entry point with mock client
 * This file is used for testing the MCP server with mocked external API calls
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
  IProctorClient,
  ProctorMetadataResponse,
  RunExamParams,
  ExamStreamEntry,
  MachinesResponse,
  CancelExamParams,
  CancelExamResponse,
} from '../shared/index.js';

/**
 * Integration mock implementation of IProctorClient
 */
class IntegrationMockProctorClient implements IProctorClient {
  async getMetadata(): Promise<ProctorMetadataResponse> {
    return {
      runtimes: [
        {
          id: 'v0.0.37',
          name: 'Proctor v0.0.37',
          image: 'registry.fly.io/proctor:v0.0.37',
        },
        {
          id: 'v0.0.36',
          name: 'Proctor v0.0.36',
          image: 'registry.fly.io/proctor:v0.0.36',
        },
      ],
      exams: [
        {
          id: 'proctor-mcp-client-auth-check',
          name: 'Auth Check',
          description: 'Verifies authentication mechanisms',
        },
        {
          id: 'proctor-mcp-client-init-tools-list',
          name: 'Init Tools List',
          description: 'Tests initialization and tool listing',
        },
      ],
    };
  }

  async *runExam(_params: RunExamParams): AsyncGenerator<ExamStreamEntry, void, unknown> {
    yield { type: 'log', data: { time: '2024-01-15T10:30:00Z', message: 'Starting exam...' } };
    yield {
      type: 'log',
      data: { time: '2024-01-15T10:30:01Z', message: 'Initializing MCP client...' },
    };
    yield { type: 'log', data: { time: '2024-01-15T10:30:02Z', message: 'Running tests...' } };
    yield {
      type: 'result',
      data: {
        status: 'passed',
        tests: [
          { name: 'initialization', passed: true },
          { name: 'tools_list', passed: true },
        ],
      },
    };
  }

  async getMachines(): Promise<MachinesResponse> {
    return {
      machines: [
        {
          id: 'machine-123',
          name: 'proctor-exam-1',
          state: 'running',
          region: 'sjc',
          created_at: '2024-01-15T10:30:00Z',
        },
        {
          id: 'machine-456',
          name: 'proctor-exam-2',
          state: 'stopped',
          region: 'iad',
          created_at: '2024-01-15T09:00:00Z',
        },
      ],
    };
  }

  async destroyMachine(_machineId: string): Promise<{ success: boolean }> {
    return { success: true };
  }

  async cancelExam(_params: CancelExamParams): Promise<CancelExamResponse> {
    return {
      success: true,
      message: 'Exam cancelled successfully',
    };
  }
}

async function main() {
  // Create server using factory
  const { server, registerHandlers } = createMCPServer({ version: VERSION });

  // Create mock client for testing
  const mockClient = new IntegrationMockProctorClient();

  // Register all handlers with mock client
  await registerHandlers(server, () => mockClient);

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logServerStart('proctor-mcp-server (integration-mock)');
}

// Run the server
main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
