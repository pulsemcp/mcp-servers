import type { IHatchboxClient } from './hatchbox-client.js';

export function createIntegrationMockClient(mockData?: {
  envVars?: Array<{ name: string; value: string }>;
  deploymentId?: string;
  deploymentStatus?: string;
}): IHatchboxClient {
  const defaultEnvVars = mockData?.envVars || [
    { name: 'RAILS_ENV', value: 'production' },
    { name: 'DATABASE_URL', value: 'postgres://localhost/myapp' },
  ];

  const currentEnvVars = [...defaultEnvVars];

  return {
    async setEnvVar(name: string, value: string) {
      // Update existing or add new
      const index = currentEnvVars.findIndex((env) => env.name === name);
      if (index >= 0) {
        currentEnvVars[index].value = value;
      } else {
        currentEnvVars.push({ name, value });
      }
      return currentEnvVars;
    },

    async deleteEnvVars(names: string[]) {
      // Remove specified env vars
      names.forEach((name) => {
        const index = currentEnvVars.findIndex((env) => env.name === name);
        if (index >= 0) {
          currentEnvVars.splice(index, 1);
        }
      });
      return currentEnvVars;
    },

    async triggerDeploy(_sha?: string) {
      return {
        id: mockData?.deploymentId || '12345',
        status: 'pending',
      };
    },

    async checkDeploy(activityId: string) {
      return {
        id: activityId,
        status: mockData?.deploymentStatus || 'completed',
        output: 'Deployment completed successfully',
      };
    },
  };
}
