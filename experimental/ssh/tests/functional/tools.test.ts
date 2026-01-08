import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { executeTool } from '../../shared/src/tools/execute-tool.js';
import { uploadTool } from '../../shared/src/tools/upload-tool.js';
import { downloadTool } from '../../shared/src/tools/download-tool.js';
import { listDirectoryTool } from '../../shared/src/tools/list-directory-tool.js';
import { connectionInfoTool } from '../../shared/src/tools/connection-info-tool.js';
import { createMockSSHClient } from '../mocks/ssh-client.functional-mock.js';
import type { ISSHClient } from '../../shared/src/server.js';

describe('SSH Tools', () => {
  let server: Server;
  let mockClient: ISSHClient;

  beforeEach(() => {
    server = new Server(
      {
        name: 'test-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    mockClient = createMockSSHClient();
  });

  describe('ssh_execute', () => {
    it('should execute command and return result', async () => {
      (mockClient.execute as ReturnType<typeof vi.fn>).mockResolvedValue({
        stdout: 'test output',
        stderr: '',
        exitCode: 0,
      });

      const tool = executeTool(server, () => mockClient);
      const result = await tool.handler({
        command: 'ls -la',
      });

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
          },
        ],
      });

      const content = JSON.parse((result as { content: Array<{ text: string }> }).content[0].text);
      expect(content.exitCode).toBe(0);
      expect(content.stdout).toBe('test output');
    });

    it('should pass cwd option when provided', async () => {
      const tool = executeTool(server, () => mockClient);
      await tool.handler({
        command: 'pwd',
        cwd: '/home/user',
      });

      expect(mockClient.execute).toHaveBeenCalledWith('pwd', {
        cwd: '/home/user',
        timeout: undefined,
      });
    });

    it('should handle execution errors', async () => {
      (mockClient.execute as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Connection refused')
      );

      const tool = executeTool(server, () => mockClient);
      const result = await tool.handler({
        command: 'ls',
      });

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Error executing command'),
          },
        ],
        isError: true,
      });
    });

    it('should validate input schema', () => {
      const tool = executeTool(server, () => mockClient);

      expect(tool.inputSchema).toMatchObject({
        type: 'object',
        properties: {
          command: { type: 'string' },
        },
        required: ['command'],
      });
    });

    it('should return error for missing command parameter', async () => {
      const tool = executeTool(server, () => mockClient);
      const result = await tool.handler({});

      expect(result).toMatchObject({
        isError: true,
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Error executing command'),
          },
        ],
      });
    });

    it('should return error for invalid command type', async () => {
      const tool = executeTool(server, () => mockClient);
      const result = await tool.handler({ command: 123 });

      expect(result).toMatchObject({
        isError: true,
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Error executing command'),
          },
        ],
      });
    });
  });

  describe('ssh_upload', () => {
    it('should upload file successfully', async () => {
      const tool = uploadTool(server, () => mockClient);
      const result = await tool.handler({
        localPath: '/local/file.txt',
        remotePath: '/remote/file.txt',
      });

      expect(mockClient.upload).toHaveBeenCalledWith('/local/file.txt', '/remote/file.txt');
      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Successfully uploaded'),
          },
        ],
      });
    });

    it('should handle upload errors', async () => {
      (mockClient.upload as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Permission denied')
      );

      const tool = uploadTool(server, () => mockClient);
      const result = await tool.handler({
        localPath: '/local/file.txt',
        remotePath: '/remote/file.txt',
      });

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Error uploading file'),
          },
        ],
        isError: true,
      });
    });

    it('should return error for missing required paths', async () => {
      const tool = uploadTool(server, () => mockClient);
      const result = await tool.handler({ localPath: '/local/file.txt' });

      expect(result).toMatchObject({
        isError: true,
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Error uploading file'),
          },
        ],
      });
    });
  });

  describe('ssh_download', () => {
    it('should download file successfully', async () => {
      const tool = downloadTool(server, () => mockClient);
      const result = await tool.handler({
        remotePath: '/remote/file.txt',
        localPath: '/local/file.txt',
      });

      expect(mockClient.download).toHaveBeenCalledWith('/remote/file.txt', '/local/file.txt');
      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Successfully downloaded'),
          },
        ],
      });
    });

    it('should handle download errors', async () => {
      (mockClient.download as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('File not found')
      );

      const tool = downloadTool(server, () => mockClient);
      const result = await tool.handler({
        remotePath: '/remote/file.txt',
        localPath: '/local/file.txt',
      });

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Error downloading file'),
          },
        ],
        isError: true,
      });
    });

    it('should return error for missing required paths', async () => {
      const tool = downloadTool(server, () => mockClient);
      const result = await tool.handler({ remotePath: '/remote/file.txt' });

      expect(result).toMatchObject({
        isError: true,
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Error downloading file'),
          },
        ],
      });
    });
  });

  describe('ssh_list_directory', () => {
    it('should list directory contents', async () => {
      const tool = listDirectoryTool(server, () => mockClient);
      const result = await tool.handler({
        path: '/home/user',
      });

      expect(mockClient.listDirectory).toHaveBeenCalledWith('/home/user');
      const content = JSON.parse((result as { content: Array<{ text: string }> }).content[0].text);
      expect(content).toHaveLength(2);
      expect(content[0].name).toBe('file1.txt');
      expect(content[1].name).toBe('subdir');
    });

    it('should handle listing errors', async () => {
      (mockClient.listDirectory as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Directory not found')
      );

      const tool = listDirectoryTool(server, () => mockClient);
      const result = await tool.handler({
        path: '/nonexistent',
      });

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Error listing directory'),
          },
        ],
        isError: true,
      });
    });

    it('should return error for missing path parameter', async () => {
      const tool = listDirectoryTool(server, () => mockClient);
      const result = await tool.handler({});

      expect(result).toMatchObject({
        isError: true,
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Error listing directory'),
          },
        ],
      });
    });
  });

  describe('ssh_connection_info', () => {
    it('should return connection info', async () => {
      process.env.SSH_HOST = 'test-host';
      process.env.SSH_USERNAME = 'test-user';
      process.env.SSH_PORT = '2222';

      const tool = connectionInfoTool(server, () => mockClient);
      const result = await tool.handler({});

      const content = JSON.parse((result as { content: Array<{ text: string }> }).content[0].text);
      expect(content.host).toBe('test-host');
      expect(content.username).toBe('test-user');
      expect(content.port).toBe('2222');

      // Clean up
      delete process.env.SSH_HOST;
      delete process.env.SSH_USERNAME;
      delete process.env.SSH_PORT;
    });

    it('should show not configured when env vars are missing', async () => {
      delete process.env.SSH_HOST;
      delete process.env.SSH_USERNAME;

      const tool = connectionInfoTool(server, () => mockClient);
      const result = await tool.handler({});

      const content = JSON.parse((result as { content: Array<{ text: string }> }).content[0].text);
      expect(content.host).toBe('not configured');
      expect(content.username).toBe('not configured');
    });
  });
});

