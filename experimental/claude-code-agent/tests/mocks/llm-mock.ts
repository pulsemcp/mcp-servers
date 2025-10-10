import type {
  IServerConfigGenerator,
  ServerConfigGenerationResult,
  ServerConfigInput,
  ServerConfigGenerationOptions,
} from '../../shared/src/llm/types.js';

export class MockServerConfigGenerator implements IServerConfigGenerator {
  private shouldSucceed: boolean;
  private mockConfig: Record<string, unknown> | null;
  private mockError: string | null;
  private callLog: Array<{
    input: ServerConfigInput;
    options?: ServerConfigGenerationOptions;
  }> = [];

  constructor(
    shouldSucceed = true,
    mockConfig: Record<string, unknown> | null = null,
    mockError: string | null = null
  ) {
    this.shouldSucceed = shouldSucceed;
    this.mockConfig = mockConfig;
    this.mockError = mockError;
  }

  async generateServerConfig(
    input: ServerConfigInput,
    options?: ServerConfigGenerationOptions
  ): Promise<ServerConfigGenerationResult> {
    // Log the call for testing
    this.callLog.push({ input, options });

    if (!this.shouldSucceed) {
      return {
        success: false,
        error: this.mockError || 'Mock generation failed',
      };
    }

    // Generate a mock configuration based on the input
    const serverName = input.userPreferences?.serverName || 'mock-server';
    const defaultConfig = {
      mcpServers: {
        [serverName]: {
          command: 'npx',
          args: ['mock-server-package'],
          env: {
            MOCK_API_KEY: 'test-key',
            ...(input.userPreferences?.customArgs && {
              CUSTOM_ARGS: input.userPreferences.customArgs.join(','),
            }),
          },
        },
      },
    };

    return {
      success: true,
      mcpConfig: this.mockConfig || defaultConfig,
      explanation: `Mock configuration generated for ${serverName}`,
    };
  }

  // Test helper methods
  getCallLog() {
    return this.callLog;
  }

  getLastCall() {
    return this.callLog[this.callLog.length - 1];
  }

  clearCallLog() {
    this.callLog = [];
  }

  setSuccess(shouldSucceed: boolean) {
    this.shouldSucceed = shouldSucceed;
  }

  setMockConfig(config: Record<string, unknown> | null) {
    this.mockConfig = config;
  }

  setMockError(error: string | null) {
    this.mockError = error;
  }
}

/**
 * Creates a mock server config generator that simulates successful generation
 */
export function createSuccessfulMockGenerator(
  customConfig?: Record<string, unknown>
): MockServerConfigGenerator {
  return new MockServerConfigGenerator(true, customConfig);
}

/**
 * Creates a mock server config generator that simulates failed generation
 */
export function createFailedMockGenerator(
  error = 'Mock generation failed'
): MockServerConfigGenerator {
  return new MockServerConfigGenerator(false, null, error);
}

/**
 * Creates a mock that simulates common server configurations
 */
export function createMockGeneratorForServer(
  serverName: string,
  serverType: 'npm' | 'python' | 'docker' = 'npm'
): MockServerConfigGenerator {
  const configs = {
    npm: {
      mcpServers: {
        [serverName]: {
          command: 'npx',
          args: [`${serverName}-package`],
          env: {
            API_KEY: 'mock-api-key',
          },
        },
      },
    },
    python: {
      mcpServers: {
        [serverName]: {
          command: 'uvx',
          args: [`${serverName}-package`],
          env: {
            PYTHON_PATH: '/usr/bin/python3',
            API_KEY: 'mock-api-key',
          },
        },
      },
    },
    docker: {
      mcpServers: {
        [serverName]: {
          command: 'docker',
          args: ['run', '--rm', '-i', `${serverName}:latest`],
          env: {
            DOCKER_HOST: 'unix:///var/run/docker.sock',
            API_KEY: 'mock-api-key',
          },
        },
      },
    },
  };

  return new MockServerConfigGenerator(true, configs[serverType]);
}
