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
 * Manual Tests for search_mcp_implementations Tool
 *
 * These tests hit the real PulseMCP API to verify the search_mcp_implementations tool works correctly.
 *
 * API Endpoint: GET https://admin.pulsemcp.com/api/implementations/search
 * Required Headers: X-API-Key: <admin-api-key>
 *
 * Query Parameters:
 *   q: Search query string (required)
 *   type: "server" | "client" (optional, omit for all)
 *   status: "draft" | "live" | "archived" (optional, omit for live only)
 *   limit: number (optional, 1-100, default 30)
 *   offset: number (optional, default 0)
 *
 * Expected Response (when implemented):
 * {
 *   "implementations": [
 *     {
 *       "id": number,
 *       "name": string,
 *       "slug": string,
 *       "type": "server" | "client",
 *       "status": "draft" | "live" | "archived",
 *       "short_description": string,
 *       "description": string,
 *       "classification": "official" | "community" | "reference",
 *       "implementation_language": string,
 *       "github_stars": number,
 *       "provider_name": string,
 *       "url": string,
 *       "mcp_server_id": number | null,
 *       "mcp_client_id": number | null,
 *       "created_at": string,
 *       "updated_at": string
 *     }
 *   ],
 *   "pagination": {
 *     "current_page": number,
 *     "total_pages": number,
 *     "total_count": number,
 *     "has_next": boolean,
 *     "limit": number
 *   }
 * }
 */

