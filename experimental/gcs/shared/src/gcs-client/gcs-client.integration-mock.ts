import type {
  IGCSClient,
  ListBucketsResult,
  ListObjectsResult,
  ListObjectsOptions,
  GetObjectResult,
  GetObjectBytesResult,
  PutObjectResult,
  PutObjectOptions,
  CopyObjectResult,
} from './gcs-client.js';
import { readFile } from 'fs/promises';

export interface MockGCSData {
  buckets?: Array<{
    name: string;
    creationDate?: Date;
  }>;
  objects?: Record<
    string,
    Record<
      string,
      {
        // string for inline puts; Buffer for files streamed from disk (binary-safe).
        content: string | Buffer;
        contentType?: string;
        metadata?: Record<string, string>;
        lastModified?: Date;
      }
    >
  >;
}

export function createIntegrationMockGCSClient(mockData: MockGCSData = {}): IGCSClient {
  // Default mock data
  const buckets = mockData.buckets || [
    { name: 'test-bucket', creationDate: new Date('2024-01-01') },
    { name: 'another-bucket', creationDate: new Date('2024-02-01') },
  ];

  // Deep clone objects to avoid mutation issues
  const objects: MockGCSData['objects'] = structuredClone(mockData.objects || {});

  return {
    async listBuckets(): Promise<ListBucketsResult> {
      return { buckets };
    },

    async listObjects(
      bucket: string,
      options: ListObjectsOptions = {}
    ): Promise<ListObjectsResult> {
      const bucketObjects = objects?.[bucket] || {};
      let keys = Object.keys(bucketObjects);

      // Apply prefix filter
      if (options.prefix) {
        keys = keys.filter((key) => key.startsWith(options.prefix!));
      }

      // Handle delimiter for common prefixes
      const commonPrefixes: string[] = [];
      if (options.delimiter) {
        const prefixSet = new Set<string>();
        keys = keys.filter((key) => {
          const afterPrefix = options.prefix ? key.slice(options.prefix.length) : key;
          const delimiterIndex = afterPrefix.indexOf(options.delimiter!);
          if (delimiterIndex >= 0) {
            const prefix = (options.prefix || '') + afterPrefix.slice(0, delimiterIndex + 1);
            prefixSet.add(prefix);
            return false;
          }
          return true;
        });
        commonPrefixes.push(...prefixSet);
      }

      // Apply maxResults limit
      const maxResults = options.maxResults || 1000;
      const isTruncated = keys.length > maxResults;
      keys = keys.slice(0, maxResults);

      return {
        objects: keys.map((key) => ({
          key,
          size: bucketObjects[key]?.content ? Buffer.byteLength(bucketObjects[key].content) : 0,
          lastModified: bucketObjects[key]?.lastModified || new Date(),
          storageClass: 'STANDARD',
          etag: '"mock-etag"',
        })),
        commonPrefixes,
        isTruncated,
        nextPageToken: isTruncated ? 'mock-token' : undefined,
      };
    },

    async getObject(bucket: string, key: string): Promise<GetObjectResult> {
      const bucketObjects = objects?.[bucket];
      if (!bucketObjects || !bucketObjects[key]) {
        throw new Error(`Object not found: ${bucket}/${key}`);
      }

      const obj = bucketObjects[key];
      const contentStr = Buffer.isBuffer(obj.content) ? obj.content.toString('utf-8') : obj.content;
      return {
        content: contentStr,
        contentType: obj.contentType || 'text/plain',
        contentLength: Buffer.byteLength(obj.content),
        lastModified: obj.lastModified || new Date(),
        etag: '"mock-etag"',
        metadata: obj.metadata || {},
      };
    },

    async getObjectBytes(bucket: string, key: string): Promise<GetObjectBytesResult> {
      const bucketObjects = objects?.[bucket];
      if (!bucketObjects || !bucketObjects[key]) {
        throw new Error(`Object not found: ${bucket}/${key}`);
      }

      const stored = bucketObjects[key].content;
      const content = Buffer.isBuffer(stored) ? stored : Buffer.from(stored);
      return {
        content,
        contentType: bucketObjects[key].contentType || 'text/plain',
        contentLength: content.length,
      };
    },

    async putObject(
      bucket: string,
      key: string,
      content: string,
      putOptions: PutObjectOptions = {}
    ): Promise<PutObjectResult> {
      if (!objects) {
        throw new Error('Mock data not initialized');
      }
      if (!objects[bucket]) {
        objects[bucket] = {};
      }
      objects[bucket][key] = {
        content,
        contentType: putOptions.contentType,
        metadata: putOptions.metadata,
        lastModified: new Date(),
      };
      return {
        etag: '"mock-etag"',
        generation: undefined,
      };
    },

    async uploadFile(
      bucket: string,
      sourcePath: string,
      key: string,
      uploadOptions: PutObjectOptions = {}
    ): Promise<PutObjectResult> {
      if (!objects) {
        throw new Error('Mock data not initialized');
      }
      if (!objects[bucket]) {
        objects[bucket] = {};
      }
      // Read the raw bytes from disk so the upload path is exercised end-to-end
      // and binary content is preserved faithfully (mirrors the real client,
      // which streams bytes directly from disk without any text decoding).
      const content = await readFile(sourcePath);
      objects[bucket][key] = {
        content,
        contentType: uploadOptions.contentType,
        metadata: uploadOptions.metadata,
        lastModified: new Date(),
      };
      return {
        etag: '"mock-etag"',
        generation: undefined,
      };
    },

    async deleteObject(bucket: string, key: string): Promise<void> {
      if (objects?.[bucket]) {
        delete objects[bucket][key];
      }
    },

    async createBucket(bucket: string): Promise<void> {
      if (buckets.some((b) => b.name === bucket)) {
        throw new Error(`Bucket already exists: ${bucket}`);
      }
      buckets.push({ name: bucket, creationDate: new Date() });
      if (objects) {
        objects[bucket] = {};
      }
    },

    async deleteBucket(bucket: string): Promise<void> {
      const index = buckets.findIndex((b) => b.name === bucket);
      if (index === -1) {
        throw new Error(`Bucket not found: ${bucket}`);
      }
      if (objects?.[bucket] && Object.keys(objects[bucket]).length > 0) {
        throw new Error(`Bucket is not empty: ${bucket}`);
      }
      buckets.splice(index, 1);
      if (objects) {
        delete objects[bucket];
      }
    },

    async headBucket(bucket: string): Promise<boolean> {
      return buckets.some((b) => b.name === bucket);
    },

    async copyObject(
      sourceBucket: string,
      sourceKey: string,
      destBucket: string,
      destKey: string
    ): Promise<CopyObjectResult> {
      const sourceObj = objects?.[sourceBucket]?.[sourceKey];
      if (!sourceObj) {
        throw new Error(`Source object not found: ${sourceBucket}/${sourceKey}`);
      }
      if (!objects?.[destBucket]) {
        throw new Error(`Destination bucket not found: ${destBucket}`);
      }
      objects[destBucket][destKey] = { ...sourceObj, lastModified: new Date() };
      return {
        etag: '"mock-etag"',
        generation: undefined,
      };
    },
  };
}
