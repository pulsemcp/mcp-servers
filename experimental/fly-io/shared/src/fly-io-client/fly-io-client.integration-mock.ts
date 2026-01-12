import type { IFlyIOClient } from './fly-io-client.js';
import type {
  App,
  Machine,
  CreateAppRequest,
  CreateMachineRequest,
  UpdateMachineRequest,
  MachineState,
} from '../types.js';

/**
 * Mock data interface for integration tests
 */
export interface MockData {
  apps?: App[];
  machines?: Record<string, Machine[]>; // keyed by app name
  [key: string]: unknown;
}

/**
 * Creates a mock implementation of IFlyIOClient for integration tests.
 * This mocks the EXTERNAL API client (Fly.io REST API), NOT the MCP client.
 * The MCP client (TestMCPClient) is real and tests the actual MCP protocol.
 */
export function createIntegrationMockFlyIOClient(
  mockData: MockData = {}
): IFlyIOClient & { mockData: MockData } {
  // Generate unique IDs
  let idCounter = 1;
  const generateId = () => `mock-id-${idCounter++}`;

  // Mutable state for machines and apps
  const apps: App[] = mockData.apps ? [...mockData.apps] : [];
  const machines: Record<string, Machine[]> = mockData.machines
    ? JSON.parse(JSON.stringify(mockData.machines))
    : {};

  const client: IFlyIOClient & { mockData: MockData } = {
    mockData,

    // App operations
    async listApps(_orgSlug?: string): Promise<App[]> {
      return apps;
    },

    async getApp(appName: string): Promise<App> {
      const app = apps.find((a) => a.name === appName);
      if (!app) {
        throw new Error(`App not found: ${appName}`);
      }
      return app;
    },

    async createApp(request: CreateAppRequest): Promise<App> {
      const newApp: App = {
        id: generateId(),
        name: request.app_name,
        status: 'deployed',
        organization: {
          name: request.org_slug,
          slug: request.org_slug,
        },
        machine_count: 0,
        network: request.network,
      };
      apps.push(newApp);
      machines[request.app_name] = [];
      return newApp;
    },

    async deleteApp(appName: string, _force?: boolean): Promise<void> {
      const index = apps.findIndex((a) => a.name === appName);
      if (index === -1) {
        throw new Error(`App not found: ${appName}`);
      }
      apps.splice(index, 1);
      delete machines[appName];
    },

    // Machine operations
    async listMachines(appName: string): Promise<Machine[]> {
      return machines[appName] || [];
    },

    async getMachine(appName: string, machineId: string): Promise<Machine> {
      const appMachines = machines[appName] || [];
      const machine = appMachines.find((m) => m.id === machineId);
      if (!machine) {
        throw new Error(`Machine not found: ${machineId}`);
      }
      return machine;
    },

    async createMachine(appName: string, request: CreateMachineRequest): Promise<Machine> {
      if (!machines[appName]) {
        machines[appName] = [];
      }

      const now = new Date().toISOString();
      const newMachine: Machine = {
        id: generateId(),
        name: request.name || `machine-${Date.now()}`,
        state: request.skip_launch ? 'stopped' : 'started',
        region: request.region || 'iad',
        instance_id: generateId(),
        private_ip: `fdaa:0:1::${Math.floor(Math.random() * 255)}`,
        config: request.config,
        created_at: now,
        updated_at: now,
      };

      machines[appName].push(newMachine);

      // Update app machine count
      const app = apps.find((a) => a.name === appName);
      if (app) {
        app.machine_count = machines[appName].length;
      }

      return newMachine;
    },

    async updateMachine(
      appName: string,
      machineId: string,
      request: UpdateMachineRequest
    ): Promise<Machine> {
      const appMachines = machines[appName] || [];
      const machineIndex = appMachines.findIndex((m) => m.id === machineId);
      if (machineIndex === -1) {
        throw new Error(`Machine not found: ${machineId}`);
      }

      const machine = appMachines[machineIndex];
      const updatedMachine: Machine = {
        ...machine,
        config: request.config,
        state: request.skip_launch ? 'stopped' : 'started',
        updated_at: new Date().toISOString(),
      };

      machines[appName][machineIndex] = updatedMachine;
      return updatedMachine;
    },

    async deleteMachine(appName: string, machineId: string, _force?: boolean): Promise<void> {
      const appMachines = machines[appName] || [];
      const machineIndex = appMachines.findIndex((m) => m.id === machineId);
      if (machineIndex === -1) {
        throw new Error(`Machine not found: ${machineId}`);
      }
      machines[appName].splice(machineIndex, 1);

      // Update app machine count
      const app = apps.find((a) => a.name === appName);
      if (app) {
        app.machine_count = machines[appName].length;
      }
    },

    async startMachine(appName: string, machineId: string): Promise<void> {
      const appMachines = machines[appName] || [];
      const machine = appMachines.find((m) => m.id === machineId);
      if (!machine) {
        throw new Error(`Machine not found: ${machineId}`);
      }
      machine.state = 'started';
      machine.updated_at = new Date().toISOString();
    },

    async stopMachine(appName: string, machineId: string): Promise<void> {
      const appMachines = machines[appName] || [];
      const machine = appMachines.find((m) => m.id === machineId);
      if (!machine) {
        throw new Error(`Machine not found: ${machineId}`);
      }
      machine.state = 'stopped';
      machine.updated_at = new Date().toISOString();
    },

    async restartMachine(appName: string, machineId: string): Promise<void> {
      const appMachines = machines[appName] || [];
      const machine = appMachines.find((m) => m.id === machineId);
      if (!machine) {
        throw new Error(`Machine not found: ${machineId}`);
      }
      // Simulate restart by stopping then starting
      machine.state = 'started';
      machine.updated_at = new Date().toISOString();
    },

    async suspendMachine(appName: string, machineId: string): Promise<void> {
      const appMachines = machines[appName] || [];
      const machine = appMachines.find((m) => m.id === machineId);
      if (!machine) {
        throw new Error(`Machine not found: ${machineId}`);
      }
      machine.state = 'suspended';
      machine.updated_at = new Date().toISOString();
    },

    async waitMachine(
      appName: string,
      machineId: string,
      _state: MachineState,
      _timeout?: number
    ): Promise<void> {
      const appMachines = machines[appName] || [];
      const machine = appMachines.find((m) => m.id === machineId);
      if (!machine) {
        throw new Error(`Machine not found: ${machineId}`);
      }
      // In mock, just return immediately (state is already reached)
    },

    // CLI-specific operations
    async getLogs(
      appName: string,
      _options?: { region?: string; machineId?: string }
    ): Promise<string> {
      // Check if app exists
      const app = apps.find((a) => a.name === appName);
      if (!app) {
        throw new Error(`App not found: ${appName}`);
      }
      return `2025-01-01T00:00:00Z app[mock-machine-id] INFO: Application started on ${appName}`;
    },

    async execCommand(
      appName: string,
      machineId: string,
      command: string,
      _timeout?: number
    ): Promise<string> {
      const appMachines = machines[appName] || [];
      const machine = appMachines.find((m) => m.id === machineId);
      if (!machine) {
        throw new Error(`Machine not found: ${machineId}`);
      }
      return `Executed: ${command}`;
    },
  };

  return client;
}
