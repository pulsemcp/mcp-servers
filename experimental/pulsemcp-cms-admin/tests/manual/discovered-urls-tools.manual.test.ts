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
 * Manual Tests for Discovered URLs Tools
 *
 * These tests hit the real PulseMCP Admin API (staging) to verify the 3 discovered_urls tools:
 *
 * Read-only tools:
 *   1. list_discovered_urls - List/filter/paginate discovered URLs
 *   2. get_discovered_url_stats - Get summary statistics
 *
 * Write tools:
 *   3. mark_discovered_url_processed - Mark a URL as processed
 *
 * Required Environment:
 *   PULSEMCP_ADMIN_API_KEY: API key for staging
 *   PULSEMCP_ADMIN_API_URL: https://admin.staging.pulsemcp.com (optional)
 */

describe('Discovered URLs Tools - Manual Tests with Real API', () => {
  let client: TestMCPClient;

  // Track data discovered during tests for use in subsequent tests
  let firstUrlId: number | null = null;

  beforeAll(async () => {
    if (!process.env.PULSEMCP_ADMIN_API_KEY) {
      throw new Error('PULSEMCP_ADMIN_API_KEY must be set in .env file for manual tests');
    }

    const serverPath = path.join(__dirname, '../../local/build/index.js');

    const env: Record<string, string> = {
      PULSEMCP_ADMIN_API_KEY: process.env.PULSEMCP_ADMIN_API_KEY!,
      TOOL_GROUPS: 'discovered_urls',
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
    it('should register all 3 discovered_urls tools', async () => {
      const tools = await client.listTools();
      const toolNames = tools.tools.map((t) => t.name);

      expect(toolNames).toContain('list_discovered_urls');
      expect(toolNames).toContain('mark_discovered_url_processed');
      expect(toolNames).toContain('get_discovered_url_stats');
      expect(tools.tools).toHaveLength(3);
    });
  });

  describe('list_discovered_urls', () => {
    it('should list pending discovered URLs (default)', async () => {
      const result = await client.callTool('list_discovered_urls', {});

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      console.log('list_discovered_urls (default):', text.substring(0, 500));
      expect(text).toContain('discovered URLs');
    });

    it('should list with explicit pending status', async () => {
      const result = await client.callTool('list_discovered_urls', {
        status: 'pending',
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      console.log('list_discovered_urls (pending):', text.substring(0, 500));
      expect(text).toContain('discovered URLs');

      // Try to extract the first URL ID for later tests
      const idMatch = text.match(/ID: (\d+)/);
      if (idMatch) {
        firstUrlId = parseInt(idMatch[1], 10);
        console.log('First URL ID found:', firstUrlId);
      }
    });

    it('should list all discovered URLs', async () => {
      const result = await client.callTool('list_discovered_urls', {
        status: 'all',
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      console.log('list_discovered_urls (all):', text.substring(0, 500));
      expect(text).toContain('discovered URLs');
    });

    it('should list processed discovered URLs', async () => {
      const result = await client.callTool('list_discovered_urls', {
        status: 'processed',
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      console.log('list_discovered_urls (processed):', text.substring(0, 500));
      expect(text).toContain('discovered URLs');
    });

    it('should support pagination', async () => {
      const result = await client.callTool('list_discovered_urls', {
        page: 1,
        per_page: 5,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      console.log('list_discovered_urls (paginated):', text.substring(0, 500));
      expect(text).toContain('discovered URLs');
    });

    it('should support page 2', async () => {
      const result = await client.callTool('list_discovered_urls', {
        page: 2,
        per_page: 5,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      console.log('list_discovered_urls (page 2):', text.substring(0, 500));
      expect(text).toContain('discovered URLs');
    });
  });

  describe('get_discovered_url_stats', () => {
    it('should return summary statistics', async () => {
      const result = await client.callTool('get_discovered_url_stats', {});

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      console.log('get_discovered_url_stats:', text);
      expect(text).toContain('Discovered URL Statistics');
      expect(text).toContain('Pending');
      expect(text).toContain('Processed Today');
    });
  });

  describe('mark_discovered_url_processed', () => {
    it('should handle non-existent URL ID', async () => {
      const result = await client.callTool('mark_discovered_url_processed', {
        id: 999999999,
        result: 'skipped',
        notes: 'Test - non-existent URL',
      });

      // Should get an error for non-existent ID
      const text = result.content[0].text;
      console.log('mark_discovered_url_processed (non-existent):', text);
      expect(result.isError).toBe(true);
      expect(text).toContain('not found');
    });

    it('should mark a discovered URL as skipped (if pending URLs exist)', async () => {
      if (!firstUrlId) {
        console.log('No pending URLs found to test mark_discovered_url_processed - skipping');
        return;
      }

      const result = await client.callTool('mark_discovered_url_processed', {
        id: firstUrlId,
        result: 'skipped',
        notes: 'Manual test - skipping for testing purposes',
      });

      const text = result.content[0].text;
      console.log('mark_discovered_url_processed (skipped):', text);

      // The URL should be marked successfully
      expect(result.isError).toBeFalsy();
      expect(text).toContain('Successfully marked');
      expect(text).toContain('skipped');
    });
  });
});
