import { vi } from 'vitest';
import type { IHatchboxClient } from '../../shared/src/server.js';

export function createMockHatchboxClient(): IHatchboxClient & {
  // Add mock function references for easy access in tests
  setEnvVar: ReturnType<typeof vi.fn>;
  deleteEnvVars: ReturnType<typeof vi.fn>;
  triggerDeploy: ReturnType<typeof vi.fn>;
  checkDeploy: ReturnType<typeof vi.fn>;
} {
  return {
    setEnvVar: vi.fn().mockImplementation(async (name: string, value: string) => {
      return [
        { name: 'RAILS_ENV', value: 'production' },
        { name: 'DATABASE_URL', value: 'postgres://localhost/myapp' },
        { name, value },
      ];
    }),

    deleteEnvVars: vi.fn().mockImplementation(async (names: string[]) => {
      // Return remaining env vars after deletion
      const remaining = [
        { name: 'RAILS_ENV', value: 'production' },
        { name: 'DATABASE_URL', value: 'postgres://localhost/myapp' },
      ].filter((env) => !names.includes(env.name));
      return remaining;
    }),

    triggerDeploy: vi.fn().mockResolvedValue({
      id: '12345',
      status: 'pending',
    }),

    checkDeploy: vi.fn().mockImplementation(async (activityId: string) => ({
      id: activityId,
      status: 'completed',
      output: 'Deployment completed successfully',
    })),
  };
}
