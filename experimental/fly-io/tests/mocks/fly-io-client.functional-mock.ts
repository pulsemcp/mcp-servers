import { vi } from 'vitest';
import type { IFlyIOClient } from '../../shared/src/fly-io-client/fly-io-client.js';
import type { App, Machine, MachineEvent, ImageDetails, Release } from '../../shared/src/types.js';

const mockApp: App = {
  id: 'test-app-id',
  name: 'test-app',
  status: 'deployed',
  organization: {
    name: 'Test Org',
    slug: 'test-org',
  },
  machine_count: 2,
};

const mockEvents: MachineEvent[] = [
  {
    id: 'event-1',
    type: 'start',
    status: 'started',
    source: 'flyd',
    timestamp: 1704067200,
  },
  {
    id: 'event-2',
    type: 'exit',
    status: 'stopped',
    source: 'flyd',
    timestamp: 1704070800,
    request: {
      exit_event: {
        exit_code: 0,
        requested_stop: true,
      },
    },
  },
];

const mockMachine: Machine = {
  id: 'test-machine-id',
  name: 'test-machine',
  state: 'started',
  region: 'iad',
  instance_id: 'test-instance-id',
  private_ip: 'fdaa:0:1::1',
  config: {
    image: 'nginx:latest',
    env: { PORT: '8080' },
    guest: {
      cpus: 1,
      memory_mb: 256,
      cpu_kind: 'shared',
    },
  },
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  events: mockEvents,
};

export function createMockFlyIOClient(): IFlyIOClient {
  return {
    // App operations
    listApps: vi.fn().mockResolvedValue([mockApp]),
    getApp: vi.fn().mockResolvedValue(mockApp),
    createApp: vi.fn().mockResolvedValue(mockApp),
    deleteApp: vi.fn().mockResolvedValue(undefined),

    // Machine operations
    listMachines: vi.fn().mockResolvedValue([mockMachine]),
    getMachine: vi.fn().mockResolvedValue(mockMachine),
    createMachine: vi.fn().mockResolvedValue(mockMachine),
    updateMachine: vi.fn().mockResolvedValue(mockMachine),
    deleteMachine: vi.fn().mockResolvedValue(undefined),
    startMachine: vi.fn().mockResolvedValue(undefined),
    stopMachine: vi.fn().mockResolvedValue(undefined),
    restartMachine: vi.fn().mockResolvedValue(undefined),
    suspendMachine: vi.fn().mockResolvedValue(undefined),
    waitMachine: vi.fn().mockResolvedValue(undefined),

    // CLI-specific operations
    getLogs: vi
      .fn()
      .mockResolvedValue('2025-01-01T00:00:00Z app[test-machine-id] INFO: Application started'),
    execCommand: vi.fn().mockResolvedValue('command output'),

    // Image operations
    showImage: vi.fn().mockResolvedValue(mockImageDetails),
    listReleases: vi.fn().mockResolvedValue([mockRelease]),
    updateImage: vi.fn().mockResolvedValue(mockImageDetails),
  };
}

const mockImageDetails: ImageDetails = {
  registry: 'registry.fly.io',
  repository: 'test-app',
  tag: 'deployment-abc123',
  digest: 'sha256:abc123def456',
  version: 1,
};

const mockRelease: Release = {
  id: 'release-1',
  version: 1,
  stable: true,
  inProgress: false,
  status: 'complete',
  description: 'Initial deployment',
  reason: 'deploy',
  user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
  createdAt: '2025-01-01T00:00:00Z',
  imageRef: 'registry.fly.io/test-app:deployment-abc123',
};

export { mockApp, mockMachine, mockEvents, mockImageDetails, mockRelease };
