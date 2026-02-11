import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('SSH MCP Server - Manual Tests', () => {
  let client: TestMCPClient;

  beforeAll(async () => {
    if (!process.env.SSH_HOST || !process.env.SSH_USERNAME) {
      throw new Error('Manual tests require SSH_HOST and SSH_USERNAME environment variables');
    }

    const serverPath = path.join(__dirname, '../../local/build/index.js');

    const env: Record<string, string> = {
      SSH_HOST: process.env.SSH_HOST,
      SSH_USERNAME: process.env.SSH_USERNAME,
      SKIP_HEALTH_CHECKS: 'true',
    };

    if (process.env.SSH_AUTH_SOCK) {
      env.SSH_AUTH_SOCK = process.env.SSH_AUTH_SOCK;
    }
    if (process.env.SSH_PRIVATE_KEY_PATH) {
      env.SSH_PRIVATE_KEY_PATH = process.env.SSH_PRIVATE_KEY_PATH;
    }
    if (process.env.SSH_PORT) {
      env.SSH_PORT = process.env.SSH_PORT;
    }
    if (process.env.SSH_PASSPHRASE) {
      env.SSH_PASSPHRASE = process.env.SSH_PASSPHRASE;
    }

    client = new TestMCPClient({
      serverPath,
      env,
      debug: false,
    });

    await client.connect();

    console.log('\n=== SSH Configuration ===');
    console.log(`Host: ${process.env.SSH_HOST}`);
    console.log(`Port: ${process.env.SSH_PORT || '22'}`);
    console.log(`Username: ${process.env.SSH_USERNAME}`);
    console.log(`Agent Socket: ${process.env.SSH_AUTH_SOCK || 'auto-detected'}`);
    console.log('========================\n');
  });

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  describe('SSH Agent Authentication', () => {
    it('should connect via SSH agent with passphrase-protected key', async () => {
      const result = await client.callTool<{ type: string; text: string }>('ssh_execute', {
        command: 'echo "SSH Agent Authentication Works!"',
      });

      console.log('Execute result:', JSON.stringify(result, null, 2));

      expect(result.isError).toBeFalsy();
      const content = JSON.parse(result.content[0].text);
      expect(content.exitCode).toBe(0);
      expect(content.stdout).toContain('SSH Agent Authentication Works!');
    }, 30000);
  });

  describe('ssh_execute', () => {
    it('should execute command and return result', async () => {
      const result = await client.callTool<{ type: string; text: string }>('ssh_execute', {
        command: 'uname -a',
      });

      console.log('uname result:', JSON.stringify(result, null, 2));

      expect(result.isError).toBeFalsy();
      const content = JSON.parse(result.content[0].text);
      expect(content.exitCode).toBe(0);
      expect(content.stdout).toBeTruthy();
    }, 30000);

    it('should execute command with working directory', async () => {
      const result = await client.callTool<{ type: string; text: string }>('ssh_execute', {
        command: 'pwd',
        cwd: '/tmp',
      });

      console.log('pwd result:', JSON.stringify(result, null, 2));

      expect(result.isError).toBeFalsy();
      const content = JSON.parse(result.content[0].text);
      expect(content.exitCode).toBe(0);
      expect(content.stdout.trim()).toBe('/tmp');
    }, 30000);

    it('should handle non-zero exit codes', async () => {
      const result = await client.callTool<{ type: string; text: string }>('ssh_execute', {
        command: 'exit 42',
      });

      console.log('exit 42 result:', JSON.stringify(result, null, 2));

      expect(result.isError).toBeFalsy();
      const content = JSON.parse(result.content[0].text);
      expect(content.exitCode).toBe(42);
    }, 30000);
  });

  describe('ssh_list_directory', () => {
    it('should list directory contents', async () => {
      const result = await client.callTool<{ type: string; text: string }>('ssh_list_directory', {
        path: '/tmp',
      });

      console.log('list /tmp result:', JSON.stringify(result, null, 2));

      expect(result.isError).toBeFalsy();
      const content = JSON.parse(result.content[0].text);
      expect(Array.isArray(content)).toBe(true);
    }, 30000);

    it('should list root directory', async () => {
      const result = await client.callTool<{ type: string; text: string }>('ssh_list_directory', {
        path: '/',
      });

      console.log(
        'list / result (first 500 chars):',
        JSON.stringify(result, null, 2).slice(0, 500)
      );

      expect(result.isError).toBeFalsy();
      const content = JSON.parse(result.content[0].text);
      expect(Array.isArray(content)).toBe(true);
      expect(content.length).toBeGreaterThan(0);
      // Should have standard directories
      const names = content.map((e: { name: string }) => e.name);
      expect(names).toContain('tmp');
    }, 30000);
  });

  describe('ssh_connection_info', () => {
    it('should return connection information', async () => {
      const result = await client.callTool<{ type: string; text: string }>(
        'ssh_connection_info',
        {}
      );

      console.log('connection info result:', JSON.stringify(result, null, 2));

      expect(result.isError).toBeFalsy();
      const content = JSON.parse(result.content[0].text);
      expect(content.host).toBe(process.env.SSH_HOST);
      expect(content.username).toBe(process.env.SSH_USERNAME);
    });
  });
});
