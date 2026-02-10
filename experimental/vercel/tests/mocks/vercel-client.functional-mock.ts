import { vi } from 'vitest';
import type { IVercelClient } from '../../shared/src/server.js';

export function createMockVercelClient(): IVercelClient {
  return {
    listDeployments: vi.fn().mockResolvedValue({
      deployments: [
        {
          uid: 'dpl_test123',
          name: 'my-app',
          url: 'my-app-test123.vercel.app',
          state: 'READY',
          created: 1700000000000,
          creator: { uid: 'user_123', username: 'testuser' },
          target: 'production',
        },
      ],
      pagination: { count: 1, next: null, prev: null },
    }),

    getDeployment: vi.fn().mockResolvedValue({
      uid: 'dpl_test123',
      name: 'my-app',
      url: 'my-app-test123.vercel.app',
      state: 'READY',
      readyState: 'READY',
      created: 1700000000000,
      creator: { uid: 'user_123', username: 'testuser' },
      alias: ['my-app.vercel.app'],
      regions: ['iad1'],
      plan: 'pro',
      public: false,
      target: 'production',
    }),

    createDeployment: vi.fn().mockResolvedValue({
      uid: 'dpl_new789',
      name: 'my-app',
      url: 'my-app-new789.vercel.app',
      state: 'BUILDING',
      readyState: 'BUILDING',
      created: 1700000000000,
      creator: { uid: 'user_123', username: 'testuser' },
      alias: [],
      regions: [],
      plan: 'pro',
      public: false,
      target: 'production',
    }),

    cancelDeployment: vi.fn().mockResolvedValue({
      uid: 'dpl_test123',
      name: 'my-app',
      url: 'my-app-test123.vercel.app',
      state: 'CANCELED',
      readyState: 'CANCELED',
      created: 1700000000000,
      creator: { uid: 'user_123', username: 'testuser' },
      alias: [],
      regions: [],
      plan: 'pro',
      public: false,
    }),

    deleteDeployment: vi.fn().mockResolvedValue({
      uid: 'dpl_test123',
      state: 'DELETED',
    }),

    promoteDeployment: vi.fn().mockResolvedValue(undefined),

    rollbackDeployment: vi.fn().mockResolvedValue(undefined),

    getDeploymentEvents: vi.fn().mockResolvedValue([
      {
        type: 'command',
        created: 1700000000000,
        payload: { text: 'npm run build' },
      },
      {
        type: 'stdout',
        created: 1700000001000,
        payload: { text: 'Build completed successfully' },
      },
    ]),

    getRuntimeLogs: vi.fn().mockResolvedValue([
      {
        id: 'log_1',
        message: 'GET /api/health 200 in 12ms',
        timestampInMs: 1700000000000,
        source: 'serverless',
        level: 'info',
        requestMethod: 'GET',
        requestPath: '/api/health',
        responseStatusCode: 200,
      },
    ]),

    listProjects: vi.fn().mockResolvedValue({
      projects: [{ id: 'prj_test123', name: 'my-app', framework: 'nextjs' }],
      pagination: { count: 1, next: null, prev: null },
    }),
  };
}
