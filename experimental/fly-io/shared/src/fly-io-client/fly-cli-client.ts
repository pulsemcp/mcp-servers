import { execFile } from 'child_process';
import { promisify } from 'util';
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

const execFileAsync = promisify(execFile);

/**
 * Extended interface for Fly.io client with CLI-specific features
 */
export interface IFlyIOClientExtended {
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

  // CLI-specific operations (not available via REST API)
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

export interface ReleasesOptions {
  limit?: number;
}

export interface UpdateImageOptions {
  image?: string;
}

export interface LogsOptions {
  region?: string;
  machineId?: string;
}

/**
 * Fly.io CLI client implementation
 * Shells out to the `fly` CLI for all operations
 */
export class FlyCLIClient implements IFlyIOClientExtended {
  private apiToken: string;

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  /**
   * Execute a fly CLI command using execFile (not shell) to prevent command injection
   */
  private async execFly(
    args: string[],
    options: { json?: boolean; timeout?: number } = {}
  ): Promise<string> {
    const { json = true, timeout = 30000 } = options;
    const allArgs = json ? [...args, '--json'] : args;

    try {
      // Use execFile instead of exec to prevent shell command injection
      // Arguments are passed as an array, not concatenated into a shell string
      const { stdout, stderr } = await execFileAsync('fly', allArgs, {
        env: {
          ...process.env,
          FLY_API_TOKEN: this.apiToken,
        },
        timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for logs
      });

      if (stderr && !stdout) {
        throw new Error(stderr);
      }

      return stdout.trim();
    } catch (error) {
      if (error instanceof Error) {
        // Extract meaningful error message
        const message = error.message.includes('Command failed')
          ? error.message.split('\n').slice(1).join('\n').trim() || error.message
          : error.message;
        throw new Error(`fly CLI error: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Parse JSON output from fly CLI, handling potential non-JSON prefixes
   */
  private parseJson<T>(output: string): T {
    // Sometimes fly CLI outputs warnings before JSON
    const jsonStart = output.indexOf('[') !== -1 ? output.indexOf('[') : output.indexOf('{');
    if (jsonStart === -1) {
      throw new Error(`Invalid JSON response: ${output.substring(0, 200)}`);
    }
    const jsonStr = output.substring(jsonStart);
    return JSON.parse(jsonStr);
  }

  // ==========================================================================
  // App operations
  // ==========================================================================

  async listApps(orgSlug?: string): Promise<App[]> {
    const args = ['apps', 'list'];
    if (orgSlug) {
      args.push('--org', orgSlug);
    }

    const output = await this.execFly(args);
    // CLI returns Organization as an object with Name and Slug properties
    const apps = this.parseJson<
      Array<{
        ID?: string;
        Name: string;
        Organization: { Name: string; Slug: string } | null;
        Status: string;
        Deployed?: boolean;
      }>
    >(output);

    return apps.map((app) => ({
      id: app.ID || app.Name,
      name: app.Name,
      status: app.Status?.toLowerCase() || 'unknown',
      organization: {
        name: app.Organization?.Name || '',
        slug: app.Organization?.Slug || '',
      },
    }));
  }

  async getApp(appName: string): Promise<App> {
    // Use fly status instead of fly apps show (which doesn't support --json)
    const args = ['status', '-a', appName];
    const output = await this.execFly(args);
    const app = this.parseJson<{
      ID: string;
      Name: string;
      Status: string;
      Organization: { Name?: string; Slug: string } | null;
      Machines?: Array<unknown>;
    }>(output);

    return {
      id: app.ID || app.Name,
      name: app.Name,
      status: app.Status?.toLowerCase() || 'unknown',
      organization: {
        name: app.Organization?.Name || app.Organization?.Slug || '',
        slug: app.Organization?.Slug || '',
      },
      machine_count: app.Machines?.length,
    };
  }

  async createApp(request: CreateAppRequest): Promise<App> {
    const args = ['apps', 'create', request.app_name, '--org', request.org_slug];
    if (request.network) {
      args.push('--network', request.network);
    }

    await this.execFly(args, { json: false });

    // Fetch the created app to get full details
    return this.getApp(request.app_name);
  }

  async deleteApp(appName: string, force: boolean = false): Promise<void> {
    const args = ['apps', 'destroy', appName, '--yes'];
    if (force) {
      args.push('--force');
    }

    await this.execFly(args, { json: false });
  }

  // ==========================================================================
  // Machine operations
  // ==========================================================================

  async listMachines(appName: string): Promise<Machine[]> {
    const args = ['machines', 'list', '--app', appName];
    const output = await this.execFly(args);
    const machines = this.parseJson<
      Array<{
        id: string;
        name: string;
        state: string;
        region: string;
        instance_id: string;
        private_ip: string;
        config: {
          image: string;
          env?: Record<string, string>;
          guest?: { cpus?: number; memory_mb?: number; cpu_kind?: string };
        };
        image_ref?: { registry: string; repository: string; tag: string; digest: string };
        created_at: string;
        updated_at: string;
      }>
    >(output);

    return machines.map((m) => ({
      id: m.id,
      name: m.name,
      state: m.state,
      region: m.region,
      instance_id: m.instance_id,
      private_ip: m.private_ip,
      config: {
        image: m.config?.image || '',
        env: m.config?.env,
        guest: m.config?.guest
          ? {
              cpus: m.config.guest.cpus,
              memory_mb: m.config.guest.memory_mb,
              cpu_kind: m.config.guest.cpu_kind as 'shared' | 'performance' | undefined,
            }
          : undefined,
      },
      image_ref: m.image_ref,
      created_at: m.created_at,
      updated_at: m.updated_at,
    }));
  }

  async getMachine(appName: string, machineId: string): Promise<Machine> {
    // fly machines status doesn't support --json, so use fly machines list and filter
    const machines = await this.listMachines(appName);
    const machine = machines.find((m) => m.id === machineId);

    if (!machine) {
      throw new Error(`Machine ${machineId} not found in app ${appName}`);
    }

    return machine;
  }

  async createMachine(appName: string, request: CreateMachineRequest): Promise<Machine> {
    const args = ['machines', 'run', request.config.image, '--app', appName];

    if (request.name) {
      args.push('--name', request.name);
    }
    if (request.region) {
      args.push('--region', request.region);
    }
    if (request.config.guest?.cpus) {
      args.push('--cpus', request.config.guest.cpus.toString());
    }
    if (request.config.guest?.memory_mb) {
      args.push('--memory', request.config.guest.memory_mb.toString());
    }
    if (request.config.guest?.cpu_kind) {
      args.push('--vm-cpu-kind', request.config.guest.cpu_kind);
    }
    if (request.config.env) {
      for (const [key, value] of Object.entries(request.config.env)) {
        args.push('--env', `${key}=${value}`);
      }
    }

    // Get machine list before creation to find the new one
    const machinesBefore = await this.listMachines(appName);
    const existingIds = new Set(machinesBefore.map((m) => m.id));

    // fly machines run does not support --json, so we run and then find the new machine
    await this.execFly(args, { json: false, timeout: 120000 });

    // Find the newly created machine by comparing lists
    const machinesAfter = await this.listMachines(appName);
    const newMachine = machinesAfter.find((m) => !existingIds.has(m.id));

    if (!newMachine) {
      throw new Error('Failed to find newly created machine');
    }

    return newMachine;
  }

  async updateMachine(
    appName: string,
    machineId: string,
    request: UpdateMachineRequest
  ): Promise<Machine> {
    const args = ['machines', 'update', machineId, '--app', appName, '--yes'];

    if (request.config.image) {
      args.push('--image', request.config.image);
    }
    if (request.config.guest?.cpus) {
      args.push('--cpus', request.config.guest.cpus.toString());
    }
    if (request.config.guest?.memory_mb) {
      args.push('--memory', request.config.guest.memory_mb.toString());
    }

    await this.execFly(args, { json: false });

    // Fetch the updated machine to get full details
    return this.getMachine(appName, machineId);
  }

  async deleteMachine(appName: string, machineId: string, force: boolean = false): Promise<void> {
    // fly machines destroy doesn't have --yes, but it's non-interactive when piped
    const args = ['machines', 'destroy', machineId, '--app', appName];
    if (force) {
      args.push('--force');
    }

    await this.execFly(args, { json: false });
  }

  async startMachine(appName: string, machineId: string): Promise<void> {
    const args = ['machines', 'start', machineId, '--app', appName];
    await this.execFly(args, { json: false });
  }

  async stopMachine(appName: string, machineId: string): Promise<void> {
    const args = ['machines', 'stop', machineId, '--app', appName];
    await this.execFly(args, { json: false });
  }

  async restartMachine(appName: string, machineId: string): Promise<void> {
    const args = ['machines', 'restart', machineId, '--app', appName];
    await this.execFly(args, { json: false });
  }

  async suspendMachine(appName: string, machineId: string): Promise<void> {
    const args = ['machines', 'suspend', machineId, '--app', appName];
    await this.execFly(args, { json: false });
  }

  async waitMachine(
    appName: string,
    machineId: string,
    state: MachineState,
    timeout?: number
  ): Promise<void> {
    // fly machine wait doesn't exist, poll using status
    const maxWait = timeout || 60;
    const startTime = Date.now();

    while ((Date.now() - startTime) / 1000 < maxWait) {
      const machine = await this.getMachine(appName, machineId);
      if (machine.state === state) {
        return;
      }
      // Wait 1 second before next poll
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error(`Timeout waiting for machine ${machineId} to reach state ${state}`);
  }

  // ==========================================================================
  // CLI-specific operations (logs and exec)
  // ==========================================================================

  async getLogs(appName: string, options: LogsOptions = {}): Promise<string> {
    const args = ['logs', '--app', appName, '--no-tail'];

    if (options.region) {
      args.push('--region', options.region);
    }
    if (options.machineId) {
      args.push('--instance', options.machineId);
    }

    // Get logs without JSON (it's already text)
    const output = await this.execFly(args, { json: false, timeout: 60000 });
    return output;
  }

  async execCommand(
    appName: string,
    machineId: string,
    command: string,
    timeout: number = 60000
  ): Promise<string> {
    // Convert timeout from milliseconds to seconds, capped at Fly.io's 60s max
    const timeoutSeconds = Math.min(Math.ceil(timeout / 1000), 60);

    const args = [
      'machine',
      'exec',
      machineId,
      command,
      '--app',
      appName,
      '--timeout',
      timeoutSeconds.toString(),
    ];

    const output = await this.execFly(args, { json: false, timeout: (timeoutSeconds + 30) * 1000 });
    return output;
  }

  // ==========================================================================
  // Image operations
  // ==========================================================================

  async showImage(appName: string): Promise<ImageDetails> {
    const args = ['image', 'show', '--app', appName];
    const output = await this.execFly(args);
    const data = this.parseJson<{
      Registry: string;
      Repository: string;
      Tag: string;
      Digest: string;
      Version: number;
    }>(output);

    return {
      registry: data.Registry,
      repository: data.Repository,
      tag: data.Tag,
      digest: data.Digest,
      version: data.Version,
    };
  }

  async listReleases(appName: string, options: ReleasesOptions = {}): Promise<Release[]> {
    const args = ['releases', '--app', appName, '--image'];

    const output = await this.execFly(args);
    let releases = this.parseJson<
      Array<{
        ID: string;
        Version: number;
        Stable: boolean;
        InProgress: boolean;
        Status: string;
        Description: string;
        Reason: string;
        User: { ID: string; Email: string; Name: string };
        CreatedAt: string;
        ImageRef?: string;
      }>
    >(output);

    if (options.limit && options.limit > 0) {
      releases = releases.slice(0, options.limit);
    }

    return releases.map((r) => ({
      id: r.ID,
      version: r.Version,
      stable: r.Stable,
      inProgress: r.InProgress,
      status: r.Status,
      description: r.Description,
      reason: r.Reason,
      user: {
        id: r.User?.ID || '',
        email: r.User?.Email || '',
        name: r.User?.Name || '',
      },
      createdAt: r.CreatedAt,
      imageRef: r.ImageRef,
    }));
  }

  async updateImage(appName: string, options: UpdateImageOptions = {}): Promise<ImageDetails> {
    const args = ['image', 'update', '--app', appName, '--yes'];

    if (options.image) {
      args.push('--image', options.image);
    }

    // Image update can take a while, use longer timeout
    await this.execFly(args, { json: false, timeout: 300000 });

    // Fetch the updated image details
    return this.showImage(appName);
  }
}

// Re-export the original interface for backward compatibility
export type { IFlyIOClientExtended as IFlyIOClient };
