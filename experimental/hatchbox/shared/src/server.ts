import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { registerResources } from './resources.js';
import { createRegisterTools } from './tools.js';

// Hatchbox API client interface
export interface IHatchboxClient {
  // Environment variable operations
  getEnvVars?(): Promise<Array<{ name: string; value: string }>>;
  getEnvVar?(name: string): Promise<{ name: string; value: string } | null>;
  setEnvVar(name: string, value: string): Promise<Array<{ name: string; value: string }>>;
  deleteEnvVars(names: string[]): Promise<Array<{ name: string; value: string }>>;

  // Deployment operations
  triggerDeploy(sha?: string): Promise<{ id: string; status: string }>;
  checkDeploy(activityId: string): Promise<{ id: string; status: string; output?: string }>;
}

// Hatchbox API client implementation
export class HatchboxClient implements IHatchboxClient {
  private readonly baseUrl = 'https://app.hatchbox.io';

  constructor(
    private apiKey: string,
    private accountId: string,
    private appId: string,
    private deployKey: string,
    private serverIP?: string,
    private sshKeyPath?: string,
    private appName?: string
  ) {}

  async getEnvVars(): Promise<Array<{ name: string; value: string }>> {
    if (!this.serverIP) {
      throw new Error('WEB_SERVER_IP_ADDRESS must be configured to read environment variables');
    }
    const { getEnvVarsSSH } = await import('./hatchbox-client/lib/get-env-vars-ssh.js');
    return getEnvVarsSSH(this.serverIP, this.sshKeyPath, this.appName);
  }

  async getEnvVar(name: string): Promise<{ name: string; value: string } | null> {
    const envVars = await this.getEnvVars();
    return envVars.find((env) => env.name === name) || null;
  }

  async setEnvVar(name: string, value: string): Promise<Array<{ name: string; value: string }>> {
    const { setEnvVar } = await import('./hatchbox-client/lib/set-env-var.js');
    return setEnvVar(this.baseUrl, this.apiKey, this.accountId, this.appId, name, value);
  }

  async deleteEnvVars(names: string[]): Promise<Array<{ name: string; value: string }>> {
    const { deleteEnvVars } = await import('./hatchbox-client/lib/delete-env-vars.js');
    return deleteEnvVars(this.baseUrl, this.apiKey, this.accountId, this.appId, names);
  }

  async triggerDeploy(sha?: string): Promise<{ id: string; status: string }> {
    const { triggerDeploy } = await import('./hatchbox-client/lib/trigger-deploy.js');
    return triggerDeploy(this.baseUrl, this.deployKey, sha);
  }

  async checkDeploy(activityId: string): Promise<{ id: string; status: string; output?: string }> {
    const { checkDeploy } = await import('./hatchbox-client/lib/check-deploy.js');
    return checkDeploy(this.baseUrl, this.deployKey, activityId);
  }
}

export type ClientFactory = () => IHatchboxClient;

export interface CreateMCPServerOptions {
  version: string;
}

export function createMCPServer(options: CreateMCPServerOptions) {
  const server = new Server(
    {
      name: 'hatchbox-mcp-server',
      version: options.version,
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  const registerHandlers = async (server: Server, clientFactory?: ClientFactory) => {
    // Use provided factory or create default client
    const factory =
      clientFactory ||
      (() => {
        const apiKey = process.env.HATCHBOX_API_KEY;
        const accountId = process.env.HATCHBOX_ACCOUNT_ID;
        const appId = process.env.HATCHBOX_APP_ID;
        const deployKey = process.env.HATCHBOX_DEPLOY_KEY;
        const serverIP = process.env.WEB_SERVER_IP_ADDRESS;
        const sshKeyPath = process.env.SSH_KEY_PATH;
        const appName = process.env.HATCHBOX_APP_NAME;

        if (!apiKey || !accountId || !appId || !deployKey) {
          throw new Error('Required Hatchbox environment variables must be configured');
        }

        return new HatchboxClient(
          apiKey,
          accountId,
          appId,
          deployKey,
          serverIP,
          sshKeyPath,
          appName
        );
      });

    registerResources(server);
    const registerTools = createRegisterTools(factory);
    registerTools(server);
  };

  return { server, registerHandlers };
}
