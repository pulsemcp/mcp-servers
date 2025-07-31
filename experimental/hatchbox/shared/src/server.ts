import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { registerResources } from './resources.js';
import { createRegisterTools } from './tools.js';

// Hatchbox API client interface
export interface IHatchboxClient {
  // Environment variable operations
  getEnvVars(): Promise<Array<{ name: string; value: string }>>;
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
    private deployKey: string
  ) {}

  async getEnvVars(): Promise<Array<{ name: string; value: string }>> {
    const { getEnvVars } = await import('./hatchbox-client/lib/get-env-vars.js');
    return getEnvVars(this.baseUrl, this.apiKey, this.accountId, this.appId);
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

export function createMCPServer() {
  const server = new Server(
    {
      name: 'hatchbox-mcp-server',
      version: '0.0.1',
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

        if (!apiKey || !accountId || !appId || !deployKey) {
          throw new Error('Required Hatchbox environment variables must be configured');
        }

        return new HatchboxClient(apiKey, accountId, appId, deployKey);
      });

    registerResources(server);
    const registerTools = createRegisterTools(factory);
    registerTools(server);
  };

  return { server, registerHandlers };
}
