import { describe, it, expect, beforeEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { parseEnabledToolGroups, parseToolFilters } from '../../shared/src/tools.js';
import { listBucketsTool } from '../../shared/src/tools/list-buckets.js';
import { listObjectsTool } from '../../shared/src/tools/list-objects.js';
import { getObjectTool } from '../../shared/src/tools/get-object.js';
import { putObjectTool } from '../../shared/src/tools/put-object.js';
import { deleteObjectTool } from '../../shared/src/tools/delete-object.js';
import { createBucketTool } from '../../shared/src/tools/create-bucket.js';
import { deleteBucketTool } from '../../shared/src/tools/delete-bucket.js';
import { copyObjectTool } from '../../shared/src/tools/copy-object.js';
import { headBucketTool } from '../../shared/src/tools/head-bucket.js';
import { createMockGCSClient } from '../mocks/gcs-client.functional-mock.js';

describe('Tool Filtering', () => {
  describe('parseEnabledToolGroups', () => {
    it('should return all groups when no parameter provided', () => {
      const groups = parseEnabledToolGroups();
      expect(groups).toEqual(['readonly', 'readwrite']);
    });

    it('should parse valid groups from comma-separated list', () => {
      const groups = parseEnabledToolGroups('readonly');
      expect(groups).toEqual(['readonly']);
    });

    it('should parse multiple valid groups', () => {
      const groups = parseEnabledToolGroups('readonly,readwrite');
      expect(groups).toEqual(['readonly', 'readwrite']);
    });

    it('should handle whitespace in input', () => {
      const groups = parseEnabledToolGroups('  readonly  ,  readwrite  ');
      expect(groups).toEqual(['readonly', 'readwrite']);
    });

    it('should filter out invalid groups', () => {
      const groups = parseEnabledToolGroups('readonly,invalid,readwrite');
      expect(groups).toEqual(['readonly', 'readwrite']);
    });

    it('should return all groups if all provided groups are invalid', () => {
      const groups = parseEnabledToolGroups('invalid,alsoinvalid');
      expect(groups).toEqual(['readonly', 'readwrite']);
    });
  });

  describe('parseToolFilters', () => {
    it('should return null enabledTools and empty disabledTools when no params', () => {
      const { enabledTools, disabledTools } = parseToolFilters();
      expect(enabledTools).toBeNull();
      expect(disabledTools.size).toBe(0);
    });

    it('should parse enabled tools from comma-separated list', () => {
      const { enabledTools } = parseToolFilters('list_buckets,get_object');
      expect(enabledTools).not.toBeNull();
      expect(enabledTools!.has('list_buckets')).toBe(true);
      expect(enabledTools!.has('get_object')).toBe(true);
      expect(enabledTools!.size).toBe(2);
    });

    it('should parse disabled tools from comma-separated list', () => {
      const { disabledTools } = parseToolFilters(undefined, 'delete_bucket,delete_object');
      expect(disabledTools.has('delete_bucket')).toBe(true);
      expect(disabledTools.has('delete_object')).toBe(true);
      expect(disabledTools.size).toBe(2);
    });
  });
});

describe('GCS Tools', () => {
  // Minimal mock server - tools don't actually use the server instance
  const mockServer = {} as Server;
  let mockClient: ReturnType<typeof createMockGCSClient>;

  beforeEach(() => {
    mockClient = createMockGCSClient();
  });

  describe('list_buckets', () => {
    it('should list buckets successfully', async () => {
      mockClient.listBuckets.mockResolvedValue({
        buckets: [
          { name: 'test-bucket', creationDate: new Date('2024-01-01') },
          { name: 'another-bucket', creationDate: new Date('2024-02-01') },
        ],
      });

      const tool = listBucketsTool(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.buckets).toHaveLength(2);
      expect(parsed.buckets[0].name).toBe('test-bucket');
    });

    it('should handle errors gracefully', async () => {
      mockClient.listBuckets.mockRejectedValue(new Error('Access denied'));

      const tool = listBucketsTool(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Access denied');
    });
  });

  describe('list_objects', () => {
    it('should list objects with prefix', async () => {
      mockClient.listObjects.mockResolvedValue({
        objects: [
          { key: 'data/file1.json', size: 1234, lastModified: new Date() },
          { key: 'data/file2.json', size: 5678, lastModified: new Date() },
        ],
        commonPrefixes: [],
        isTruncated: false,
      });

      const tool = listObjectsTool(mockServer, () => mockClient);
      const result = await tool.handler({
        bucket: 'test-bucket',
        prefix: 'data/',
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.objects).toHaveLength(2);
      expect(mockClient.listObjects).toHaveBeenCalledWith('test-bucket', {
        prefix: 'data/',
        maxResults: undefined,
        pageToken: undefined,
        delimiter: undefined,
      });
    });

    it('should return error when bucket is missing', async () => {
      const tool = listObjectsTool(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
    });
  });

  describe('get_object', () => {
    it('should get object content', async () => {
      mockClient.getObject.mockResolvedValue({
        content: '{"key": "value"}',
        contentType: 'application/json',
        contentLength: 16,
        lastModified: new Date(),
        etag: '"abc123"',
        metadata: {},
      });

      const tool = getObjectTool(mockServer, () => mockClient);
      const result = await tool.handler({
        bucket: 'test-bucket',
        key: 'data/file.json',
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.content).toBe('{"key": "value"}');
      expect(parsed.contentType).toBe('application/json');
    });
  });

  describe('put_object', () => {
    it('should put object with content', async () => {
      mockClient.putObject.mockResolvedValue({
        etag: '"newetag"',
        generation: undefined,
      });

      const tool = putObjectTool(mockServer, () => mockClient);
      const result = await tool.handler({
        bucket: 'test-bucket',
        key: 'data/new-file.json',
        content: '{"new": "data"}',
        contentType: 'application/json',
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
      expect(mockClient.putObject).toHaveBeenCalledWith(
        'test-bucket',
        'data/new-file.json',
        '{"new": "data"}',
        { contentType: 'application/json', metadata: undefined }
      );
    });
  });

  describe('delete_object', () => {
    it('should delete object', async () => {
      mockClient.deleteObject.mockResolvedValue(undefined);

      const tool = deleteObjectTool(mockServer, () => mockClient);
      const result = await tool.handler({
        bucket: 'test-bucket',
        key: 'data/old-file.json',
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
      expect(mockClient.deleteObject).toHaveBeenCalledWith('test-bucket', 'data/old-file.json');
    });
  });

  describe('create_bucket', () => {
    it('should create bucket', async () => {
      mockClient.createBucket.mockResolvedValue(undefined);

      const tool = createBucketTool(mockServer, () => mockClient);
      const result = await tool.handler({
        bucket: 'new-bucket-name',
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed.bucket).toBe('new-bucket-name');
    });

    it('should validate bucket name format', async () => {
      const tool = createBucketTool(mockServer, () => mockClient);
      const result = await tool.handler({
        bucket: 'Invalid_Bucket_Name!', // Invalid characters
      });

      expect(result.isError).toBe(true);
    });
  });

  describe('delete_bucket', () => {
    it('should delete bucket', async () => {
      mockClient.deleteBucket.mockResolvedValue(undefined);

      const tool = deleteBucketTool(mockServer, () => mockClient);
      const result = await tool.handler({
        bucket: 'empty-bucket',
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
    });
  });

  describe('copy_object', () => {
    it('should copy object between buckets', async () => {
      mockClient.copyObject.mockResolvedValue({
        etag: '"copyetag"',
        generation: undefined,
      });

      const tool = copyObjectTool(mockServer, () => mockClient);
      const result = await tool.handler({
        sourceBucket: 'source-bucket',
        sourceKey: 'source/file.txt',
        destBucket: 'dest-bucket',
        destKey: 'dest/file.txt',
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
      expect(mockClient.copyObject).toHaveBeenCalledWith(
        'source-bucket',
        'source/file.txt',
        'dest-bucket',
        'dest/file.txt'
      );
    });
  });

  describe('head_bucket', () => {
    it('should check if bucket exists', async () => {
      mockClient.headBucket.mockResolvedValue(true);

      const tool = headBucketTool(mockServer, () => mockClient);
      const result = await tool.handler({
        bucket: 'existing-bucket',
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.exists).toBe(true);
      expect(parsed.bucket).toBe('existing-bucket');
    });

    it('should return false for non-existent bucket', async () => {
      mockClient.headBucket.mockResolvedValue(false);

      const tool = headBucketTool(mockServer, () => mockClient);
      const result = await tool.handler({
        bucket: 'non-existent-bucket',
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.exists).toBe(false);
    });
  });
});
