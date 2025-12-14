import { describe, it, expect, beforeEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { saveFileTool } from '../../shared/src/tools/save-file.js';
import { getFileTool } from '../../shared/src/tools/get-file.js';
import { searchFilesTool } from '../../shared/src/tools/search-files.js';
import { deleteFileTool } from '../../shared/src/tools/delete-file.js';
import { createMockStorageClient } from '../mocks/storage-client.functional-mock.js';
import { IStorageClient } from '../../shared/src/storage-client/types.js';

describe('Tools', () => {
  let mockServer: Server;
  let mockClient: IStorageClient;
  let clientFactory: () => IStorageClient;

  beforeEach(() => {
    mockServer = {} as Server;
    mockClient = createMockStorageClient({
      'test.txt': { content: 'Hello World', contentType: 'text/plain' },
      'data/config.json': { content: '{"key": "value"}', contentType: 'application/json' },
    });
    clientFactory = () => mockClient;
  });

  describe('save_file', () => {
    it('should have correct metadata', () => {
      const tool = saveFileTool(mockServer, clientFactory);

      expect(tool.name).toBe('save_file');
      expect(tool.description).toContain('Save a file to cloud storage');
      expect(tool.inputSchema.properties).toHaveProperty('path');
      expect(tool.inputSchema.properties).toHaveProperty('content');
      expect(tool.inputSchema.properties).toHaveProperty('local_file_path');
      expect(tool.inputSchema.required).toEqual(['path']);
    });

    it('should save a file with inline content', async () => {
      const emptyClient = createMockStorageClient();
      const tool = saveFileTool(mockServer, () => emptyClient);

      const result = await tool.handler({
        path: 'new-file.txt',
        content: 'New content',
      });

      expect(result.isError).not.toBe(true);
      const responseText = JSON.parse(result.content[0].text);
      expect(responseText.success).toBe(true);
      expect(responseText.file.path).toBe('new-file.txt');
    });

    it('should save a file with custom metadata', async () => {
      const emptyClient = createMockStorageClient();
      const tool = saveFileTool(mockServer, () => emptyClient);

      const result = await tool.handler({
        path: 'config.json',
        content: '{"test": true}',
        content_type: 'application/json',
        metadata: { version: '1.0' },
      });

      expect(result.isError).not.toBe(true);
      const responseText = JSON.parse(result.content[0].text);
      expect(responseText.success).toBe(true);
      expect(responseText.file.contentType).toBe('application/json');
    });

    it('should return error when neither content nor local_file_path is provided', async () => {
      const tool = saveFileTool(mockServer, clientFactory);

      const result = await tool.handler({
        path: 'test.txt',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error');
    });
  });

  describe('get_file', () => {
    it('should have correct metadata', () => {
      const tool = getFileTool(mockServer, clientFactory);

      expect(tool.name).toBe('get_file');
      expect(tool.description).toContain('Get a file from cloud storage');
      expect(tool.inputSchema.properties).toHaveProperty('path');
      expect(tool.inputSchema.properties).toHaveProperty('local_file_path');
      expect(tool.inputSchema.required).toEqual(['path']);
    });

    it('should get an existing file', async () => {
      const tool = getFileTool(mockServer, clientFactory);

      const result = await tool.handler({
        path: 'test.txt',
      });

      expect(result.isError).not.toBe(true);
      const responseText = JSON.parse(result.content[0].text);
      expect(responseText.success).toBe(true);
      expect(responseText.content).toBe('Hello World');
      expect(responseText.file.path).toBe('test.txt');
    });

    it('should return error for non-existent file', async () => {
      const tool = getFileTool(mockServer, clientFactory);

      const result = await tool.handler({
        path: 'non-existent.txt',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('File not found');
    });

    it('should get JSON file content', async () => {
      const tool = getFileTool(mockServer, clientFactory);

      const result = await tool.handler({
        path: 'data/config.json',
      });

      expect(result.isError).not.toBe(true);
      const responseText = JSON.parse(result.content[0].text);
      expect(responseText.success).toBe(true);
      expect(responseText.content).toBe('{"key": "value"}');
    });
  });

  describe('search_files', () => {
    it('should have correct metadata', () => {
      const tool = searchFilesTool(mockServer, clientFactory);

      expect(tool.name).toBe('search_files');
      expect(tool.description).toContain('Search and list files');
      expect(tool.inputSchema.properties).toHaveProperty('prefix');
      expect(tool.inputSchema.properties).toHaveProperty('limit');
    });

    it('should list all files', async () => {
      const tool = searchFilesTool(mockServer, clientFactory);

      const result = await tool.handler({});

      expect(result.isError).not.toBe(true);
      const responseText = JSON.parse(result.content[0].text);
      expect(responseText.success).toBe(true);
      expect(responseText.files.length).toBe(2);
    });

    it('should filter by prefix', async () => {
      const tool = searchFilesTool(mockServer, clientFactory);

      const result = await tool.handler({
        prefix: 'data/',
      });

      expect(result.isError).not.toBe(true);
      const responseText = JSON.parse(result.content[0].text);
      expect(responseText.success).toBe(true);
      expect(responseText.files.length).toBe(1);
      expect(responseText.files[0].path).toBe('data/config.json');
    });

    it('should return empty array when no files match prefix', async () => {
      const tool = searchFilesTool(mockServer, clientFactory);

      const result = await tool.handler({
        prefix: 'nonexistent/',
      });

      expect(result.isError).not.toBe(true);
      const responseText = JSON.parse(result.content[0].text);
      expect(responseText.success).toBe(true);
      expect(responseText.files.length).toBe(0);
    });
  });

  describe('delete_file', () => {
    it('should have correct metadata', () => {
      const tool = deleteFileTool(mockServer, clientFactory);

      expect(tool.name).toBe('delete_file');
      expect(tool.description).toContain('Delete a file from cloud storage');
      expect(tool.inputSchema.properties).toHaveProperty('path');
      expect(tool.inputSchema.required).toEqual(['path']);
    });

    it('should delete an existing file', async () => {
      const tool = deleteFileTool(mockServer, clientFactory);

      const result = await tool.handler({
        path: 'test.txt',
      });

      expect(result.isError).not.toBe(true);
      const responseText = JSON.parse(result.content[0].text);
      expect(responseText.success).toBe(true);
      expect(responseText.deletedPath).toBe('test.txt');
    });

    it('should return error for non-existent file', async () => {
      const tool = deleteFileTool(mockServer, clientFactory);

      const result = await tool.handler({
        path: 'non-existent.txt',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('File not found');
    });
  });
});
