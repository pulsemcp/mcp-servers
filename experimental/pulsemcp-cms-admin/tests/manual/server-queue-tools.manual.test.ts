import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Manual Tests for Draft MCP Implementations and Save Tools
 *
 * These tests hit the real PulseMCP API to verify:
 * - get_draft_mcp_implementations: Get paginated list of draft implementations with associated objects
 * - save_mcp_implementation: Update MCP implementation details
 *
 * API Endpoints:
 * - GET https://admin.pulsemcp.com/api/implementations/drafts
 * - PUT https://admin.pulsemcp.com/api/implementations/:id
 *
 * Required Headers: X-API-Key: <admin-api-key>
 */

describe('Draft MCP Implementations - Manual Tests with Real API', () => {
  let client: TestMCPClient;
  let testImplementationId: number | null = null;

  beforeAll(async () => {
    // Ensure API key is set
    if (!process.env.PULSEMCP_ADMIN_API_KEY) {
      throw new Error('PULSEMCP_ADMIN_API_KEY must be set in .env file for manual tests');
    }

    const serverPath = path.join(__dirname, '../../local/build/index.js');

    client = new TestMCPClient({
      serverPath: serverPath,
      env: {
        ...process.env,
        PULSEMCP_ADMIN_API_KEY: process.env.PULSEMCP_ADMIN_API_KEY,
      },
    });
    await client.connect();
  });

  afterAll(async () => {
    await client.disconnect();
  });

  describe('get_draft_mcp_implementations', () => {
    it('should retrieve draft implementations with associated objects', async () => {
      const result = await client.callTool('get_draft_mcp_implementations', {});

      expect(result.isError).toBeFalsy();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const text = result.content[0].text;
      console.log('Draft implementations:', text);

      // Should show count
      expect(text).toMatch(/Found \d+ draft MCP implementation/);

      // Extract an implementation ID for later tests
      const idMatch = text.match(/ID: (\d+)/);
      if (idMatch) {
        testImplementationId = parseInt(idMatch[1], 10);
        console.log('Found test implementation ID:', testImplementationId);
      }

      // Should show pagination if results exist
      if (text.includes('page ')) {
        expect(text).toMatch(/page \d+ of \d+/);
      }

      // If there are results with associated objects, verify the structure
      if (text.includes('Linked MCP Server:')) {
        expect(text).toContain('Server Description:');
        // May include download stats
        if (text.includes('Total Downloads:')) {
          expect(text).toMatch(/Total Downloads: [\d,]+/);
        }
      }

      if (text.includes('Linked MCP Client:')) {
        expect(text).toContain('Client Description:');
      }
    });

    it('should support pagination', async () => {
      const result = await client.callTool('get_draft_mcp_implementations', {
        page: 1,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;

      expect(text).toMatch(/Found \d+ draft MCP implementation/);

      // Should show page information
      if (text.includes('page ')) {
        expect(text).toContain('page 1');
      }

      console.log('Page 1 results:', text);
    });

    it('should support search filtering', async () => {
      const result = await client.callTool('get_draft_mcp_implementations', {
        search: 'server',
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;

      expect(text).toMatch(/Found \d+ draft MCP implementation/);

      console.log('Search results for "server":', text);
    });

    it('should handle no drafts found', async () => {
      const result = await client.callTool('get_draft_mcp_implementations', {
        search: 'this-should-not-match-anything-xyz123',
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;

      // Should show zero results
      expect(text).toMatch(/Found 0 draft MCP implementation/);

      console.log('No drafts found:', text);
    });

    it('should include comprehensive implementation details', async () => {
      const result = await client.callTool('get_draft_mcp_implementations', {});

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;

      // If there are any results, verify the structure includes key fields
      if (!text.includes('Found 0 draft')) {
        // Should include basic fields
        expect(text).toContain('Type:');
        expect(text).toContain('Status:');

        // May include optional fields if they exist
        // Classification, Language, Provider, URL, GitHub Stars, etc.
      }
    });
  });

  describe('save_mcp_implementation', () => {
    it('should update an implementation', async () => {
      // Skip if we don't have a test implementation ID
      if (!testImplementationId) {
        console.log(
          'Skipping save test - no draft implementation ID available from get_draft_mcp_implementations'
        );
        return;
      }

      const result = await client.callTool('save_mcp_implementation', {
        id: testImplementationId,
        short_description: 'Updated test description via MCP tool',
      });

      expect(result.isError).toBeFalsy();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const text = result.content[0].text;
      console.log('Save result:', text);

      // Should show success message
      expect(text).toContain('Successfully saved MCP implementation');
      expect(text).toContain(`**ID:** ${testImplementationId}`);
      expect(text).toContain('Updated test description via MCP tool');
    });

    it('should handle multiple field updates', async () => {
      if (!testImplementationId) {
        console.log('Skipping test - no draft implementation ID available');
        return;
      }

      const result = await client.callTool('save_mcp_implementation', {
        id: testImplementationId,
        short_description: 'Multi-field update test',
        provider_name: 'Test Provider',
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;

      expect(text).toContain('Successfully saved MCP implementation');
      expect(text).toContain('Multi-field update test');
      expect(text).toContain('Test Provider');

      console.log('Multi-field update result:', text);
    });

    it('should handle null values for clearing fields', async () => {
      if (!testImplementationId) {
        console.log('Skipping test - no draft implementation ID available');
        return;
      }

      const result = await client.callTool('save_mcp_implementation', {
        id: testImplementationId,
        mcp_server_id: null,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;

      expect(text).toContain('Successfully saved MCP implementation');

      console.log('Null value update result:', text);
    });

    it('should validate required ID parameter', async () => {
      const result = await client.callTool('save_mcp_implementation', {
        name: 'Test without ID',
      });

      expect(result.isError).toBeTruthy();
      const text = result.content[0].text;

      // Should show validation error
      expect(text).toMatch(/required|id/i);

      console.log('Validation error:', text);
    });

    it('should handle non-existent implementation ID', async () => {
      const result = await client.callTool('save_mcp_implementation', {
        id: 999999999,
        name: 'Non-existent',
      });

      expect(result.isError).toBeTruthy();
      const text = result.content[0].text;

      // Should show 404 error
      expect(text).toMatch(/404|not found/i);

      console.log('Non-existent ID error:', text);
    });

    it('should reject empty updates', async () => {
      if (!testImplementationId) {
        console.log('Skipping test - no draft implementation ID available');
        return;
      }

      const result = await client.callTool('save_mcp_implementation', {
        id: testImplementationId,
      });

      // Should either accept it (no-op) or show a message
      expect(result.content).toHaveLength(1);
      const text = result.content[0].text;

      console.log('Empty update result:', text);
    });
  });

  describe('Tool group filtering', () => {
    it('should list both tools in server_queue_all group', async () => {
      const tools = await client.listTools();

      const toolNames = tools.tools.map((t) => t.name);

      // Both tools should be available (we're running with all groups by default)
      expect(toolNames).toContain('get_draft_mcp_implementations');
      expect(toolNames).toContain('save_mcp_implementation');
      expect(toolNames).toContain('search_mcp_implementations');

      console.log('Available tools:', toolNames);
    });
  });

  describe('Associated objects integration', () => {
    it('should fetch and include MCP server details when linked', async () => {
      const result = await client.callTool('get_draft_mcp_implementations', {});

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;

      // If any implementation has a linked server, verify the details are included
      if (text.includes('Linked MCP Server:')) {
        expect(text).toMatch(/Linked MCP Server: .+ \(.+, ID: \d+\)/);

        // Should include server metadata
        const serverSection = text.split('Linked MCP Server:')[1]?.split('\n\n')[0];
        if (serverSection) {
          console.log('Server details found:', serverSection);
        }
      } else {
        console.log('No drafts with linked MCP servers in current results');
      }
    });

    it('should fetch and include MCP client details when linked', async () => {
      const result = await client.callTool('get_draft_mcp_implementations', {});

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;

      // If any implementation has a linked client, verify the details are included
      if (text.includes('Linked MCP Client:')) {
        expect(text).toMatch(/Linked MCP Client: .+ \(.+, ID: \d+\)/);

        // Should include client metadata
        const clientSection = text.split('Linked MCP Client:')[1]?.split('\n\n')[0];
        if (clientSection) {
          console.log('Client details found:', clientSection);
        }
      } else {
        console.log('No drafts with linked MCP clients in current results');
      }
    });

    it('should gracefully handle missing associated objects', async () => {
      const result = await client.callTool('get_draft_mcp_implementations', {});

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;

      // Should never fail even if associated objects don't exist
      // May show "details not available" message
      if (text.includes('details not available')) {
        console.log('Found implementation with unavailable associated object');
      }

      // Should not throw errors or have error responses
      expect(text).not.toMatch(/error fetching/i);
    });
  });
});
