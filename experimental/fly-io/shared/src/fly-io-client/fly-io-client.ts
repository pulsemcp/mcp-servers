import type {
  App,
  Machine,
  CreateAppRequest,
  CreateMachineRequest,
  UpdateMachineRequest,
  MachineState,
  ImageDetails,
  Release,
} from '../types.js';
import {
  FlyCLIClient,
  type LogsOptions,
  type ReleasesOptions,
  type UpdateImageOptions,
} from './fly-cli-client.js';

export { FlyCLIClient, type LogsOptions, type ReleasesOptions, type UpdateImageOptions };

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

  // CLI-specific operations (logs and exec)
  getLogs(appName: string, options?: LogsOptions): Promise<string>;
  execCommand(
    appName: string,
    machineId: string,
    command: string,
    timeout?: number
  ): Promise<string>;

  // Image operations
  showImage(appName: string): Promise<ImageDetails>;
  listReleases(appName: string, options?: ReleasesOptions): Promise<Release[]>;
  updateImage(appName: string, options?: UpdateImageOptions): Promise<ImageDetails>;
}

/**
 * Fly.io client implementation using the fly CLI
 * All operations shell out to the `fly` command
 */
export class FlyIOClient implements IFlyIOClient {
  private client: FlyCLIClient;

  constructor(apiToken: string) {
    this.client = new FlyCLIClient(apiToken);
  }

  // App operations
  async listApps(orgSlug?: string): Promise<App[]> {
    return this.client.listApps(orgSlug);
  }

  async getApp(appName: string): Promise<App> {
    return this.client.getApp(appName);
  }

  async createApp(request: CreateAppRequest): Promise<App> {
    return this.client.createApp(request);
  }

  async deleteApp(appName: string, force: boolean = false): Promise<void> {
    return this.client.deleteApp(appName, force);
  }

  // Machine operations
  async listMachines(appName: string): Promise<Machine[]> {
    return this.client.listMachines(appName);
  }

  async getMachine(appName: string, machineId: string): Promise<Machine> {
    return this.client.getMachine(appName, machineId);
  }

  async createMachine(appName: string, request: CreateMachineRequest): Promise<Machine> {
    return this.client.createMachine(appName, request);
  }

  async updateMachine(
    appName: string,
    machineId: string,
    request: UpdateMachineRequest
  ): Promise<Machine> {
    return this.client.updateMachine(appName, machineId, request);
  }

  async deleteMachine(appName: string, machineId: string, force: boolean = false): Promise<void> {
    return this.client.deleteMachine(appName, machineId, force);
  }

  async startMachine(appName: string, machineId: string): Promise<void> {
    return this.client.startMachine(appName, machineId);
  }

  async stopMachine(appName: string, machineId: string): Promise<void> {
    return this.client.stopMachine(appName, machineId);
  }

  async restartMachine(appName: string, machineId: string): Promise<void> {
    return this.client.restartMachine(appName, machineId);
  }

  async suspendMachine(appName: string, machineId: string): Promise<void> {
    return this.client.suspendMachine(appName, machineId);
  }

  async waitMachine(
    appName: string,
    machineId: string,
    state: MachineState,
    timeout?: number
  ): Promise<void> {
    return this.client.waitMachine(appName, machineId, state, timeout);
  }

  // CLI-specific operations
  async getLogs(appName: string, options?: LogsOptions): Promise<string> {
    return this.client.getLogs(appName, options);
  }

  async execCommand(
    appName: string,
    machineId: string,
    command: string,
    timeout?: number
  ): Promise<string> {
    return this.client.execCommand(appName, machineId, command, timeout);
  }

  // Image operations
  async showImage(appName: string): Promise<ImageDetails> {
    return this.client.showImage(appName);
  }

  async listReleases(appName: string, options?: ReleasesOptions): Promise<Release[]> {
    return this.client.listReleases(appName, options);
  }

  async updateImage(appName: string, options?: UpdateImageOptions): Promise<ImageDetails> {
    return this.client.updateImage(appName, options);
  }
}
