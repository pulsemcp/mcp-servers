/**
 * Fly.io API types
 */

/**
 * Fly.io Machine represents a VM instance
 */
export interface Machine {
  id: string;
  name: string;
  state: string;
  region: string;
  instance_id: string;
  private_ip: string;
  config: MachineConfig;
  image_ref?: ImageRef;
  created_at: string;
  updated_at: string;
}

/**
 * Machine configuration
 */
export interface MachineConfig {
  image: string;
  env?: Record<string, string>;
  guest?: GuestConfig;
  services?: ServiceConfig[];
  restart?: RestartPolicy;
  auto_destroy?: boolean;
  metadata?: Record<string, string>;
}

/**
 * Guest VM configuration
 */
export interface GuestConfig {
  cpus?: number;
  memory_mb?: number;
  cpu_kind?: 'shared' | 'performance';
}

/**
 * Service configuration for network services
 */
export interface ServiceConfig {
  protocol: 'tcp' | 'udp';
  internal_port: number;
  ports?: PortConfig[];
}

/**
 * Port configuration
 */
export interface PortConfig {
  port: number;
  handlers?: string[];
}

/**
 * Restart policy
 */
export interface RestartPolicy {
  policy: 'no' | 'on-failure' | 'always';
  max_retries?: number;
}

/**
 * Image reference
 */
export interface ImageRef {
  registry: string;
  repository: string;
  tag: string;
  digest: string;
  labels?: Record<string, string>;
}

/**
 * Fly.io App
 */
export interface App {
  id: string;
  name: string;
  status: string;
  organization: {
    name: string;
    slug: string;
  };
  machine_count?: number;
  network?: string;
}

/**
 * Create machine request
 */
export interface CreateMachineRequest {
  name?: string;
  region?: string;
  config: MachineConfig;
  skip_launch?: boolean;
  skip_service_registration?: boolean;
}

/**
 * Update machine request
 */
export interface UpdateMachineRequest {
  config: MachineConfig;
  skip_launch?: boolean;
  skip_service_registration?: boolean;
}

/**
 * List machines response
 */
export interface ListMachinesResponse {
  machines: Machine[];
}

/**
 * Create app request
 */
export interface CreateAppRequest {
  app_name: string;
  org_slug: string;
  network?: string;
}

/**
 * List apps response
 */
export interface ListAppsResponse {
  total_apps: number;
  apps: App[];
}
