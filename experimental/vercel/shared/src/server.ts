import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createRegisterTools } from './tools.js';
import type {
  ListDeploymentsResponse,
  VercelDeploymentDetail,
  DeploymentEvent,
  RuntimeLogEntry,
} from './types.js';
import type { ListDeploymentsOptions } from './vercel-client/lib/list-deployments.js';
import type { CreateDeploymentOptions } from './vercel-client/lib/create-deployment.js';
import type { DeleteDeploymentResponse } from './vercel-client/lib/delete-deployment.js';
import type { GetDeploymentEventsOptions } from './vercel-client/lib/get-deployment-events.js';
import type {
  ListProjectsResponse,
  ListProjectsOptions,
} from './vercel-client/lib/list-projects.js';
import type { GetRuntimeLogsOptions } from './vercel-client/lib/get-runtime-logs.js';

// =============================================================================
// VERCEL API CLIENT INTERFACE
// =============================================================================

export interface IVercelClient {
  // Deployment management (readonly)
  listDeployments(options?: ListDeploymentsOptions): Promise<ListDeploymentsResponse>;
  getDeployment(idOrUrl: string): Promise<VercelDeploymentDetail>;
  getDeploymentEvents(
    idOrUrl: string,
    options?: GetDeploymentEventsOptions
  ): Promise<DeploymentEvent[]>;
  listProjects(options?: ListProjectsOptions): Promise<ListProjectsResponse>;

  // Deployment management (readwrite)
  createDeployment(options: CreateDeploymentOptions): Promise<VercelDeploymentDetail>;
  cancelDeployment(deploymentId: string): Promise<VercelDeploymentDetail>;
  deleteDeployment(deploymentId: string): Promise<DeleteDeploymentResponse>;
  promoteDeployment(projectId: string, deploymentId: string): Promise<void>;
  rollbackDeployment(projectId: string, deploymentId: string, description?: string): Promise<void>;

  // Logs
  getRuntimeLogs(
    projectId: string,
    deploymentId: string,
    options?: GetRuntimeLogsOptions
  ): Promise<RuntimeLogEntry[]>;
}

// =============================================================================
// VERCEL API CLIENT IMPLEMENTATION
// =============================================================================

export class VercelClient implements IVercelClient {
  private baseUrl = 'https://api.vercel.com';
  private headers: Record<string, string>;
  private teamParams: string;

  constructor(token: string, teamId?: string, teamSlug?: string) {
    this.headers = {
      Authorization: `Bearer ${token}`,
    };

    const params = new URLSearchParams();
    if (teamId) params.set('teamId', teamId);
    if (teamSlug) params.set('slug', teamSlug);
    this.teamParams = params.toString();
  }

  async listDeployments(options?: ListDeploymentsOptions): Promise<ListDeploymentsResponse> {
    const { listDeployments } = await import('./vercel-client/lib/list-deployments.js');
    return listDeployments(this.baseUrl, this.headers, this.teamParams, options);
  }

  async getDeployment(idOrUrl: string): Promise<VercelDeploymentDetail> {
    const { getDeployment } = await import('./vercel-client/lib/get-deployment.js');
    return getDeployment(this.baseUrl, this.headers, this.teamParams, idOrUrl);
  }

  async createDeployment(options: CreateDeploymentOptions): Promise<VercelDeploymentDetail> {
    const { createDeployment } = await import('./vercel-client/lib/create-deployment.js');
    return createDeployment(this.baseUrl, this.headers, this.teamParams, options);
  }

  async cancelDeployment(deploymentId: string): Promise<VercelDeploymentDetail> {
    const { cancelDeployment } = await import('./vercel-client/lib/cancel-deployment.js');
    return cancelDeployment(this.baseUrl, this.headers, this.teamParams, deploymentId);
  }

  async deleteDeployment(deploymentId: string): Promise<DeleteDeploymentResponse> {
    const { deleteDeployment } = await import('./vercel-client/lib/delete-deployment.js');
    return deleteDeployment(this.baseUrl, this.headers, this.teamParams, deploymentId);
  }

  async promoteDeployment(projectId: string, deploymentId: string): Promise<void> {
    const { promoteDeployment } = await import('./vercel-client/lib/promote-deployment.js');
    return promoteDeployment(this.baseUrl, this.headers, this.teamParams, projectId, deploymentId);
  }

  async rollbackDeployment(
    projectId: string,
    deploymentId: string,
    description?: string
  ): Promise<void> {
    const { rollbackDeployment } = await import('./vercel-client/lib/rollback-deployment.js');
    return rollbackDeployment(
      this.baseUrl,
      this.headers,
      this.teamParams,
      projectId,
      deploymentId,
      description
    );
  }

  async getDeploymentEvents(
    idOrUrl: string,
    options?: GetDeploymentEventsOptions
  ): Promise<DeploymentEvent[]> {
    const { getDeploymentEvents } = await import('./vercel-client/lib/get-deployment-events.js');
    return getDeploymentEvents(this.baseUrl, this.headers, this.teamParams, idOrUrl, options);
  }

  async getRuntimeLogs(
    projectId: string,
    deploymentId: string,
    options?: GetRuntimeLogsOptions
  ): Promise<RuntimeLogEntry[]> {
    const { getRuntimeLogs } = await import('./vercel-client/lib/get-runtime-logs.js');
    return getRuntimeLogs(
      this.baseUrl,
      this.headers,
      this.teamParams,
      projectId,
      deploymentId,
      options
    );
  }

  async listProjects(options?: ListProjectsOptions): Promise<ListProjectsResponse> {
    const { listProjects } = await import('./vercel-client/lib/list-projects.js');
    return listProjects(this.baseUrl, this.headers, this.teamParams, options);
  }
}

export type ClientFactory = () => IVercelClient;

export interface CreateMCPServerOptions {
  version: string;
}

export function createMCPServer(options: CreateMCPServerOptions) {
  const server = new Server(
    {
      name: 'vercel-deployment-mcp-server',
      version: options.version,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const registerHandlers = async (clientFactory?: ClientFactory) => {
    const factory =
      clientFactory ||
      (() => {
        const token = process.env.VERCEL_TOKEN;
        if (!token) {
          throw new Error('VERCEL_TOKEN environment variable must be configured');
        }
        return new VercelClient(token, process.env.VERCEL_TEAM_ID, process.env.VERCEL_TEAM_SLUG);
      });

    const registerTools = createRegisterTools(factory);
    registerTools(server);
  };

  return { server, registerHandlers };
}
