import type { IVercelClient } from '../server.js';
import type {
  ListDeploymentsResponse,
  VercelDeploymentDetail,
  DeploymentEvent,
  RuntimeLogEntry,
} from '../types.js';
import type { DeleteDeploymentResponse } from './lib/delete-deployment.js';
import type { ListProjectsResponse } from './lib/list-projects.js';

interface MockData {
  deployments?: ListDeploymentsResponse;
  deploymentDetail?: VercelDeploymentDetail;
  deploymentEvents?: DeploymentEvent[];
  runtimeLogs?: RuntimeLogEntry[];
  projects?: ListProjectsResponse;
  [key: string]: unknown;
}

const DEFAULT_DEPLOYMENT: VercelDeploymentDetail = {
  uid: 'dpl_mock123',
  name: 'my-app',
  url: 'my-app-abc123.vercel.app',
  state: 'READY',
  readyState: 'READY',
  created: Date.now(),
  creator: { uid: 'user_123', username: 'testuser' },
  alias: ['my-app.vercel.app'],
  regions: ['iad1'],
  plan: 'pro',
  public: false,
  target: 'production',
  inspectorUrl: 'https://vercel.com/testuser/my-app/dpl_mock123',
};

const DEFAULT_DEPLOYMENTS_RESPONSE: ListDeploymentsResponse = {
  deployments: [
    {
      uid: 'dpl_mock123',
      name: 'my-app',
      url: 'my-app-abc123.vercel.app',
      state: 'READY',
      created: Date.now(),
      creator: { uid: 'user_123', username: 'testuser' },
      target: 'production',
    },
    {
      uid: 'dpl_mock456',
      name: 'my-app',
      url: 'my-app-def456.vercel.app',
      state: 'READY',
      created: Date.now() - 86400000,
      creator: { uid: 'user_123', username: 'testuser' },
      target: 'preview',
    },
  ],
  pagination: { count: 2, next: null, prev: null },
};

const DEFAULT_EVENTS: DeploymentEvent[] = [
  {
    type: 'command',
    created: Date.now() - 60000,
    payload: { text: 'npm run build' },
  },
  {
    type: 'stdout',
    created: Date.now() - 55000,
    payload: { text: 'Build completed successfully' },
  },
];

const DEFAULT_RUNTIME_LOGS: RuntimeLogEntry[] = [
  {
    id: 'log_1',
    message: 'GET /api/health 200 in 12ms',
    timestampInMs: Date.now() - 5000,
    source: 'serverless',
    level: 'info',
    requestMethod: 'GET',
    requestPath: '/api/health',
    responseStatusCode: 200,
  },
];

const DEFAULT_PROJECTS: ListProjectsResponse = {
  projects: [
    { id: 'prj_mock123', name: 'my-app', framework: 'nextjs' },
    { id: 'prj_mock456', name: 'my-api', framework: 'other' },
  ],
  pagination: { count: 2, next: null, prev: null },
};

/**
 * Creates a mock implementation of IVercelClient for integration tests.
 */
export function createIntegrationMockVercelClient(
  mockData: MockData = {}
): IVercelClient & { mockData: MockData } {
  return {
    mockData,

    async listDeployments() {
      return mockData.deployments || DEFAULT_DEPLOYMENTS_RESPONSE;
    },

    async getDeployment() {
      return mockData.deploymentDetail || DEFAULT_DEPLOYMENT;
    },

    async createDeployment() {
      return (
        mockData.deploymentDetail || {
          ...DEFAULT_DEPLOYMENT,
          state: 'BUILDING',
          readyState: 'BUILDING',
        }
      );
    },

    async cancelDeployment() {
      return (
        mockData.deploymentDetail || {
          ...DEFAULT_DEPLOYMENT,
          state: 'CANCELED',
          readyState: 'CANCELED',
        }
      );
    },

    async deleteDeployment(): Promise<DeleteDeploymentResponse> {
      return { uid: 'dpl_mock123', state: 'DELETED' };
    },

    async promoteDeployment() {
      // No return value
    },

    async rollbackDeployment() {
      // No return value
    },

    async getDeploymentEvents() {
      return mockData.deploymentEvents || DEFAULT_EVENTS;
    },

    async getRuntimeLogs() {
      return mockData.runtimeLogs || DEFAULT_RUNTIME_LOGS;
    },

    async listProjects() {
      return mockData.projects || DEFAULT_PROJECTS;
    },
  };
}
