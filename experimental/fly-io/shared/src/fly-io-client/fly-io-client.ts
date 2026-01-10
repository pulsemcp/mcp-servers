import type {
  App,
  Machine,
  CreateAppRequest,
  CreateMachineRequest,
  UpdateMachineRequest,
  MachineState,
} from '../types.js';

/**
 * Interface for Fly.io API client
 * This allows for dependency injection and easier testing
 */
export interface IFlyIOClient {
  // App operations
  listApps(orgSlug?: string): Promise<App[]>;
  getApp(appName: string): Promise<App>;
  createApp(request: CreateAppRequest): Promise<App>;
  deleteApp(appName: string, force?: boolean): Promise<void>;

  // Machine operations
  listMachines(appName: string): Promise<Machine[]>;
  getMachine(appName: string, machineId: string): Promise<Machine>;
  createMachine(appName: string, request: CreateMachineRequest): Promise<Machine>;
  updateMachine(
    appName: string,
    machineId: string,
    request: UpdateMachineRequest
  ): Promise<Machine>;
  deleteMachine(appName: string, machineId: string, force?: boolean): Promise<void>;
  startMachine(appName: string, machineId: string): Promise<void>;
  stopMachine(appName: string, machineId: string): Promise<void>;
  restartMachine(appName: string, machineId: string): Promise<void>;
  suspendMachine(appName: string, machineId: string): Promise<void>;
  waitMachine(
    appName: string,
    machineId: string,
    state: MachineState,
    timeout?: number
  ): Promise<void>;
}

/**
 * Fly.io API client implementation
 */
export class FlyIOClient implements IFlyIOClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(apiToken: string, baseUrl: string = 'https://api.machines.dev') {
    this.baseUrl = baseUrl;
    this.headers = {
      Authorization: `Bearer ${apiToken}`,
    };
  }

  // App operations
  async listApps(orgSlug?: string): Promise<App[]> {
    const { listApps } = await import('./lib/list-apps.js');
    return listApps(this.baseUrl, this.headers, orgSlug);
  }

  async getApp(appName: string): Promise<App> {
    const { getApp } = await import('./lib/get-app.js');
    return getApp(this.baseUrl, this.headers, appName);
  }

  async createApp(request: CreateAppRequest): Promise<App> {
    const { createApp } = await import('./lib/create-app.js');
    return createApp(this.baseUrl, this.headers, request);
  }

  async deleteApp(appName: string, force: boolean = false): Promise<void> {
    const { deleteApp } = await import('./lib/delete-app.js');
    return deleteApp(this.baseUrl, this.headers, appName, force);
  }

  // Machine operations
  async listMachines(appName: string): Promise<Machine[]> {
    const { listMachines } = await import('./lib/list-machines.js');
    return listMachines(this.baseUrl, this.headers, appName);
  }

  async getMachine(appName: string, machineId: string): Promise<Machine> {
    const { getMachine } = await import('./lib/get-machine.js');
    return getMachine(this.baseUrl, this.headers, appName, machineId);
  }

  async createMachine(appName: string, request: CreateMachineRequest): Promise<Machine> {
    const { createMachine } = await import('./lib/create-machine.js');
    return createMachine(this.baseUrl, this.headers, appName, request);
  }

  async updateMachine(
    appName: string,
    machineId: string,
    request: UpdateMachineRequest
  ): Promise<Machine> {
    const { updateMachine } = await import('./lib/update-machine.js');
    return updateMachine(this.baseUrl, this.headers, appName, machineId, request);
  }

  async deleteMachine(appName: string, machineId: string, force: boolean = false): Promise<void> {
    const { deleteMachine } = await import('./lib/delete-machine.js');
    return deleteMachine(this.baseUrl, this.headers, appName, machineId, force);
  }

  async startMachine(appName: string, machineId: string): Promise<void> {
    const { startMachine } = await import('./lib/start-machine.js');
    return startMachine(this.baseUrl, this.headers, appName, machineId);
  }

  async stopMachine(appName: string, machineId: string): Promise<void> {
    const { stopMachine } = await import('./lib/stop-machine.js');
    return stopMachine(this.baseUrl, this.headers, appName, machineId);
  }

  async restartMachine(appName: string, machineId: string): Promise<void> {
    const { restartMachine } = await import('./lib/restart-machine.js');
    return restartMachine(this.baseUrl, this.headers, appName, machineId);
  }

  async suspendMachine(appName: string, machineId: string): Promise<void> {
    const { suspendMachine } = await import('./lib/suspend-machine.js');
    return suspendMachine(this.baseUrl, this.headers, appName, machineId);
  }

  async waitMachine(
    appName: string,
    machineId: string,
    state: MachineState,
    timeout?: number
  ): Promise<void> {
    const { waitMachine } = await import('./lib/wait-machine.js');
    return waitMachine(this.baseUrl, this.headers, appName, machineId, state, timeout);
  }
}