describe('Tool Schemas', () => {
  let server: Server;
  let mockClient: ISSHClient;

  beforeEach(() => {
    server = new Server({ name: 'test', version: '1.0.0' }, { capabilities: { tools: {} } });
    mockClient = createMockSSHClient();
  });

  it('executeTool should have correct schema', () => {
    const tool = executeTool(server, () => mockClient);
    expect(tool.name).toBe('ssh_execute');
    expect(tool.inputSchema.required).toContain('command');
  });

  it('uploadTool should have correct schema', () => {
    const tool = uploadTool(server, () => mockClient);
    expect(tool.name).toBe('ssh_upload');
    expect(tool.inputSchema.required).toContain('localPath');
    expect(tool.inputSchema.required).toContain('remotePath');
  });

  it('downloadTool should have correct schema', () => {
    const tool = downloadTool(server, () => mockClient);
    expect(tool.name).toBe('ssh_download');
    expect(tool.inputSchema.required).toContain('remotePath');
    expect(tool.inputSchema.required).toContain('localPath');
  });

  it('listDirectoryTool should have correct schema', () => {
    const tool = listDirectoryTool(server, () => mockClient);
    expect(tool.name).toBe('ssh_list_directory');
    expect(tool.inputSchema.required).toContain('path');
  });

  it('connectionInfoTool should have correct schema', () => {
    const tool = connectionInfoTool(server, () => mockClient);
    expect(tool.name).toBe('ssh_connection_info');
    expect(tool.inputSchema.required).toEqual([]);
  });
});
