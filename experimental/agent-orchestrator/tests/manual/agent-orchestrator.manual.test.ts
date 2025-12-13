import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TestOutcome {
  status: 'SUCCESS' | 'WARNING' | 'FAILURE';
  details: {
    searchSessionsWorks: boolean;
    getSessionWorks: boolean;
    getSessionWithLogsWorks: boolean;
    startSessionWorks: boolean;
    actionSessionWorks: boolean;
  };
  warnings: string[];
  errors: string[];
}

/**
 * End-to-end system tests for Agent Orchestrator MCP Server.
 *
 * These tests require:
 * 1. Agent-orchestrator Rails server running at AGENT_ORCHESTRATOR_BASE_URL
 * 2. Valid API key in AGENT_ORCHESTRATOR_API_KEY
 *
 * Test Outcomes:
 * - SUCCESS: Full happy path completed with all assertions passing
 * - WARNING: API integration works but insufficient data to fully validate
 * - FAILURE: Verifiable breakage in the integration
 */
describe('Agent Orchestrator MCP Server - Manual Tests', () => {
  let client: TestMCPClient;
  let testSessionId: number | null = null;
  const outcome: TestOutcome = {
    status: 'SUCCESS',
    details: {
      searchSessionsWorks: false,
      getSessionWorks: false,
      getSessionWithLogsWorks: false,
      startSessionWorks: false,
      actionSessionWorks: false,
    },
    warnings: [],
    errors: [],
  };

  beforeAll(async () => {
    if (!process.env.AGENT_ORCHESTRATOR_API_KEY) {
      throw new Error('Manual tests require AGENT_ORCHESTRATOR_API_KEY environment variable');
    }
    if (!process.env.AGENT_ORCHESTRATOR_BASE_URL) {
      throw new Error('Manual tests require AGENT_ORCHESTRATOR_BASE_URL environment variable');
    }

    const serverPath = path.join(__dirname, '../../local/build/index.js');
    client = new TestMCPClient({
      serverPath,
      env: {
        AGENT_ORCHESTRATOR_API_KEY: process.env.AGENT_ORCHESTRATOR_API_KEY,
        AGENT_ORCHESTRATOR_BASE_URL: process.env.AGENT_ORCHESTRATOR_BASE_URL,
      },
      debug: false,
    });

    await client.connect();
  });

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }

    // Log final outcome summary
    console.log('\n=== TEST OUTCOME SUMMARY ===');
    console.log(`Status: ${outcome.status}`);
    console.log('Details:', JSON.stringify(outcome.details, null, 2));
    if (outcome.warnings.length > 0) {
      console.log('Warnings:', outcome.warnings);
    }
    if (outcome.errors.length > 0) {
      console.log('Errors:', outcome.errors);
    }
  });

  describe('Tool Registration', () => {
    it('should register exactly 4 tools', async () => {
      const result = await client.listTools();
      const tools = result.tools;

      expect(tools.length).toBe(4);

      const toolNames = tools.map((t: { name: string }) => t.name);
      expect(toolNames).toContain('search_sessions');
      expect(toolNames).toContain('get_session');
      expect(toolNames).toContain('start_session');
      expect(toolNames).toContain('action_session');
    });
  });

  describe('search_sessions', () => {
    it('should list all sessions', async () => {
      const result = await client.callTool('search_sessions', {});

      expect(result.isError).toBe(false);
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const text = result.content[0].text as string;
      // Should return markdown formatted session list
      expect(text).toContain('Sessions');

      outcome.details.searchSessionsWorks = true;
    });

    it('should filter sessions by status', async () => {
      const result = await client.callTool('search_sessions', {
        status: 'running',
      });

      expect(result.isError).toBe(false);
      expect(result.content).toBeDefined();

      const text = result.content[0].text as string;
      // Should either contain running sessions or indicate no results
      expect(text.length).toBeGreaterThan(0);
    });

    it('should search sessions by query', async () => {
      const result = await client.callTool('search_sessions', {
        query: 'agent',
        search_contents: true,
      });

      expect(result.isError).toBe(false);
      expect(result.content).toBeDefined();
    });

    it('should get a specific session by ID', async () => {
      // First get a list of sessions to find a valid ID
      const listResult = await client.callTool('search_sessions', {});
      const listText = listResult.content[0].text as string;

      // Extract first session ID from the markdown output (format: "### Title (ID: 123)")
      const idMatch = listText.match(/\(ID: (\d+)\)/);
      if (idMatch) {
        testSessionId = parseInt(idMatch[1], 10);

        const result = await client.callTool('search_sessions', {
          id: testSessionId,
        });

        expect(result.isError).toBe(false);
        expect(result.content[0].text).toContain(`ID: ${testSessionId}`);
      } else {
        outcome.warnings.push('No sessions found to test ID lookup');
      }
    });
  });

  describe('get_session', () => {
    it('should get detailed session info', async () => {
      if (!testSessionId) {
        // Get a session ID first
        const listResult = await client.callTool('search_sessions', {});
        const listText = listResult.content[0].text as string;
        const idMatch = listText.match(/\(ID: (\d+)\)/);
        if (idMatch) {
          testSessionId = parseInt(idMatch[1], 10);
        }
      }

      if (testSessionId) {
        const result = await client.callTool('get_session', {
          id: testSessionId,
        });

        expect(result.isError).toBe(false);
        expect(result.content).toBeDefined();

        const text = result.content[0].text as string;
        // Output format is "## Session: Title" with "### Basic Information" section
        expect(text).toContain('## Session:');
        expect(text).toContain(`ID:** ${testSessionId}`);

        outcome.details.getSessionWorks = true;
      } else {
        outcome.warnings.push('No sessions available to test get_session');
      }
    });

    it('should get session with transcript', async () => {
      if (testSessionId) {
        const result = await client.callTool('get_session', {
          id: testSessionId,
          include_transcript: true,
        });

        expect(result.isError).toBe(false);
        const text = result.content[0].text as string;
        // Session header should be present
        expect(text).toContain('## Session:');
      }
    });

    it('should get session with logs', async () => {
      if (testSessionId) {
        const result = await client.callTool('get_session', {
          id: testSessionId,
          include_logs: true,
          logs_per_page: 5,
        });

        expect(result.isError).toBe(false);
        const text = result.content[0].text as string;
        // Logs section should be present
        expect(text.length).toBeGreaterThan(0);

        outcome.details.getSessionWithLogsWorks = true;
      }
    });

    it('should get session with subagent transcripts', async () => {
      if (testSessionId) {
        const result = await client.callTool('get_session', {
          id: testSessionId,
          include_subagent_transcripts: true,
          transcripts_per_page: 5,
        });

        expect(result.isError).toBe(false);
        const text = result.content[0].text as string;
        expect(text.length).toBeGreaterThan(0);
      }
    });

    it('should handle non-existent session gracefully', async () => {
      const result = await client.callTool('get_session', {
        id: 999999999,
      });

      // Should return an error response, not crash
      expect(result.content).toBeDefined();
      // The API should return a 404 or similar error
      if (result.isError) {
        expect(result.content[0].text).toContain('Error');
      }
    });
  });

  describe('start_session', () => {
    it('should create a new session (clone-only mode)', async () => {
      // Create a test session without a prompt (clone-only)
      const result = await client.callTool('start_session', {
        title: `MCP Manual Test Session ${Date.now()}`,
        git_root: 'https://github.com/pulsemcp/mcp-servers.git',
        branch: 'main',
      });

      expect(result.isError).toBe(false);
      expect(result.content).toBeDefined();

      const text = result.content[0].text as string;
      // Should indicate session was created
      expect(text).toContain('Session');

      // Extract created session ID for cleanup
      const idMatch = text.match(/ID:\*?\*? (\d+)/);
      if (idMatch) {
        const createdSessionId = parseInt(idMatch[1], 10);
        outcome.details.startSessionWorks = true;

        // Archive the test session to clean up
        await client.callTool('action_session', {
          session_id: createdSessionId,
          action: 'archive',
        });
      }
    });
  });

  describe('action_session', () => {
    let actionTestSessionId: number | null = null;

    it('should create a session for action testing', async () => {
      const result = await client.callTool('start_session', {
        title: `Action Test Session ${Date.now()}`,
        git_root: 'https://github.com/pulsemcp/mcp-servers.git',
        branch: 'main',
      });

      expect(result.isError).toBe(false);
      const text = result.content[0].text as string;
      const idMatch = text.match(/ID:\*?\*? (\d+)/);
      if (idMatch) {
        actionTestSessionId = parseInt(idMatch[1], 10);
      }
    });

    it('should archive a session', async () => {
      if (actionTestSessionId) {
        const result = await client.callTool('action_session', {
          session_id: actionTestSessionId,
          action: 'archive',
        });

        expect(result.isError).toBe(false);
        const text = result.content[0].text as string;
        expect(text).toContain('Archived');

        outcome.details.actionSessionWorks = true;
      }
    });

    it('should unarchive a session', async () => {
      if (actionTestSessionId) {
        const result = await client.callTool('action_session', {
          session_id: actionTestSessionId,
          action: 'unarchive',
        });

        expect(result.isError).toBe(false);
        const text = result.content[0].text as string;
        expect(text).toContain('Unarchived');
      }
    });

    it('should require prompt for follow_up action', async () => {
      if (actionTestSessionId) {
        const result = await client.callTool('action_session', {
          session_id: actionTestSessionId,
          action: 'follow_up',
          // Missing prompt - should error
        });

        expect(result.isError).toBe(true);
        const text = result.content[0].text as string;
        expect(text).toContain('prompt');
      }
    });

    it('should clean up test session', async () => {
      if (actionTestSessionId) {
        // Archive to clean up
        await client.callTool('action_session', {
          session_id: actionTestSessionId,
          action: 'archive',
        });
      }
    });
  });

  describe('Resources', () => {
    it('should list config resource', async () => {
      const result = await client.listResources();
      const resources = result.resources;

      expect(resources.length).toBe(1);
      expect(resources[0].uri).toBe('agent-orchestrator://config');
    });

    it('should read config resource', async () => {
      const result = await client.readResource('agent-orchestrator://config');

      expect(result.contents).toBeDefined();
      expect(result.contents[0].uri).toBe('agent-orchestrator://config');
      expect(result.contents[0].mimeType).toBe('application/json');

      const config = JSON.parse(result.contents[0].text as string);
      expect(config.server.name).toBe('agent-orchestrator-mcp-server');
    });
  });
});
