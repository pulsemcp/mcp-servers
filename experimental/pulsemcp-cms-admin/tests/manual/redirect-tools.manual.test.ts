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
 * Manual Tests for Redirect Tools
 *
 * These tests hit the real PulseMCP API (staging) to verify:
 * - Redirect CRUD operations
 *
 * Required Environment Variables:
 * - PULSEMCP_ADMIN_API_KEY: API key for authentication
 * - PULSEMCP_ADMIN_API_URL: Optional staging URL override
 *
 * Note: Some tests may be skipped if the redirects API endpoint
 * is not yet deployed to the target environment.
 */

describe('Redirect Tools - Manual Tests with Real API', () => {
  let client: TestMCPClient;

  // Track created resources for cleanup
  let createdRedirectId: number | null = null;
  // Track if API is available
  let apiAvailable = false;

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
        PULSEMCP_ADMIN_API_URL:
          process.env.PULSEMCP_ADMIN_API_URL || 'https://staging.pulsemcp.com',
      },
    });
    await client.connect();

    // Check if API is available by trying to list redirects
    const result = await client.callTool('get_redirects', { limit: 1 });
    apiAvailable = !result.isError;
    if (!apiAvailable) {
      console.log('Note: Redirects API endpoint not available yet. Some tests will be skipped.');
      console.log('API response:', result.content[0]?.text);
    }
  });

  afterAll(async () => {
    // Cleanup: Delete created redirect if it still exists
    if (createdRedirectId && client) {
      try {
        await client.callTool('delete_redirect', { id: createdRedirectId });
        console.log('Cleaned up redirect:', createdRedirectId);
      } catch {
        console.log('Could not clean up redirect:', createdRedirectId);
      }
    }

    await client.disconnect();
  });

  describe('Tool Availability', () => {
    it('should list all redirect tools', async () => {
      const tools = await client.listTools();
      const toolNames = tools.tools.map((t) => t.name);

      // Redirects
      expect(toolNames).toContain('get_redirects');
      expect(toolNames).toContain('get_redirect');
      expect(toolNames).toContain('create_redirect');
      expect(toolNames).toContain('update_redirect');
      expect(toolNames).toContain('delete_redirect');

      console.log(
        'All redirect tools available:',
        toolNames.filter((name) => name.includes('redirect'))
      );
    });
  });

  describe('Redirects CRUD Operations', () => {
    it('get_redirects - should list redirects (or skip if API not deployed)', async () => {
      const result = await client.callTool('get_redirects', {});

      console.log('get_redirects result:', JSON.stringify(result, null, 2));

      if (!apiAvailable) {
        console.log('SKIPPED: Redirects API endpoint not deployed yet');
        return;
      }

      expect(result.isError).toBeFalsy();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const text = result.content[0].text;
      console.log('Redirects list:', text.substring(0, 500));

      expect(text).toMatch(/Found \d+ redirect/);
    });

    it('get_redirects - should support search (or skip if API not deployed)', async () => {
      if (!apiAvailable) {
        console.log('SKIPPED: Redirects API endpoint not deployed yet');
        return;
      }

      const result = await client.callTool('get_redirects', {
        q: 'test',
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      console.log('Redirects search results:', text.substring(0, 500));

      expect(text).toMatch(/Found \d+ redirect/);
    });

    it('get_redirects - should support status filter (or skip if API not deployed)', async () => {
      if (!apiAvailable) {
        console.log('SKIPPED: Redirects API endpoint not deployed yet');
        return;
      }

      const result = await client.callTool('get_redirects', {
        status: 'active',
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      console.log('Active redirects:', text.substring(0, 500));

      expect(text).toMatch(/Found \d+ redirect/);
    });

    it('get_redirects - should support pagination (or skip if API not deployed)', async () => {
      if (!apiAvailable) {
        console.log('SKIPPED: Redirects API endpoint not deployed yet');
        return;
      }

      const result = await client.callTool('get_redirects', {
        limit: 5,
        offset: 0,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      console.log('Redirects page 1:', text.substring(0, 500));
    });

    it('create_redirect - should create a new redirect (or skip if API not deployed)', async () => {
      if (!apiAvailable) {
        console.log('SKIPPED: Redirects API endpoint not deployed yet');
        return;
      }

      const testFrom = `/test-from-${Date.now()}`;
      const testTo = `https://example.com/test-to-${Date.now()}`;

      const result = await client.callTool('create_redirect', {
        from: testFrom,
        to: testTo,
        status: 'draft',
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      console.log('Created redirect:', text);

      expect(text).toContain('Successfully created redirect');
      expect(text).toContain(testFrom);

      // Extract ID for subsequent tests and cleanup
      const idMatch = text.match(/\*\*ID:\*\* (\d+)/);
      if (idMatch) {
        createdRedirectId = parseInt(idMatch[1], 10);
        console.log('Created redirect ID:', createdRedirectId);
      }
    });

    it('get_redirect - should get a specific redirect (or skip if API not deployed)', async () => {
      if (!apiAvailable || !createdRedirectId) {
        console.log('SKIPPED: API not deployed or no redirect ID available');
        return;
      }

      const result = await client.callTool('get_redirect', {
        id: createdRedirectId,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      console.log('Redirect details:', text);

      expect(text).toContain('Redirect Details');
      expect(text).toContain(`**ID:** ${createdRedirectId}`);
    });

    it('update_redirect - should update a redirect (or skip if API not deployed)', async () => {
      if (!apiAvailable || !createdRedirectId) {
        console.log('SKIPPED: API not deployed or no redirect ID available');
        return;
      }

      const result = await client.callTool('update_redirect', {
        id: createdRedirectId,
        status: 'active',
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      console.log('Updated redirect:', text);

      expect(text).toContain('Successfully updated redirect');
    });

    it('update_redirect - should update from and to fields (or skip if API not deployed)', async () => {
      if (!apiAvailable || !createdRedirectId) {
        console.log('SKIPPED: API not deployed or no redirect ID available');
        return;
      }

      const newFrom = `/updated-from-${Date.now()}`;
      const newTo = `https://example.com/updated-to-${Date.now()}`;

      const result = await client.callTool('update_redirect', {
        id: createdRedirectId,
        from: newFrom,
        to: newTo,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      console.log('Updated redirect paths:', text);

      expect(text).toContain('Successfully updated redirect');
    });

    it('delete_redirect - should delete a redirect (or skip if API not deployed)', async () => {
      if (!apiAvailable || !createdRedirectId) {
        console.log('SKIPPED: API not deployed or no redirect ID available');
        return;
      }

      const result = await client.callTool('delete_redirect', {
        id: createdRedirectId,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      console.log('Deleted redirect:', text);

      expect(text).toContain('Successfully deleted redirect');

      // Mark as cleaned up
      createdRedirectId = null;
    });
  });

  describe('Error Handling', () => {
    it('get_redirect - should handle non-existent redirect', async () => {
      const result = await client.callTool('get_redirect', {
        id: 999999999,
      });

      expect(result.isError).toBeTruthy();
      const text = result.content[0].text;
      console.log('Non-existent redirect error:', text);

      // Either "not found" or "404" indicates proper error handling
      expect(text.toLowerCase()).toMatch(/not found|404/);
    });

    it('update_redirect - should handle non-existent redirect', async () => {
      const result = await client.callTool('update_redirect', {
        id: 999999999,
        status: 'active',
      });

      expect(result.isError).toBeTruthy();
      const text = result.content[0].text;
      console.log('Update non-existent redirect error:', text);

      // Either "not found" or "404" indicates proper error handling
      expect(text.toLowerCase()).toMatch(/not found|404/);
    });

    it('delete_redirect - should handle non-existent redirect', async () => {
      const result = await client.callTool('delete_redirect', {
        id: 999999999,
      });

      expect(result.isError).toBeTruthy();
      const text = result.content[0].text;
      console.log('Delete non-existent redirect error:', text);

      // Either "not found" or "404" indicates proper error handling
      expect(text.toLowerCase()).toMatch(/not found|404/);
    });
  });
});
