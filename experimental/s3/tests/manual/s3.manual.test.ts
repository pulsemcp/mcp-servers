import { describe, it, expect, beforeAll } from 'vitest';
import { AwsS3Client } from '../../shared/src/s3-client/s3-client.js';

/**
 * Manual tests for S3 MCP Server
 *
 * These tests run against real AWS S3. To run them:
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
  let client: AwsS3Client;
  let bucketCreated = false;

  beforeAll(() => {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || 'us-east-1';

    if (!accessKeyId || !secretAccessKey) {
      throw new Error(
        'AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.'
      );
    }

    client = new AwsS3Client({
      accessKeyId,
      secretAccessKey,
      region,
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
      message: 'Hello from MCP S3 test',
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
      expect(parsed.message).toBe('Hello from MCP S3 test');
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
