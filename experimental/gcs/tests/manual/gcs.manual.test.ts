import { describe, it, expect, beforeAll } from 'vitest';
import { GoogleCloudStorageClient } from '../../shared/src/gcs-client/gcs-client.js';

/**
 * Manual tests for GCS MCP Server
 *
 * These tests run against real Google Cloud Storage. To run them:
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
  let client: GoogleCloudStorageClient;
  let bucketCreated = false;

  beforeAll(() => {
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

    client = new GoogleCloudStorageClient({
      projectId,
      keyFileContents,
      keyFilePath,
    });
  });

  describe('Bucket Operations', () => {
    it('should list buckets', async () => {
      const result = await client.listBuckets();

      expect(result).toHaveProperty('buckets');
      expect(Array.isArray(result.buckets)).toBe(true);
      console.log(`Found ${result.buckets.length} buckets`);
    });

    it('should create a test bucket', async () => {
      await client.createBucket(TEST_BUCKET);
      bucketCreated = true;

      // Verify bucket exists
      const exists = await client.headBucket(TEST_BUCKET);
      expect(exists).toBe(true);
      console.log(`Created test bucket: ${TEST_BUCKET}`);
    });

    it('should check if bucket exists', async () => {
      if (!bucketCreated) {
        console.log('Skipping - bucket not created');
        return;
      }

      const exists = await client.headBucket(TEST_BUCKET);
      expect(exists).toBe(true);
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

      const result = await client.putObject(TEST_BUCKET, testKey, testContent, {
        contentType: 'application/json',
        metadata: { 'test-metadata': 'test-value' },
      });

      expect(result).toHaveProperty('etag');
      console.log(`Put object: ${testKey}`);
    });

    it('should list objects', async () => {
      if (!bucketCreated) {
        console.log('Skipping - bucket not created');
        return;
      }

      const result = await client.listObjects(TEST_BUCKET, {
        prefix: 'test-folder/',
      });

      expect(result).toHaveProperty('objects');
      expect(result.objects.length).toBeGreaterThan(0);
      expect(result.objects.some((obj) => obj.key === testKey)).toBe(true);
      console.log(`Listed ${result.objects.length} objects with prefix 'test-folder/'`);
    });

    it('should get an object', async () => {
      if (!bucketCreated) {
        console.log('Skipping - bucket not created');
        return;
      }

      const result = await client.getObject(TEST_BUCKET, testKey);

      expect(result).toHaveProperty('content');
      expect(result.contentType).toBe('application/json');
      const parsed = JSON.parse(result.content);
      expect(parsed.message).toBe('Hello from MCP GCS test');
      console.log(`Got object: ${testKey}`);
    });

    it('should copy an object', async () => {
      if (!bucketCreated) {
        console.log('Skipping - bucket not created');
        return;
      }

      const destKey = 'test-folder/copied-file.json';
      const result = await client.copyObject(TEST_BUCKET, testKey, TEST_BUCKET, destKey);

      expect(result).toHaveProperty('etag');
      console.log(`Copied object to: ${destKey}`);

      // Cleanup copied file
      await client.deleteObject(TEST_BUCKET, destKey);
    });

    it('should delete an object', async () => {
      if (!bucketCreated) {
        console.log('Skipping - bucket not created');
        return;
      }

      await client.deleteObject(TEST_BUCKET, testKey);

      // Verify object is deleted by trying to list it
      const result = await client.listObjects(TEST_BUCKET, { prefix: testKey });
      expect(result.objects.length).toBe(0);
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
      const objects = await client.listObjects(TEST_BUCKET);
      for (const obj of objects.objects) {
        await client.deleteObject(TEST_BUCKET, obj.key);
      }

      await client.deleteBucket(TEST_BUCKET);

      // Verify bucket is deleted
      const exists = await client.headBucket(TEST_BUCKET);
      expect(exists).toBe(false);
      console.log(`Deleted test bucket: ${TEST_BUCKET}`);
    });
  });
});
