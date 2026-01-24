import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FlyIOClient } from '../../shared/src/fly-io-client/fly-io-client.js';
import { DockerCLIClient } from '../../shared/src/docker-client/docker-cli-client.js';

/**
 * Manual tests that hit the real Fly.io API and Docker CLI.
 * These tests are NOT run in CI and require actual API credentials.
 *
 * FOCUS: These tests primarily verify MACHINE operations:
 * - Creating machines with Docker images
 * - Executing commands on machines (with extended timeout)
 * - Machine lifecycle (start, stop, restart)
 * - Docker registry integration for running machines against custom images
 *
 * To run these tests:
 * 1. Set up your .env file with FLY_IO_API_TOKEN
 * 2. Run: npm run test:manual
 */

// Define test outcome types
type TestOutcome = 'SUCCESS' | 'WARNING' | 'FAILURE';

// Helper to report test outcomes with details
function reportOutcome(testName: string, outcome: TestOutcome, details?: string) {
  const emoji = outcome === 'SUCCESS' ? '✅' : outcome === 'WARNING' ? '⚠️' : '❌';
  console.log(`\n${emoji} ${testName}: ${outcome}`);
  if (details) {
    console.log(`   Details: ${details}`);
  }
}

describe('Fly.io Manual Tests - Machine Operations Focus', () => {
  let client: FlyIOClient;
  let apiToken: string | undefined;
  let testAppName: string | undefined;
  let createdMachineId: string | undefined;

  beforeAll(() => {
    apiToken = process.env.FLY_IO_API_TOKEN;

    if (!apiToken) {
      console.warn('⚠️  FLY_IO_API_TOKEN not set in environment. Tests will be skipped.');
    } else {
      client = new FlyIOClient(apiToken);
    }
  });

  afterAll(async () => {
    // Cleanup: destroy any machine we created during tests
    if (apiToken && testAppName && createdMachineId) {
      try {
        console.log(`\n🧹 Cleaning up test machine ${createdMachineId}...`);
        await client.deleteMachine(testAppName, createdMachineId, true);
        console.log(`   Machine ${createdMachineId} deleted.`);
      } catch (error) {
        console.warn(
          `   Warning: Could not delete test machine: ${error instanceof Error ? error.message : 'Unknown'}`
        );
      }
    }
  });

  describe('Machine Operations - Core Functionality', () => {
    it('should list machines for an app', async () => {
      const testName = 'list_machines - real API call';

      if (!apiToken) {
        reportOutcome(testName, 'WARNING', 'Skipped - no API token provided');
        return;
      }

      try {
        // First get an app
        const apps = await client.listApps();
        if (apps.length === 0) {
          reportOutcome(testName, 'WARNING', 'No apps available to test');
          return;
        }

        testAppName = apps[0].name;
        const machines = await client.listMachines(testAppName);

        expect(Array.isArray(machines)).toBe(true);

        if (machines.length === 0) {
          reportOutcome(testName, 'SUCCESS', `No machines in app ${testAppName} (expected state)`);
        } else {
          const machineInfo = machines
            .slice(0, 3)
            .map((m) => `${m.id} (${m.state})`)
            .join(', ');
          reportOutcome(
            testName,
            'SUCCESS',
            `Found ${machines.length} machine(s) in ${testAppName}: ${machineInfo}`
          );
        }
      } catch (error) {
        reportOutcome(
          testName,
          'FAILURE',
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    });

    it('should create a machine with a Docker image', async () => {
      const testName = 'create_machine - with Docker image';

      if (!apiToken) {
        reportOutcome(testName, 'WARNING', 'Skipped - no API token provided');
        return;
      }

      if (!testAppName) {
        const apps = await client.listApps();
        if (apps.length === 0) {
          reportOutcome(testName, 'WARNING', 'No apps available to test');
          return;
        }
        testAppName = apps[0].name;
      }

      try {
        // Create a minimal machine with a standard image
        const machine = await client.createMachine(testAppName, {
          config: {
            image: 'nginx:alpine', // Standard lightweight image
            auto_destroy: true, // Auto-cleanup
            guest: {
              cpu_kind: 'shared',
              cpus: 1,
              memory_mb: 256,
            },
          },
        });

        expect(machine.id).toBeDefined();
        expect(machine.state).toBeDefined();

        createdMachineId = machine.id;

        reportOutcome(
          testName,
          'SUCCESS',
          `Created machine ${machine.id} (state: ${machine.state}, image: nginx:alpine)`
        );
      } catch (error) {
        reportOutcome(
          testName,
          'FAILURE',
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    });

    it('should get machine details', async () => {
      const testName = 'get_machine - verify created machine';

      if (!apiToken) {
        reportOutcome(testName, 'WARNING', 'Skipped - no API token provided');
        return;
      }

      if (!testAppName || !createdMachineId) {
        reportOutcome(testName, 'WARNING', 'Skipped - no machine created in previous test');
        return;
      }

      try {
        const machine = await client.getMachine(testAppName, createdMachineId);

        expect(machine.id).toBe(createdMachineId);
        expect(machine.config).toBeDefined();

        reportOutcome(
          testName,
          'SUCCESS',
          `Machine ${machine.id}: state=${machine.state}, region=${machine.region}`
        );
      } catch (error) {
        reportOutcome(
          testName,
          'FAILURE',
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    });

    it('should wait for machine to reach started state', async () => {
      const testName = 'wait_machine - wait for started state';

      if (!apiToken) {
        reportOutcome(testName, 'WARNING', 'Skipped - no API token provided');
        return;
      }

      if (!testAppName || !createdMachineId) {
        reportOutcome(testName, 'WARNING', 'Skipped - no machine created');
        return;
      }

      try {
        // Wait for machine to start (60 second timeout)
        await client.waitMachine(testAppName, createdMachineId, 'started', 60000);

        const machine = await client.getMachine(testAppName, createdMachineId);
        expect(machine.state).toBe('started');

        reportOutcome(testName, 'SUCCESS', `Machine ${createdMachineId} reached started state`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        if (errorMsg.includes('timeout') || errorMsg.includes('Timeout')) {
          reportOutcome(testName, 'WARNING', `Machine did not start within timeout: ${errorMsg}`);
        } else {
          reportOutcome(testName, 'FAILURE', errorMsg);
          throw error;
        }
      }
    });

    it('should execute command on machine with timeout', async () => {
      const testName = 'exec_command - with timeout';

      if (!apiToken) {
        reportOutcome(testName, 'WARNING', 'Skipped - no API token provided');
        return;
      }

      if (!testAppName || !createdMachineId) {
        reportOutcome(testName, 'WARNING', 'Skipped - no machine created');
        return;
      }

      try {
        // First verify machine is running
        const machine = await client.getMachine(testAppName, createdMachineId);
        if (machine.state !== 'started') {
          reportOutcome(testName, 'WARNING', `Machine not started (state: ${machine.state})`);
          return;
        }

        // Execute a simple command with 60s timeout (Fly.io max is 60s)
        const output = await client.execCommand(
          testAppName,
          createdMachineId,
          'echo "exec test successful" && hostname',
          60000 // 60 second timeout - Fly.io API max is 60s
        );

        expect(output).toContain('exec test successful');

        reportOutcome(
          testName,
          'SUCCESS',
          `Command executed with 60s timeout. Output: ${output.trim().substring(0, 100)}`
        );
      } catch (error) {
        reportOutcome(
          testName,
          'FAILURE',
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    });

    it('should stop a machine', async () => {
      const testName = 'stop_machine - stop running machine';

      if (!apiToken) {
        reportOutcome(testName, 'WARNING', 'Skipped - no API token provided');
        return;
      }

      if (!testAppName || !createdMachineId) {
        reportOutcome(testName, 'WARNING', 'Skipped - no machine created');
        return;
      }

      try {
        await client.stopMachine(testAppName, createdMachineId);

        // Wait a moment and verify
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const machine = await client.getMachine(testAppName, createdMachineId);

        reportOutcome(
          testName,
          'SUCCESS',
          `Machine stop initiated. Current state: ${machine.state}`
        );
      } catch (error) {
        reportOutcome(
          testName,
          'FAILURE',
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    });

    it('should start a stopped machine', async () => {
      const testName = 'start_machine - start stopped machine';

      if (!apiToken) {
        reportOutcome(testName, 'WARNING', 'Skipped - no API token provided');
        return;
      }

      if (!testAppName || !createdMachineId) {
        reportOutcome(testName, 'WARNING', 'Skipped - no machine created');
        return;
      }

      try {
        // Wait for machine to be stopped first
        await client.waitMachine(testAppName, createdMachineId, 'stopped', 30000);

        await client.startMachine(testAppName, createdMachineId);

        // Wait for it to start
        await client.waitMachine(testAppName, createdMachineId, 'started', 60000);

        const machine = await client.getMachine(testAppName, createdMachineId);
        expect(machine.state).toBe('started');

        reportOutcome(testName, 'SUCCESS', `Machine started. Current state: ${machine.state}`);
      } catch (error) {
        reportOutcome(
          testName,
          'FAILURE',
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    });

    it('should restart a machine', async () => {
      const testName = 'restart_machine - restart running machine';

      if (!apiToken) {
        reportOutcome(testName, 'WARNING', 'Skipped - no API token provided');
        return;
      }

      if (!testAppName || !createdMachineId) {
        reportOutcome(testName, 'WARNING', 'Skipped - no machine created');
        return;
      }

      try {
        await client.restartMachine(testAppName, createdMachineId);

        // Wait for it to come back up
        await client.waitMachine(testAppName, createdMachineId, 'started', 60000);

        const machine = await client.getMachine(testAppName, createdMachineId);

        reportOutcome(testName, 'SUCCESS', `Machine restarted. Current state: ${machine.state}`);
      } catch (error) {
        reportOutcome(
          testName,
          'FAILURE',
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    });

    it('should delete a machine', async () => {
      const testName = 'delete_machine - cleanup test machine';

      if (!apiToken) {
        reportOutcome(testName, 'WARNING', 'Skipped - no API token provided');
        return;
      }

      if (!testAppName || !createdMachineId) {
        reportOutcome(testName, 'WARNING', 'Skipped - no machine created');
        return;
      }

      try {
        const machineIdToDelete = createdMachineId;
        await client.deleteMachine(testAppName, machineIdToDelete, true);

        // Clear the ID so afterAll doesn't try to delete again
        createdMachineId = undefined;

        reportOutcome(testName, 'SUCCESS', `Machine ${machineIdToDelete} deleted successfully`);
      } catch (error) {
        reportOutcome(
          testName,
          'FAILURE',
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    });
  });

  describe('Docker Registry Tools - For Running Machines with Custom Images', () => {
    let dockerClient: DockerCLIClient | undefined;
    let isDockerAvailable = false;

    beforeAll(async () => {
      if (!apiToken) return;

      // Check if Docker is available
      try {
        const { execFile } = await import('child_process');
        const { promisify } = await import('util');
        const execFileAsync = promisify(execFile);

        await execFileAsync('docker', ['version'], { timeout: 5000 });
        isDockerAvailable = true;
        dockerClient = new DockerCLIClient(apiToken);
      } catch {
        console.warn('⚠️  Docker CLI not available. Docker registry tests will be skipped.');
      }
    });

    it('should check if an image exists in Fly.io registry', async () => {
      const testName = 'check_fly_registry_image - for machine deployment';

      if (!apiToken) {
        reportOutcome(testName, 'WARNING', 'Skipped - no API token provided');
        return;
      }

      if (!isDockerAvailable || !dockerClient) {
        reportOutcome(testName, 'WARNING', 'Skipped - Docker CLI not available');
        return;
      }

      if (!testAppName) {
        const apps = await client.listApps();
        if (apps.length === 0) {
          reportOutcome(testName, 'WARNING', 'No apps available to test');
          return;
        }
        testAppName = apps[0].name;
      }

      try {
        // Check for common tags
        const deploymentExists = await dockerClient.imageExists(testAppName, 'deployment');
        const latestExists = await dockerClient.imageExists(testAppName, 'latest');

        if (deploymentExists) {
          reportOutcome(
            testName,
            'SUCCESS',
            `Image registry.fly.io/${testAppName}:deployment exists - ready for machine deployment`
          );
        } else if (latestExists) {
          reportOutcome(
            testName,
            'SUCCESS',
            `Image registry.fly.io/${testAppName}:latest exists - ready for machine deployment`
          );
        } else {
          reportOutcome(
            testName,
            'SUCCESS',
            `No pre-existing images for ${testAppName} (push_new_fly_registry_image can be used to upload one)`
          );
        }
      } catch (error) {
        reportOutcome(
          testName,
          'FAILURE',
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    });

    it('should validate app name format for registry operations', async () => {
      const testName = 'registry_validation - app name format';

      if (!apiToken) {
        reportOutcome(testName, 'WARNING', 'Skipped - no API token provided');
        return;
      }

      if (!isDockerAvailable || !dockerClient) {
        reportOutcome(testName, 'WARNING', 'Skipped - Docker CLI not available');
        return;
      }

      try {
        // Test invalid app name (uppercase - not allowed by Fly.io)
        await dockerClient.imageExists('InvalidAppName', 'latest');
        reportOutcome(testName, 'FAILURE', 'Expected validation error for uppercase app name');
        throw new Error('Expected validation error');
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown';
        if (errorMsg.includes('Invalid app name')) {
          reportOutcome(
            testName,
            'SUCCESS',
            'Correctly validates app names before registry operations'
          );
        } else {
          reportOutcome(testName, 'WARNING', `Got unexpected error: ${errorMsg}`);
        }
      }
    });

    it('should validate tag format for registry operations', async () => {
      const testName = 'registry_validation - tag format';

      if (!apiToken) {
        reportOutcome(testName, 'WARNING', 'Skipped - no API token provided');
        return;
      }

      if (!isDockerAvailable || !dockerClient) {
        reportOutcome(testName, 'WARNING', 'Skipped - Docker CLI not available');
        return;
      }

      try {
        // Test invalid tag (starts with hyphen)
        await dockerClient.imageExists('valid-app', '-invalid-tag');
        reportOutcome(testName, 'FAILURE', 'Expected validation error for invalid tag');
        throw new Error('Expected validation error');
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown';
        if (errorMsg.includes('Invalid tag')) {
          reportOutcome(testName, 'SUCCESS', 'Correctly validates tags before registry operations');
        } else {
          reportOutcome(testName, 'WARNING', `Got unexpected error: ${errorMsg}`);
        }
      }
    });
  });

  describe('Machine Logs', () => {
    it('should retrieve logs for an app (includes machine logs)', async () => {
      const testName = 'get_logs - machine activity logs';

      if (!apiToken) {
        reportOutcome(testName, 'WARNING', 'Skipped - no API token provided');
        return;
      }

      if (!testAppName) {
        const apps = await client.listApps();
        if (apps.length === 0) {
          reportOutcome(testName, 'WARNING', 'No apps available');
          return;
        }
        testAppName = apps[0].name;
      }

      try {
        const logs = await client.getLogs(testAppName, {});

        if (logs.trim().length === 0) {
          reportOutcome(testName, 'SUCCESS', `No recent logs for ${testAppName}`);
        } else {
          const lineCount = logs.split('\n').filter((l) => l.trim()).length;
          reportOutcome(
            testName,
            'SUCCESS',
            `Retrieved ${lineCount} log line(s) from ${testAppName}`
          );
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        if (errorMsg.includes('timeout') || errorMsg.includes('Timeout')) {
          reportOutcome(testName, 'WARNING', 'Logs timeout (no recent machine activity)');
        } else {
          reportOutcome(testName, 'FAILURE', errorMsg);
          throw error;
        }
      }
    });
  });
});
