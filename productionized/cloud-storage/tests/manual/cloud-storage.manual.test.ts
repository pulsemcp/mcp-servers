import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Manual tests that hit real GCS APIs.
 * These tests are NOT run in CI and require actual GCS credentials.
 *
 * To run these tests:
 * 1. Set up your .env file with required credentials (GCS_BUCKET, GCS_KEY_FILE)
 * 2. Run: npm run test:manual
 *
 * Test outcomes:
 * - SUCCESS: Test passed, GCS responded as expected
 * - WARNING: Test passed but with unexpected behavior worth investigating
 * - FAILURE: Test failed, GCS error or unexpected response
 */

type TestOutcome = 'SUCCESS' | 'WARNING' | 'FAILURE';

function reportOutcome(testName: string, outcome: TestOutcome, details?: string) {
  const emoji = outcome === 'SUCCESS' ? '✅' : outcome === 'WARNING' ? '⚠️' : '❌';
  console.log(`\n${emoji} ${testName}: ${outcome}`);
  if (details) {
    console.log(`   Details: ${details}`);
  }
}

describe('Cloud Storage Manual Tests', () => {
  let client: TestMCPClient | null = null;
  let bucket: string | undefined;
  let testPrefix: string;

  beforeAll(() => {
    bucket = process.env.GCS_BUCKET;
    testPrefix = `manual-test-${Date.now()}/`;

    if (!bucket) {
      console.warn('⚠️  GCS_BUCKET not set in environment. Tests will be skipped.');
    }
  });

  afterAll(async () => {
    if (client) {
      // Clean up test files
      try {
        const searchResult = await client.callTool('search_files', {
          prefix: testPrefix,
        });
        const response = JSON.parse((searchResult.content as Array<{ text: string }>)[0].text);
        if (response.success && response.files) {
          for (const file of response.files) {
            await client.callTool('delete_file', { path: file.path });
          }
        }
      } catch {
        // Ignore cleanup errors
      }
      await client.close();
      client = null;
    }
  });

  describe('save_file', () => {
    it('should save a text file to GCS', async () => {
      const testName = 'save_file - text content';

      if (!bucket) {
        reportOutcome(testName, 'WARNING', 'Skipped - no GCS credentials');
        return;
      }

      try {
        client = await createRealGCSClient();
        const testPath = `${testPrefix}test-file.txt`;

        const result = await client.callTool('save_file', {
          path: testPath,
          content: 'Hello from manual test!',
          content_type: 'text/plain',
        });

        const response = JSON.parse((result.content as Array<{ text: string }>)[0].text);
        expect(response.success).toBe(true);
        expect(response.file.path).toBe(testPath);

        reportOutcome(testName, 'SUCCESS', `Saved file to ${testPath}`);
      } catch (error) {
        reportOutcome(
          testName,
          'FAILURE',
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    });

    it('should save a JSON file with metadata', async () => {
      const testName = 'save_file - JSON with metadata';

      if (!bucket) {
        reportOutcome(testName, 'WARNING', 'Skipped - no GCS credentials');
        return;
      }

      try {
        if (!client) {
          client = await createRealGCSClient();
        }
        const testPath = `${testPrefix}config.json`;

        const result = await client.callTool('save_file', {
          path: testPath,
          content: JSON.stringify({ test: true, timestamp: Date.now() }),
          content_type: 'application/json',
          metadata: { source: 'manual-test', version: '1.0' },
        });

        const response = JSON.parse((result.content as Array<{ text: string }>)[0].text);
        expect(response.success).toBe(true);
        expect(response.file.contentType).toBe('application/json');

        reportOutcome(testName, 'SUCCESS', 'Saved JSON with custom metadata');
      } catch (error) {
        reportOutcome(
          testName,
          'FAILURE',
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    });
  });

  describe('get_file', () => {
    it('should retrieve a saved file', async () => {
      const testName = 'get_file - retrieve text';

      if (!bucket) {
        reportOutcome(testName, 'WARNING', 'Skipped - no GCS credentials');
        return;
      }

      try {
        if (!client) {
          client = await createRealGCSClient();
        }
        const testPath = `${testPrefix}test-file.txt`;

        const result = await client.callTool('get_file', {
          path: testPath,
        });

        const response = JSON.parse((result.content as Array<{ text: string }>)[0].text);
        expect(response.success).toBe(true);
        expect(response.content).toBe('Hello from manual test!');

        reportOutcome(testName, 'SUCCESS', 'Retrieved file content correctly');
      } catch (error) {
        reportOutcome(
          testName,
          'FAILURE',
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    });
  });

  describe('search_files', () => {
    it('should list files with prefix filter', async () => {
      const testName = 'search_files - prefix filter';

      if (!bucket) {
        reportOutcome(testName, 'WARNING', 'Skipped - no GCS credentials');
        return;
      }

      try {
        if (!client) {
          client = await createRealGCSClient();
        }

        const result = await client.callTool('search_files', {
          prefix: testPrefix,
        });

        const response = JSON.parse((result.content as Array<{ text: string }>)[0].text);
        expect(response.success).toBe(true);
        expect(response.files.length).toBeGreaterThanOrEqual(2);

        reportOutcome(testName, 'SUCCESS', `Found ${response.files.length} files with prefix`);
      } catch (error) {
        reportOutcome(
          testName,
          'FAILURE',
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    });

    it('should respect limit parameter', async () => {
      const testName = 'search_files - limit';

      if (!bucket) {
        reportOutcome(testName, 'WARNING', 'Skipped - no GCS credentials');
        return;
      }

      try {
        if (!client) {
          client = await createRealGCSClient();
        }

        const result = await client.callTool('search_files', {
          prefix: testPrefix,
          limit: 1,
        });

        const response = JSON.parse((result.content as Array<{ text: string }>)[0].text);
        expect(response.success).toBe(true);
        expect(response.files.length).toBe(1);

        reportOutcome(testName, 'SUCCESS', 'Limit parameter works correctly');
      } catch (error) {
        reportOutcome(
          testName,
          'FAILURE',
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    });
  });

  describe('delete_file', () => {
    it('should delete a file', async () => {
      const testName = 'delete_file';

      if (!bucket) {
        reportOutcome(testName, 'WARNING', 'Skipped - no GCS credentials');
        return;
      }

      try {
        if (!client) {
          client = await createRealGCSClient();
        }
        const testPath = `${testPrefix}to-delete.txt`;

        // First create a file to delete
        await client.callTool('save_file', {
          path: testPath,
          content: 'Delete me',
        });

        // Delete the file
        const result = await client.callTool('delete_file', {
          path: testPath,
        });

        const response = JSON.parse((result.content as Array<{ text: string }>)[0].text);
        expect(response.success).toBe(true);

        // Verify it's gone
        const getResult = await client.callTool('get_file', { path: testPath });
        expect(getResult.isError).toBe(true);

        reportOutcome(testName, 'SUCCESS', 'File deleted successfully');
      } catch (error) {
        reportOutcome(
          testName,
          'FAILURE',
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    });
  });

  describe('Resources', () => {
    it('should list files as resources', async () => {
      const testName = 'resources - list files';

      if (!bucket) {
        reportOutcome(testName, 'WARNING', 'Skipped - no GCS credentials');
        return;
      }

      try {
        if (!client) {
          client = await createRealGCSClient();
        }

        const resources = await client.listResources();
        expect(resources.length).toBeGreaterThanOrEqual(1);

        // Should have config resource
        const configResource = resources.find((r) => r.uri === 'cloud-storage://config');
        expect(configResource).toBeDefined();

        reportOutcome(testName, 'SUCCESS', `Listed ${resources.length} resources`);
      } catch (error) {
        reportOutcome(
          testName,
          'FAILURE',
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    });
  });
});

async function createRealGCSClient(): Promise<TestMCPClient> {
  const serverPath = path.join(__dirname, '../../local/build/index.js');

  const client = new TestMCPClient({
    serverPath,
    env: {
      GCS_BUCKET: process.env.GCS_BUCKET!,
      GCS_PROJECT_ID: process.env.GCS_PROJECT_ID,
      GCS_KEY_FILE: process.env.GCS_KEY_FILE,
      GCS_ROOT_DIRECTORY: process.env.GCS_ROOT_DIRECTORY,
      SKIP_HEALTH_CHECKS: 'false',
    },
    debug: false,
  });

  await client.connect();
  return client;
}
