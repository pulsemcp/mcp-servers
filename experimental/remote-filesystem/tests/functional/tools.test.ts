import { describe, it, expect, beforeEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createFunctionalMockGCSClient } from '../mocks/gcs-client.functional-mock.js';

describe('upload tool', () => {
  let mockClient: ReturnType<typeof createFunctionalMockGCSClient>;

  beforeEach(() => {
    mockClient = createFunctionalMockGCSClient();
  });

  describe('parameter validation', () => {
    it('should require source parameter', async () => {
      const { UploadSchema } = await import('../../shared/src/tools/upload.js');

      expect(() => UploadSchema.parse({})).toThrow();
      expect(() => UploadSchema.parse({ source: '' })).toThrow();
    });

    it('should accept valid file:// URI', async () => {
      const { UploadSchema } = await import('../../shared/src/tools/upload.js');

      const result = UploadSchema.parse({
        source: 'file:///tmp/test.png',
      });

      expect(result.source).toBe('file:///tmp/test.png');
    });

    it('should accept base64 string', async () => {
      const { UploadSchema } = await import('../../shared/src/tools/upload.js');

      const base64Data = Buffer.from('test content').toString('base64');
      const result = UploadSchema.parse({
        source: base64Data,
      });

      expect(result.source).toBe(base64Data);
    });

    it('should accept optional path', async () => {
      const { UploadSchema } = await import('../../shared/src/tools/upload.js');

      const result = UploadSchema.parse({
        source: 'file:///tmp/test.png',
        path: 'screenshots/custom-name.png',
      });

      expect(result.path).toBe('screenshots/custom-name.png');
    });

    it('should accept optional contentType', async () => {
      const { UploadSchema } = await import('../../shared/src/tools/upload.js');

      const result = UploadSchema.parse({
        source: 'file:///tmp/test.png',
        contentType: 'image/jpeg',
      });

      expect(result.contentType).toBe('image/jpeg');
    });

    it('should accept optional makePublic', async () => {
      const { UploadSchema } = await import('../../shared/src/tools/upload.js');

      const result = UploadSchema.parse({
        source: 'file:///tmp/test.png',
        makePublic: true,
      });

      expect(result.makePublic).toBe(true);
    });
  });

  describe('tool factory', () => {
    it('should create tool with correct name', async () => {
      const { uploadTool } = await import('../../shared/src/tools/upload.js');
      const server = new Server(
        { name: 'test-server', version: '0.0.1' },
        { capabilities: { tools: {} } }
      );

      const tool = uploadTool(server, () => mockClient);

      expect(tool.name).toBe('upload');
    });

    it('should create tool with correct input schema', async () => {
      const { uploadTool } = await import('../../shared/src/tools/upload.js');
      const server = new Server(
        { name: 'test-server', version: '0.0.1' },
        { capabilities: { tools: {} } }
      );

      const tool = uploadTool(server, () => mockClient);

      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties.source).toBeDefined();
      expect(tool.inputSchema.required).toContain('source');
    });
  });

  describe('handler', () => {
    it('should call upload for base64 data', async () => {
      const { uploadTool } = await import('../../shared/src/tools/upload.js');
      const server = new Server(
        { name: 'test-server', version: '0.0.1' },
        { capabilities: { tools: {} } }
      );

      const tool = uploadTool(server, () => mockClient);
      const base64Data = Buffer.from('test content').toString('base64');

      const result = await tool.handler({
        source: base64Data,
        path: 'test.txt',
      });

      expect(mockClient.upload).toHaveBeenCalled();
      expect(result.isError).toBeUndefined();
      expect(result.content[0].type).toBe('text');

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.url).toContain('test-bucket');
      expect(parsed.path).toBe('test.txt');
    });

    it('should call uploadFile for file:// URIs', async () => {
      const { uploadTool } = await import('../../shared/src/tools/upload.js');
      const server = new Server(
        { name: 'test-server', version: '0.0.1' },
        { capabilities: { tools: {} } }
      );

      const tool = uploadTool(server, () => mockClient);

      const result = await tool.handler({
        source: 'file:///tmp/test.png',
      });

      expect(mockClient.uploadFile).toHaveBeenCalledWith('/tmp/test.png', expect.any(Object));
      expect(result.isError).toBeUndefined();
    });

    it('should return error for invalid arguments', async () => {
      const { uploadTool } = await import('../../shared/src/tools/upload.js');
      const server = new Server(
        { name: 'test-server', version: '0.0.1' },
        { capabilities: { tools: {} } }
      );

      const tool = uploadTool(server, () => mockClient);

      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error');
    });

    it('should return error when upload fails', async () => {
      const { uploadTool } = await import('../../shared/src/tools/upload.js');
      const server = new Server(
        { name: 'test-server', version: '0.0.1' },
        { capabilities: { tools: {} } }
      );

      mockClient.upload.mockRejectedValueOnce(new Error('Upload failed'));

      const tool = uploadTool(server, () => mockClient);

      const result = await tool.handler({
        source: Buffer.from('test').toString('base64'),
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Upload failed');
    });
  });
});

