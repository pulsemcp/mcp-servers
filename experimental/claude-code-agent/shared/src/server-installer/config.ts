import {
  TRANSPORT_PRIORITIES,
  RUNTIME_PRIORITIES,
  TransportType,
  RuntimeHint,
  RegistryType,
} from './types.js';

/**
 * Configuration for transport and runtime selection
 */
export class InstallationConfig {
  /**
   * Priority order for transport selection
   * Higher index = higher priority
   */
  readonly transportPriorities: readonly TransportType[] = TRANSPORT_PRIORITIES;

  /**
   * Priority order for runtime hint selection
   * Higher index = higher priority
   */
  readonly runtimePriorities: readonly RuntimeHint[] = RUNTIME_PRIORITIES;

  /**
   * Get transport priority score (higher = better)
   */
  getTransportPriority(transport: TransportType): number {
    return this.transportPriorities.indexOf(transport);
  }

  /**
   * Get runtime priority score (higher = better)
   */
  getRuntimePriority(runtime: RuntimeHint): number {
    return this.runtimePriorities.indexOf(runtime);
  }

  /**
   * Select best transport from available options
   */
  selectBestTransport(availableTransports: TransportType[]): TransportType | undefined {
    let bestTransport: TransportType | undefined;
    let bestScore = -1;

    for (const transport of availableTransports) {
      const score = this.getTransportPriority(transport);
      if (score > bestScore) {
        bestScore = score;
        bestTransport = transport;
      }
    }

    return bestTransport;
  }

  /**
   * Select best runtime from available options
   */
  selectBestRuntime(availableRuntimes: RuntimeHint[]): RuntimeHint | undefined {
    let bestRuntime: RuntimeHint | undefined;
    let bestScore = -1;

    for (const runtime of availableRuntimes) {
      const score = this.getRuntimePriority(runtime);
      if (score > bestScore) {
        bestScore = score;
        bestRuntime = runtime;
      }
    }

    return bestRuntime;
  }
}

/**
 * Maps registry types to their preferred runtime hints
 */
export const REGISTRY_TO_RUNTIME_MAP: Record<RegistryType, RuntimeHint[]> = {
  npm: ['npx'],
  pypi: ['uvx'],
  oci: ['docker'],
  nuget: ['dnx'],
  mcpb: ['npx', 'uvx', 'docker'], // MCPB can use multiple runtimes
};

/**
 * Maps runtime hints to commands
 */
export const RUNTIME_TO_COMMAND_MAP: Record<RuntimeHint, string> = {
  npx: 'npx',
  uvx: 'uvx',
  docker: 'docker',
  dnx: 'dotnet',
};

/**
 * Default installation configuration
 */
export const DEFAULT_CONFIG = new InstallationConfig();
