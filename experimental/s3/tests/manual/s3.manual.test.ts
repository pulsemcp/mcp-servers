import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Manual tests for S3 MCP Server
 *
 * These tests run against real AWS S3 via the MCP server.
 * They exercise the full pipeline: MCP protocol -> tool handler -> S3 client -> AWS S3 API.
 *
 * To run them:
 *
 * 1. Create a .env file in the s3/ directory with:
 *    AWS_ACCESS_KEY_ID=your_access_key
 *    AWS_SECRET_ACCESS_KEY=your_secret_key
 *    AWS_REGION=us-east-1
 *
 * 2. Run: npm run test:manual
 *
 * Note: These tests will create and delete real S3 objects and buckets.
 * Use a test AWS account or bucket to avoid affecting production data.
 */

// Test bucket name - use a unique prefix to avoid conflicts
const TEST_BUCKET_PREFIX = 'mcp-s3-test-';
const TEST_BUCKET = `${TEST_BUCKET_PREFIX}${Date.now()}`;

describe('S3 Manual Tests', () => {
  let client: TestMCPClient;
  let bucketCreated = false;

  beforeAll(async () => {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || 'us-east-1';

    if (!accessKeyId || !secretAccessKey) {
      throw new Error(
        'AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.'
      );
    }

    const serverPath = path.join(__dirname, '../../local/build/index.js');
    const env: Record<string, string> = {
      AWS_ACCESS_KEY_ID: accessKeyId,
      AWS_SECRET_ACCESS_KEY: secretAccessKey,
      AWS_REGION: region,
      SKIP_HEALTH_CHECKS: 'true',
    };

    if (process.env.S3_FORCE_PATH_STYLE) {
      env.S3_FORCE_PATH_STYLE = process.env.S3_FORCE_PATH_STYLE;
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
      message: 'Hello from MCP S3 test',
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
      expect(content.message).toBe('Hello from MCP S3 test');
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
