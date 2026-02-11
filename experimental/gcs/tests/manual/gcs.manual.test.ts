import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Manual tests for GCS MCP Server
 *
 * These tests run against real Google Cloud Storage via the MCP server.
 * They exercise the full pipeline: MCP protocol -> tool handler -> GCS client -> GCS API.
 *
 * To run them:
 *
 * 1. Create a .env file in the gcs/ directory with:
 *    GCS_PROJECT_ID=your_project_id
 *    GCS_SERVICE_ACCOUNT_KEY_JSON={"type":"service_account",...}
 *    (or GCS_SERVICE_ACCOUNT_KEY_FILE=/path/to/key.json)
 *
 * 2. Run: npm run test:manual
 *
 * Note: These tests will create and delete real GCS objects and buckets.
 * Use a test GCP project to avoid affecting production data.
 */

// Test bucket name - use a unique prefix to avoid conflicts
const TEST_BUCKET_PREFIX = 'mcp-gcs-test-';
const TEST_BUCKET = `${TEST_BUCKET_PREFIX}${Date.now()}`;

describe('GCS Manual Tests', () => {
  let client: TestMCPClient;
  let bucketCreated = false;

  beforeAll(async () => {
    const projectId = process.env.GCS_PROJECT_ID;
    const keyFileContents = process.env.GCS_SERVICE_ACCOUNT_KEY_JSON;
    const keyFilePath = process.env.GCS_SERVICE_ACCOUNT_KEY_FILE;

    if (!projectId) {
      throw new Error('GCS_PROJECT_ID not configured. Set it in .env file.');
    }

    if (!keyFileContents && !keyFilePath) {
      throw new Error(
        'GCS credentials not configured. Set GCS_SERVICE_ACCOUNT_KEY_JSON or GCS_SERVICE_ACCOUNT_KEY_FILE in .env file.'
      );
    }

    const serverPath = path.join(__dirname, '../../local/build/index.js');
    const env: Record<string, string> = {
      GCS_PROJECT_ID: projectId,
      SKIP_HEALTH_CHECKS: 'true',
    };

    if (keyFileContents) {
      env.GCS_SERVICE_ACCOUNT_KEY_JSON = keyFileContents;
    }
    if (keyFilePath) {
      env.GCS_SERVICE_ACCOUNT_KEY_FILE = keyFilePath;
    }

    client = new TestMCPClient({
      serverPath,
      env,
      debug: false,
    });

    await client.connect();
  });

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  describe('Bucket Operations', () => {
    it('should list buckets', async () => {
      const result = await client.callTool('list_buckets', {});
      expect(result.isError).toBeFalsy();

      const parsed = JSON.parse((result.content[0] as { text: string }).text);
      expect(parsed).toHaveProperty('buckets');
      expect(Array.isArray(parsed.buckets)).toBe(true);
      console.log(`Found ${parsed.buckets.length} buckets`);
    });

    it('should create a test bucket', async () => {
      const result = await client.callTool('create_bucket', { bucket: TEST_BUCKET });
      expect(result.isError).toBeFalsy();

      const parsed = JSON.parse((result.content[0] as { text: string }).text);
      expect(parsed.success).toBe(true);
      bucketCreated = true;

      // Verify bucket exists
      const headResult = await client.callTool('head_bucket', { bucket: TEST_BUCKET });
      expect(headResult.isError).toBeFalsy();
      const headParsed = JSON.parse((headResult.content[0] as { text: string }).text);
      expect(headParsed.exists).toBe(true);
      console.log(`Created test bucket: ${TEST_BUCKET}`);
    });

    it('should check if bucket exists', async () => {
      if (!bucketCreated) {
        console.log('Skipping - bucket not created');
        return;
      }

      const result = await client.callTool('head_bucket', { bucket: TEST_BUCKET });
      expect(result.isError).toBeFalsy();

      const parsed = JSON.parse((result.content[0] as { text: string }).text);
      expect(parsed.exists).toBe(true);
    });
  });

  describe('Object Operations', () => {
    const testKey = 'test-folder/test-file.json';
    const testContent = JSON.stringify({
      message: 'Hello from MCP GCS test',
      timestamp: Date.now(),
    });

    it('should put an object', async () => {
      if (!bucketCreated) {
        console.log('Skipping - bucket not created');
        return;
      }

      const result = await client.callTool('put_object', {
        bucket: TEST_BUCKET,
        key: testKey,
        content: testContent,
        contentType: 'application/json',
      });
      expect(result.isError).toBeFalsy();

      const parsed = JSON.parse((result.content[0] as { text: string }).text);
      expect(parsed.success).toBe(true);
      console.log(`Put object: ${testKey}`);
    });

    it('should list objects', async () => {
      if (!bucketCreated) {
        console.log('Skipping - bucket not created');
        return;
      }

      const result = await client.callTool('list_objects', {
        bucket: TEST_BUCKET,
        prefix: 'test-folder/',
      });
      expect(result.isError).toBeFalsy();

      const parsed = JSON.parse((result.content[0] as { text: string }).text);
      expect(parsed).toHaveProperty('objects');
      expect(parsed.objects.length).toBeGreaterThan(0);
      expect(parsed.objects.some((obj: { key: string }) => obj.key === testKey)).toBe(true);
      console.log(`Listed ${parsed.objects.length} objects with prefix 'test-folder/'`);
    });

    it('should get an object', async () => {
      if (!bucketCreated) {
        console.log('Skipping - bucket not created');
        return;
      }

      const result = await client.callTool('get_object', {
        bucket: TEST_BUCKET,
        key: testKey,
      });
      expect(result.isError).toBeFalsy();

      const parsed = JSON.parse((result.content[0] as { text: string }).text);
      expect(parsed).toHaveProperty('content');
      expect(parsed.contentType).toBe('application/json');
      const content = JSON.parse(parsed.content);
      expect(content.message).toBe('Hello from MCP GCS test');
      console.log(`Got object: ${testKey}`);
    });

    it('should copy an object', async () => {
      if (!bucketCreated) {
        console.log('Skipping - bucket not created');
        return;
      }

      const destKey = 'test-folder/copied-file.json';
      const result = await client.callTool('copy_object', {
        sourceBucket: TEST_BUCKET,
        sourceKey: testKey,
        destBucket: TEST_BUCKET,
        destKey: destKey,
      });
      expect(result.isError).toBeFalsy();

      const parsed = JSON.parse((result.content[0] as { text: string }).text);
      expect(parsed.success).toBe(true);
      console.log(`Copied object to: ${destKey}`);

      // Cleanup copied file
      await client.callTool('delete_object', { bucket: TEST_BUCKET, key: destKey });
    });

    it('should delete an object', async () => {
      if (!bucketCreated) {
        console.log('Skipping - bucket not created');
        return;
      }

      const result = await client.callTool('delete_object', {
        bucket: TEST_BUCKET,
        key: testKey,
      });
      expect(result.isError).toBeFalsy();

      // Verify object is deleted by trying to list it
      const listResult = await client.callTool('list_objects', {
        bucket: TEST_BUCKET,
        prefix: testKey,
      });
      expect(listResult.isError).toBeFalsy();
      const parsed = JSON.parse((listResult.content[0] as { text: string }).text);
      expect(parsed.objects.length).toBe(0);
      console.log(`Deleted object: ${testKey}`);
    });
  });

  describe('Cleanup', () => {
    it('should delete the test bucket', async () => {
      if (!bucketCreated) {
        console.log('Skipping - bucket not created');
        return;
      }

      // First make sure bucket is empty
      const listResult = await client.callTool('list_objects', { bucket: TEST_BUCKET });
      expect(listResult.isError).toBeFalsy();
      const parsed = JSON.parse((listResult.content[0] as { text: string }).text);

      for (const obj of parsed.objects) {
        await client.callTool('delete_object', { bucket: TEST_BUCKET, key: obj.key });
      }

      const deleteResult = await client.callTool('delete_bucket', { bucket: TEST_BUCKET });
      expect(deleteResult.isError).toBeFalsy();

      // Verify bucket is deleted
      const headResult = await client.callTool('head_bucket', { bucket: TEST_BUCKET });
      expect(headResult.isError).toBeFalsy();
      const headParsed = JSON.parse((headResult.content[0] as { text: string }).text);
      expect(headParsed.exists).toBe(false);
      console.log(`Deleted test bucket: ${TEST_BUCKET}`);
    });
  });
});
