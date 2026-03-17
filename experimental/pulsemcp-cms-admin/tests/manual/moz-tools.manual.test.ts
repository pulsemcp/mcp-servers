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
 * Manual Tests for MOZ Tools
 *
 * These tests hit the real PulseMCP Admin API (staging) to verify the 3 moz tools:
 *
 * Read-only tools (all moz tools are read-only):
 *   1. get_moz_metrics - Fetch live URL metrics from the MOZ API
 *   2. get_moz_backlinks - Fetch live backlink data from the MOZ API
 *   3. get_moz_stored_metrics - List stored/historical MOZ data for a server's canonicals
 *
 * Required Environment:
 *   PULSEMCP_ADMIN_API_KEY: API key for staging
 *   PULSEMCP_ADMIN_API_URL: https://admin.staging.pulsemcp.com (optional)
 */

describe('MOZ Tools - Manual Tests with Real API', () => {
  let client: TestMCPClient;

  beforeAll(async () => {
    if (!process.env.PULSEMCP_ADMIN_API_KEY) {
      throw new Error('PULSEMCP_ADMIN_API_KEY must be set in .env file for manual tests');
    }

    const serverPath = path.join(__dirname, '../../local/build/index.js');

    const env: Record<string, string> = {
      PULSEMCP_ADMIN_API_KEY: process.env.PULSEMCP_ADMIN_API_KEY!,
      TOOL_GROUPS: 'moz',
    };
    if (process.env.PULSEMCP_ADMIN_API_URL) {
      env.PULSEMCP_ADMIN_API_URL = process.env.PULSEMCP_ADMIN_API_URL;
    }

    client = new TestMCPClient({
      serverPath: serverPath,
      env,
    });
    await client.connect();
  });

  afterAll(async () => {
    await client.disconnect();
  });

  describe('Tool Availability', () => {
    it('should register all 3 moz tools', async () => {
      const tools = await client.listTools();
      const toolNames = tools.tools.map((t) => t.name);

      expect(toolNames).toContain('get_moz_metrics');
      expect(toolNames).toContain('get_moz_backlinks');
      expect(toolNames).toContain('get_moz_stored_metrics');
      expect(tools.tools).toHaveLength(3);
    });
  });

  describe('get_moz_metrics', () => {
    it('should fetch live MOZ metrics for a URL', async () => {
      const result = await client.callTool('get_moz_metrics', {
        url: 'https://github.com',
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      console.log('get_moz_metrics (github.com):', text);
      expect(text).toContain('MOZ Metrics');
      expect(text).toContain('github.com');
    });

    it('should fetch metrics with domain scope', async () => {
      const result = await client.callTool('get_moz_metrics', {
        url: 'https://github.com',
        scope: 'domain',
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      console.log('get_moz_metrics (domain scope):', text);
      expect(text).toContain('MOZ Metrics');
    });

    it('should handle invalid URL gracefully', async () => {
      const result = await client.callTool('get_moz_metrics', {
        url: 'not-a-valid-url',
      });

      const text = result.content[0].text;
      console.log('get_moz_metrics (invalid URL):', text);
      // May return error or metrics depending on how the API handles it
    });
  });

  describe('get_moz_backlinks', () => {
    it('should fetch backlinks for a URL', async () => {
      const result = await client.callTool('get_moz_backlinks', {
        url: 'https://github.com',
        limit: 3,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      console.log('get_moz_backlinks (github.com):', text.substring(0, 500));
      expect(text).toContain('MOZ Backlinks');
    });

    it('should fetch backlinks with domain scope', async () => {
      const result = await client.callTool('get_moz_backlinks', {
        url: 'https://github.com',
        scope: 'domain',
        limit: 2,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      console.log('get_moz_backlinks (domain scope):', text.substring(0, 500));
      expect(text).toContain('MOZ Backlinks');
    });
  });

  describe('get_moz_stored_metrics', () => {
    it('should fetch stored metrics for a server by slug', async () => {
      // Use a well-known server slug that likely has stored data
      const result = await client.callTool('get_moz_stored_metrics', {
        server_id: 'modelcontextprotocol-filesystem',
      });

      const text = result.content[0].text;
      console.log('get_moz_stored_metrics (by slug):', text.substring(0, 500));
      // May return data or empty depending on staging state
      expect(text).toContain('Stored MOZ Metrics');
    });

    it('should handle non-existent server gracefully', async () => {
      const result = await client.callTool('get_moz_stored_metrics', {
        server_id: 'nonexistent-server-slug-12345',
      });

      const text = result.content[0].text;
      console.log('get_moz_stored_metrics (nonexistent):', text);
      // Should get a "not found" error
      expect(result.isError).toBe(true);
      expect(text).toContain('not found');
    });

    it('should support pagination', async () => {
      const result = await client.callTool('get_moz_stored_metrics', {
        server_id: 'modelcontextprotocol-filesystem',
        limit: 5,
        offset: 0,
      });

      const text = result.content[0].text;
      console.log('get_moz_stored_metrics (paginated):', text.substring(0, 500));
      expect(text).toContain('Stored MOZ Metrics');
    });
  });
});
