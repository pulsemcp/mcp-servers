import { vi } from 'vitest';
import type { RegistryImage } from '../../shared/src/docker-client/docker-cli-client.js';

/**
 * Creates a mock DockerCLIClient for functional testing.
 * All methods return predictable test data.
 */
export function createMockDockerCLIClient() {
  return {
    pushImage: vi.fn().mockResolvedValue({
      registry: 'registry.fly.io',
      repository: 'test-app',
      tag: 'v1',
      digest: 'sha256:abc123def456',
    } as RegistryImage),

    pullImage: vi.fn().mockResolvedValue({
      registry: 'registry.fly.io',
      repository: 'test-app',
      tag: 'v1',
    } as RegistryImage),

    listRegistryTags: vi.fn().mockResolvedValue(['latest', 'deployment']),

    imageExists: vi.fn().mockResolvedValue(true),
  };
}
