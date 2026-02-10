import { z } from 'zod';

// =============================================================================
// VERCEL API RESPONSE TYPES
// =============================================================================

export const DeploymentStateSchema = z.enum([
  'QUEUED',
  'BUILDING',
  'INITIALIZING',
  'READY',
  'ERROR',
  'CANCELED',
]);

export type DeploymentState = z.infer<typeof DeploymentStateSchema>;

export interface VercelDeployment {
  uid: string;
  name: string;
  url: string;
  state: DeploymentState;
  created: number;
  creator: {
    uid: string;
    username: string;
  };
  meta?: Record<string, string>;
  target?: string | null;
  inspectorUrl?: string;
  buildingAt?: number;
  ready?: number;
  source?: string;
}

export interface VercelDeploymentDetail extends VercelDeployment {
  readyState: DeploymentState;
  alias: string[];
  aliasAssigned?: number;
  regions: string[];
  routes?: unknown[];
  plan: string;
  public: boolean;
  gitSource?: {
    type: string;
    repoId: string;
    ref: string;
    sha: string;
  };
}

export interface VercelPagination {
  count: number;
  next: number | null;
  prev: number | null;
}

export interface ListDeploymentsResponse {
  deployments: VercelDeployment[];
  pagination: VercelPagination;
}

export interface DeploymentEvent {
  type: string;
  created: number;
  payload: {
    text?: string;
    statusCode?: number;
    deploymentId?: string;
    name?: string;
    [key: string]: unknown;
  };
  serial?: string;
}

export interface RuntimeLogEntry {
  id?: string;
  message: string;
  timestamp?: number;
  timestampInMs?: number;
  source?: string;
  level?: string;
  domain?: string;
  requestMethod?: string;
  requestPath?: string;
  responseStatusCode?: number;
  messageTruncated?: boolean;
}

export interface VercelProject {
  id: string;
  name: string;
  framework?: string;
  latestDeployments?: VercelDeployment[];
}
