import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Manual tests that hit the real Fly.io API via the MCP server.
 * These tests are NOT run in CI and require actual API credentials.
 *
 * FOCUS: These tests primarily verify MACHINE operations:
 * - Creating machines with Docker images
 * - Executing commands on machines (with extended timeout)
 * - Machine lifecycle (start, stop, restart)
 *
 * To run these tests:
 * 1. Set up your .env file with FLY_IO_API_TOKEN
 * 2. Run: npm run test:manual
 */
describe('Fly.io MCP Server - Manual Tests', () => {
  let client: TestMCPClient;
  let testAppName: string | undefined;
  let createdMachineId: string | undefined;

  beforeAll(async () => {
    const apiToken = process.env.FLY_IO_API_TOKEN;
    if (!apiToken) {
      throw new Error('FLY_IO_API_TOKEN must be set in .env for manual tests');
    }

    const serverPath = path.join(__dirname, '../../local/build/index.js');
    client = new TestMCPClient({
      serverPath,
      env: {
        FLY_IO_API_TOKEN: apiToken,
        SKIP_HEALTH_CHECKS: 'true',
      },
      debug: false,
    });

    await client.connect();
  });

  afterAll(async () => {
    // Cleanup: destroy any machine we created during tests
    if (testAppName && createdMachineId) {
      try {
        console.log(`Cleaning up test machine ${createdMachineId}...`);
        await client.callTool('delete_machine', {
          app_name: testAppName,
          machine_id: createdMachineId,
          force: true,
        });
        console.log(`Machine ${createdMachineId} deleted.`);
      } catch {
        console.warn('Warning: Could not delete test machine during cleanup');
      }
    }

    if (client) {
      await client.disconnect();
    }
  });

  describe('App Operations', () => {
    it('should list apps', async () => {
      const result = await client.callTool('list_apps', {});
      expect(result.isError).toBeFalsy();

      const text = (result.content[0] as { text: string }).text;
      expect(text).toBeDefined();
      console.log(`list_apps response: ${text.substring(0, 200)}`);

      // Extract first app name from formatted text: "- appname (id)"
      const appMatch = text.match(/- (\S+) \(/);
      if (appMatch) {
        testAppName = appMatch[1];
        console.log(`Using app: ${testAppName}`);
      }
    });
  });

  describe('Machine Operations', () => {
    it('should list machines for an app', async () => {
      if (!testAppName) {
        throw new Error('No app available - list_apps test must pass first');
      }

      const result = await client.callTool('list_machines', {
        app_name: testAppName,
      });
      expect(result.isError).toBeFalsy();

      const text = (result.content[0] as { text: string }).text;
      expect(text).toBeDefined();
      console.log(`list_machines response: ${text.substring(0, 200)}`);
    });

    it('should create a machine with a Docker image', async () => {
      if (!testAppName) {
        throw new Error('No app available');
      }

      const result = await client.callTool('create_machine', {
        app_name: testAppName,
        image: 'nginx:alpine',
        auto_destroy: true,
        cpu_kind: 'shared',
        cpus: 1,
        memory_mb: 256,
      });
      expect(result.isError).toBeFalsy();

      const text = (result.content[0] as { text: string }).text;
      expect(text).toBeDefined();

      // Extract machine ID from formatted text: "ID: xxx"
      const idMatch = text.match(/ID:\s*(\S+)/);
      expect(idMatch).toBeTruthy();
      createdMachineId = idMatch![1];

      console.log(`Created machine ${createdMachineId}`);
    });

    it('should get machine details', async () => {
      if (!testAppName || !createdMachineId) {
        throw new Error('No machine created in previous test');
      }

      const result = await client.callTool('get_machine', {
        app_name: testAppName,
        machine_id: createdMachineId,
      });
      expect(result.isError).toBeFalsy();

      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain(createdMachineId);
      console.log(`Machine details: ${text.substring(0, 200)}`);
    });

    it('should wait for machine to reach started state', async () => {
      if (!testAppName || !createdMachineId) {
        throw new Error('No machine created');
      }

      const result = await client.callTool('wait_machine', {
        app_name: testAppName,
        machine_id: createdMachineId,
        state: 'started',
        timeout: 60000,
      });
      expect(result.isError).toBeFalsy();
      console.log(`Machine ${createdMachineId} reached started state`);
    });

    it('should execute command on machine', async () => {
      if (!testAppName || !createdMachineId) {
        throw new Error('No machine created');
      }

      const result = await client.callTool('machine_exec', {
        app_name: testAppName,
        machine_id: createdMachineId,
        command: 'echo "exec test successful" && hostname',
        timeout: 60000,
      });
      expect(result.isError).toBeFalsy();

      const text = result.content[0].text;
      expect(text).toContain('exec test successful');
      console.log(`Command executed. Output: ${text.trim().substring(0, 100)}`);
    });

    it('should stop a machine', async () => {
      if (!testAppName || !createdMachineId) {
        throw new Error('No machine created');
      }

      const result = await client.callTool('stop_machine', {
        app_name: testAppName,
        machine_id: createdMachineId,
      });
      expect(result.isError).toBeFalsy();
      console.log('Machine stop initiated');
    });

    it('should start a stopped machine', async () => {
      if (!testAppName || !createdMachineId) {
        throw new Error('No machine created');
      }

      // Wait for machine to be stopped first
      await client.callTool('wait_machine', {
        app_name: testAppName,
        machine_id: createdMachineId,
        state: 'stopped',
        timeout: 30000,
      });

      const result = await client.callTool('start_machine', {
        app_name: testAppName,
        machine_id: createdMachineId,
      });
      expect(result.isError).toBeFalsy();

      // Wait for it to start
      await client.callTool('wait_machine', {
        app_name: testAppName,
        machine_id: createdMachineId,
        state: 'started',
        timeout: 60000,
      });

      console.log('Machine started successfully');
    });

    it('should restart a machine', async () => {
      if (!testAppName || !createdMachineId) {
        throw new Error('No machine created');
      }

      const result = await client.callTool('restart_machine', {
        app_name: testAppName,
        machine_id: createdMachineId,
      });
      expect(result.isError).toBeFalsy();

      // Wait for it to come back up
      await client.callTool('wait_machine', {
        app_name: testAppName,
        machine_id: createdMachineId,
        state: 'started',
        timeout: 60000,
      });

      console.log('Machine restarted successfully');
    });

    it('should delete a machine', async () => {
      if (!testAppName || !createdMachineId) {
        throw new Error('No machine created');
      }

      const machineIdToDelete = createdMachineId;
      const result = await client.callTool('delete_machine', {
        app_name: testAppName,
        machine_id: machineIdToDelete,
        force: true,
      });
      expect(result.isError).toBeFalsy();

      // Clear the ID so afterAll doesn't try to delete again
      createdMachineId = undefined;
      console.log(`Machine ${machineIdToDelete} deleted successfully`);
    });
  });

  describe('Machine Logs', () => {
    it('should retrieve logs for an app', async () => {
      if (!testAppName) {
        throw new Error('No app available');
      }

      const result = await client.callTool('get_logs', {
        app_name: testAppName,
      });
      expect(result.isError).toBeFalsy();
      console.log(`Retrieved logs for ${testAppName}`);
    });
  });
});