describe('download tool', () => {
  let mockClient: ReturnType<typeof createFunctionalMockGCSClient>;

  beforeEach(() => {
    mockClient = createFunctionalMockGCSClient();
  });

  describe('parameter validation', () => {
    it('should require path parameter', async () => {
      const { DownloadSchema } = await import('../../shared/src/tools/download.js');

      expect(() => DownloadSchema.parse({})).toThrow();
      expect(() => DownloadSchema.parse({ path: '' })).toThrow();
    });

    it('should accept valid path', async () => {
      const { DownloadSchema } = await import('../../shared/src/tools/download.js');

      const result = DownloadSchema.parse({
        path: 'screenshots/test.png',
      });

      expect(result.path).toBe('screenshots/test.png');
    });

    it('should accept optional asBase64', async () => {
      const { DownloadSchema } = await import('../../shared/src/tools/download.js');

      const result = DownloadSchema.parse({
        path: 'test.png',
        asBase64: true,
      });

      expect(result.asBase64).toBe(true);
    });
  });

  describe('handler', () => {
    it('should call download with path', async () => {
      const { downloadTool } = await import('../../shared/src/tools/download.js');
      const server = new Server(
        { name: 'test-server', version: '0.0.1' },
        { capabilities: { tools: {} } }
      );

      const tool = downloadTool(server, () => mockClient);

      const result = await tool.handler({
        path: 'test.txt',
      });

      expect(mockClient.download).toHaveBeenCalledWith('test.txt', expect.any(Object));
      expect(result.isError).toBeUndefined();
    });
  });
});

describe('list_files tool', () => {
  let mockClient: ReturnType<typeof createFunctionalMockGCSClient>;

  beforeEach(() => {
    mockClient = createFunctionalMockGCSClient();
  });

  describe('handler', () => {
    it('should call list', async () => {
      const { listFilesTool } = await import('../../shared/src/tools/list.js');
      const server = new Server(
        { name: 'test-server', version: '0.0.1' },
        { capabilities: { tools: {} } }
      );

      const tool = listFilesTool(server, () => mockClient);

      const result = await tool.handler({});

      expect(mockClient.list).toHaveBeenCalled();
      expect(result.isError).toBeUndefined();
    });
  });
});

describe('modify tool', () => {
  let mockClient: ReturnType<typeof createFunctionalMockGCSClient>;

  beforeEach(() => {
    mockClient = createFunctionalMockGCSClient();
  });

  describe('parameter validation', () => {
    it('should require path parameter', async () => {
      const { ModifySchema } = await import('../../shared/src/tools/modify.js');

      expect(() => ModifySchema.parse({})).toThrow();
    });
  });

  describe('handler', () => {
    it('should call modify with path and options', async () => {
      const { modifyTool } = await import('../../shared/src/tools/modify.js');
      const server = new Server(
        { name: 'test-server', version: '0.0.1' },
        { capabilities: { tools: {} } }
      );

      const tool = modifyTool(server, () => mockClient);

      const result = await tool.handler({
        path: 'test.txt',
        makePublic: true,
      });

      expect(mockClient.modify).toHaveBeenCalledWith(
        'test.txt',
        expect.objectContaining({ makePublic: true })
      );
      expect(result.isError).toBeUndefined();
    });
  });
});

describe('delete_file tool', () => {
  let mockClient: ReturnType<typeof createFunctionalMockGCSClient>;

  beforeEach(() => {
    mockClient = createFunctionalMockGCSClient();
  });

  describe('parameter validation', () => {
    it('should require path parameter', async () => {
      const { DeleteSchema } = await import('../../shared/src/tools/delete.js');

      expect(() => DeleteSchema.parse({})).toThrow();
    });
  });

  describe('handler', () => {
    it('should call delete with path', async () => {
      const { deleteFileTool } = await import('../../shared/src/tools/delete.js');
      const server = new Server(
        { name: 'test-server', version: '0.0.1' },
        { capabilities: { tools: {} } }
      );

      const tool = deleteFileTool(server, () => mockClient);

      const result = await tool.handler({
        path: 'test.txt',
      });

      expect(mockClient.delete).toHaveBeenCalledWith('test.txt');
      expect(result.isError).toBeUndefined();
    });
  });
});
