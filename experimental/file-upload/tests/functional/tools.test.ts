import { describe, it, expect, beforeEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createFunctionalMockGCSClient } from '../mocks/gcs-client.functional-mock.js';

describe('upload_to_gcs tool', () => {
  let mockClient: ReturnType<typeof createFunctionalMockGCSClient>;

  beforeEach(() => {
    mockClient = createFunctionalMockGCSClient();
  });

  describe('parameter validation', () => {
    it('should require source parameter', async () => {
      const { UploadToGCSSchema } = await import('../../shared/src/tools/upload-to-gcs.js');

      expect(() => UploadToGCSSchema.parse({})).toThrow();
      expect(() => UploadToGCSSchema.parse({ source: '' })).toThrow();
    });

    it('should accept valid file:// URI', async () => {
      const { UploadToGCSSchema } = await import('../../shared/src/tools/upload-to-gcs.js');

      const result = UploadToGCSSchema.parse({
        source: 'file:///tmp/test.png',
      });

      expect(result.source).toBe('file:///tmp/test.png');
    });

    it('should accept base64 string', async () => {
      const { UploadToGCSSchema } = await import('../../shared/src/tools/upload-to-gcs.js');

      const base64Data = Buffer.from('test content').toString('base64');
      const result = UploadToGCSSchema.parse({
        source: base64Data,
      });

      expect(result.source).toBe(base64Data);
    });

    it('should accept optional filename', async () => {
      const { UploadToGCSSchema } = await import('../../shared/src/tools/upload-to-gcs.js');

      const result = UploadToGCSSchema.parse({
        source: 'file:///tmp/test.png',
        filename: 'custom-name.png',
      });

      expect(result.filename).toBe('custom-name.png');
    });

    it('should accept optional contentType', async () => {
      const { UploadToGCSSchema } = await import('../../shared/src/tools/upload-to-gcs.js');

      const result = UploadToGCSSchema.parse({
        source: 'file:///tmp/test.png',
        contentType: 'image/jpeg',
      });

      expect(result.contentType).toBe('image/jpeg');
    });
  });

  describe('tool factory', () => {
    it('should create tool with correct name', async () => {
      const { uploadToGCSTool } = await import('../../shared/src/tools/upload-to-gcs.js');
      const server = new Server(
        { name: 'test-server', version: '0.0.1' },
        { capabilities: { tools: {} } }
      );

      const tool = uploadToGCSTool(server, () => mockClient);

      expect(tool.name).toBe('upload_to_gcs');
    });

    it('should create tool with correct input schema', async () => {
      const { uploadToGCSTool } = await import('../../shared/src/tools/upload-to-gcs.js');
      const server = new Server(
        { name: 'test-server', version: '0.0.1' },
        { capabilities: { tools: {} } }
      );

      const tool = uploadToGCSTool(server, () => mockClient);

      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties.source).toBeDefined();
      expect(tool.inputSchema.required).toContain('source');
    });
  });

  describe('handler', () => {
    it('should call upload for base64 data', async () => {
      const { uploadToGCSTool } = await import('../../shared/src/tools/upload-to-gcs.js');
      const server = new Server(
        { name: 'test-server', version: '0.0.1' },
        { capabilities: { tools: {} } }
      );

      const tool = uploadToGCSTool(server, () => mockClient);
      const base64Data = Buffer.from('test content').toString('base64');

      const result = await tool.handler({
        source: base64Data,
        filename: 'test.txt',
      });

      expect(mockClient.upload).toHaveBeenCalled();
      expect(result.isError).toBeUndefined();
      expect(result.content[0].type).toBe('text');

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.url).toContain('test-bucket');
      expect(parsed.bucket).toBe('test-bucket');
    });

    it('should call uploadFile for file:// URIs', async () => {
      const { uploadToGCSTool } = await import('../../shared/src/tools/upload-to-gcs.js');
      const server = new Server(
        { name: 'test-server', version: '0.0.1' },
        { capabilities: { tools: {} } }
      );

      const tool = uploadToGCSTool(server, () => mockClient);

      const result = await tool.handler({
        source: 'file:///tmp/test.png',
      });

      expect(mockClient.uploadFile).toHaveBeenCalledWith('/tmp/test.png', expect.any(Object));
      expect(result.isError).toBeUndefined();
    });

    it('should return error for invalid arguments', async () => {
      const { uploadToGCSTool } = await import('../../shared/src/tools/upload-to-gcs.js');
      const server = new Server(
        { name: 'test-server', version: '0.0.1' },
        { capabilities: { tools: {} } }
      );

      const tool = uploadToGCSTool(server, () => mockClient);

      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error');
    });

    it('should return error when upload fails', async () => {
      const { uploadToGCSTool } = await import('../../shared/src/tools/upload-to-gcs.js');
      const server = new Server(
        { name: 'test-server', version: '0.0.1' },
        { capabilities: { tools: {} } }
      );

      mockClient.upload.mockRejectedValueOnce(new Error('Upload failed'));

      const tool = uploadToGCSTool(server, () => mockClient);

      const result = await tool.handler({
        source: Buffer.from('test').toString('base64'),
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Upload failed');
    });
  });
});