describe('search_mcp_implementations - Manual Tests with Real API', () => {
  let client: TestMCPClient;

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

  describe('Basic search functionality', () => {
    it('should search for MCP implementations by query', async () => {
      const result = await client.callTool('search_mcp_implementations', {
        query: 'filesystem',
      });

      // NOTE: This will fail with 404 until the API endpoint is implemented
      // Once implemented, this test should pass and return results
      if (result.isError) {
        expect(result.content[0].text).toMatch(/404|not found|endpoint/i);
        console.log('Expected 404 - API endpoint not yet implemented');
        console.log('Error:', result.content[0].text);
      } else {
        // When API is implemented, verify the response structure
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        const text = result.content[0].text;

        // Should show search results
        expect(text).toMatch(/Found \d+ MCP implementation/);
        expect(text).toContain('filesystem');

        console.log('Search results:', text);
      }
    });

    it('should search for server implementations', async () => {
      const result = await client.callTool('search_mcp_implementations', {
        query: 'database',
        type: 'server',
      });

      if (result.isError) {
        expect(result.content[0].text).toMatch(/404|not found|endpoint/i);
        console.log('Expected 404 - API endpoint not yet implemented');
      } else {
        const text = result.content[0].text;
        expect(text).toMatch(/Found \d+ MCP implementation/);
        // Results should only include servers
        expect(text).toContain('(server)');
        expect(text).not.toContain('(client)');

        console.log('Server search results:', text);
      }
    });

    it('should search for client implementations', async () => {
      const result = await client.callTool('search_mcp_implementations', {
        query: 'claude',
        type: 'client',
      });

      if (result.isError) {
        expect(result.content[0].text).toMatch(/404|not found|endpoint/i);
        console.log('Expected 404 - API endpoint not yet implemented');
      } else {
        const text = result.content[0].text;
        expect(text).toMatch(/Found \d+ MCP implementation/);
        // Results should only include clients
        expect(text).toContain('(client)');
        expect(text).not.toContain('(server)');

        console.log('Client search results:', text);
      }
    });
  });

  describe('Filtering and pagination', () => {
    it('should filter by live status', async () => {
      const result = await client.callTool('search_mcp_implementations', {
        query: 'server',
        status: 'live',
      });

      if (result.isError) {
        expect(result.content[0].text).toMatch(/404|not found|endpoint/i);
        console.log('Expected 404 - API endpoint not yet implemented');
      } else {
        const text = result.content[0].text;
        expect(text).toMatch(/Found \d+ MCP implementation/);
        // All results should be live
        expect(text).toMatch(/Status: live/);

        console.log('Live implementations:', text);
      }
    });

    it('should handle pagination with limit and offset', async () => {
      const result = await client.callTool('search_mcp_implementations', {
        query: 'mcp',
        limit: 5,
        offset: 0,
      });

      if (result.isError) {
        expect(result.content[0].text).toMatch(/404|not found|endpoint/i);
        console.log('Expected 404 - API endpoint not yet implemented');
      } else {
        const text = result.content[0].text;
        expect(text).toMatch(/Found \d+ MCP implementation/);

        // Should indicate pagination if there are more results
        if (text.includes('More results available')) {
          expect(text).toContain('Use offset=5 to see the next page');
        }

        console.log('Paginated results:', text);
      }
    });

    it('should retrieve next page of results', async () => {
      const result = await client.callTool('search_mcp_implementations', {
        query: 'mcp',
        limit: 5,
        offset: 5,
      });

      if (result.isError) {
        expect(result.content[0].text).toMatch(/404|not found|endpoint/i);
        console.log('Expected 404 - API endpoint not yet implemented');
      } else {
        const text = result.content[0].text;
        expect(text).toMatch(/Found \d+ MCP implementation/);

        console.log('Second page results:', text);
      }
    });
  });

  describe('Search result details', () => {
    it('should return comprehensive implementation metadata', async () => {
      const result = await client.callTool('search_mcp_implementations', {
        query: 'official',
        type: 'all',
        status: 'live',
      });

      if (result.isError) {
        expect(result.content[0].text).toMatch(/404|not found|endpoint/i);
        console.log('Expected 404 - API endpoint not yet implemented');
      } else {
        const text = result.content[0].text;

        // When implemented, results should include:
        // - Name and slug
        // - Type (server/client)
        // - Status
        // - Classification (if available)
        // - Provider name (if available)
        // - Implementation language (if available)
        // - GitHub stars (if available)
        // - Short description (if available)
        // - URL (if available)
        // - MCP Server/Client IDs (if available)

        expect(text).toContain('Slug:');
        expect(text).toContain('Status:');

        console.log('Full implementation details:', text);
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle no results found', async () => {
      const result = await client.callTool('search_mcp_implementations', {
        query: 'this-query-should-not-match-anything-xyz123',
      });

      if (result.isError) {
        expect(result.content[0].text).toMatch(/404|not found|endpoint/i);
        console.log('Expected 404 - API endpoint not yet implemented');
      } else {
        const text = result.content[0].text;
        expect(text).toMatch(/Found 0 MCP implementation/);

        console.log('No results case:', text);
      }
    });

    it('should handle very short queries', async () => {
      const result = await client.callTool('search_mcp_implementations', {
        query: 'a',
      });

      if (result.isError) {
        expect(result.content[0].text).toMatch(/404|not found|endpoint/i);
        console.log('Expected 404 - API endpoint not yet implemented');
      } else {
        // Should return results
        expect(result.content[0].type).toBe('text');
        const text = result.content[0].text;
        expect(text).toMatch(/Found \d+ MCP implementation/);

        console.log('Short query results:', text);
      }
    });

    it('should search across multiple fields', async () => {
      const result = await client.callTool('search_mcp_implementations', {
        query: 'anthropic', // Should match provider name
      });

      if (result.isError) {
        expect(result.content[0].text).toMatch(/404|not found|endpoint/i);
        console.log('Expected 404 - API endpoint not yet implemented');
      } else {
        const text = result.content[0].text;
        expect(text).toMatch(/Found \d+ MCP implementation/);
        // Should find implementations where Anthropic is the provider
        expect(text).toContain('Provider:');

        console.log('Provider search results:', text);
      }
    });
  });

  describe('Tool integration', () => {
    it('should be listed in available tools when server_queue toolgroups are enabled', async () => {
      const tools = await client.listTools();

      const toolNames = tools.tools.map((t) => t.name);
      expect(toolNames).toContain('search_mcp_implementations');

      const searchTool = tools.tools.find((t) => t.name === 'search_mcp_implementations');
      expect(searchTool).toBeDefined();
      expect(searchTool?.description).toContain('Search for MCP implementations');
      expect(searchTool?.inputSchema.required).toContain('query');
    });
  });
});
