import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createMCPServer, SSHClient, createSSHConfigFromEnv } from '../../shared/src/server.js';
import { executeTool } from '../../shared/src/tools/execute-tool.js';
import { listDirectoryTool } from '../../shared/src/tools/list-directory-tool.js';
import { connectionInfoTool } from '../../shared/src/tools/connection-info-tool.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import 'dotenv/config';

describe('SSH MCP Server - Manual Tests', () => {
  let server: Server;
  let clientFactory: () => SSHClient;

  beforeAll(() => {
    // Create MCP server
    const { server: mcpServer } = createMCPServer();
    server = mcpServer;

    // Create client factory using env config
    const config = createSSHConfigFromEnv();
    clientFactory = () => new SSHClient(config);

    console.log('\n=== SSH Configuration ===');
    console.log(`Host: ${config.host}`);
    console.log(`Port: ${config.port}`);
    console.log(`Username: ${config.username}`);
    console.log(
      `Agent Socket: ${config.agentSocket || process.env.SSH_AUTH_SOCK || 'auto-detected'}`
    );
    console.log('========================\n');
  });

  afterAll(() => {
    // Clean up
  });

  describe('SSH Agent Authentication', () => {
    it('should connect via SSH agent with passphrase-protected key', async () => {
      const tool = executeTool(server, clientFactory);
      const result = await tool.handler({
        command: 'echo "SSH Agent Authentication Works!"',
      });

      console.log('Execute result:', JSON.stringify(result, null, 2));

      expect(result).not.toHaveProperty('isError', true);
      const content = JSON.parse((result as { content: Array<{ text: string }> }).content[0].text);
      expect(content.exitCode).toBe(0);
      expect(content.stdout).toContain('SSH Agent Authentication Works!');
    }, 30000);
  });

  describe('ssh_execute', () => {
    it('should execute command and return result', async () => {
      const tool = executeTool(server, clientFactory);
      const result = await tool.handler({
        command: 'uname -a',
      });

      console.log('uname result:', JSON.stringify(result, null, 2));

      expect(result).not.toHaveProperty('isError', true);
      const content = JSON.parse((result as { content: Array<{ text: string }> }).content[0].text);
      expect(content.exitCode).toBe(0);
      expect(content.stdout).toBeTruthy();
    }, 30000);

    it('should execute command with working directory', async () => {
      const tool = executeTool(server, clientFactory);
      const result = await tool.handler({
        command: 'pwd',
        cwd: '/tmp',
      });

      console.log('pwd result:', JSON.stringify(result, null, 2));

      expect(result).not.toHaveProperty('isError', true);
      const content = JSON.parse((result as { content: Array<{ text: string }> }).content[0].text);
      expect(content.exitCode).toBe(0);
      expect(content.stdout.trim()).toBe('/tmp');
    }, 30000);

    it('should handle non-zero exit codes', async () => {
      const tool = executeTool(server, clientFactory);
      const result = await tool.handler({
        command: 'exit 42',
      });

      console.log('exit 42 result:', JSON.stringify(result, null, 2));

      expect(result).not.toHaveProperty('isError', true);
      const content = JSON.parse((result as { content: Array<{ text: string }> }).content[0].text);
      expect(content.exitCode).toBe(42);
    }, 30000);
  });

  describe('ssh_list_directory', () => {
    it('should list directory contents', async () => {
      const tool = listDirectoryTool(server, clientFactory);
      const result = await tool.handler({
        path: '/tmp',
      });

      console.log('list /tmp result:', JSON.stringify(result, null, 2));

      expect(result).not.toHaveProperty('isError', true);
      const content = JSON.parse((result as { content: Array<{ text: string }> }).content[0].text);
      expect(Array.isArray(content)).toBe(true);
    }, 30000);

    it('should list root directory', async () => {
      const tool = listDirectoryTool(server, clientFactory);
      const result = await tool.handler({
        path: '/',
      });

      console.log(
        'list / result (first 5 entries):',
        JSON.stringify(result, null, 2).slice(0, 500)
      );

      expect(result).not.toHaveProperty('isError', true);
      const content = JSON.parse((result as { content: Array<{ text: string }> }).content[0].text);
      expect(Array.isArray(content)).toBe(true);
      expect(content.length).toBeGreaterThan(0);
      // Should have standard directories
      const names = content.map((e: { name: string }) => e.name);
      expect(names).toContain('tmp');
    }, 30000);
  });

  describe('ssh_connection_info', () => {
    it('should return connection information', async () => {
      const tool = connectionInfoTool(server, clientFactory);
      const result = await tool.handler({});

      console.log('connection info result:', JSON.stringify(result, null, 2));

      expect(result).not.toHaveProperty('isError', true);
      const content = JSON.parse((result as { content: Array<{ text: string }> }).content[0].text);
      expect(content.host).toBe(process.env.SSH_HOST);
      expect(content.username).toBe(process.env.SSH_USERNAME);
    });
  });
});
