import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createInstaller,
  ServerInstallerFactory,
} from '../../../shared/src/server-installer/installer-factory.js';
import {
  IClaudeCodeInferenceClient,
  ISecretsProvider,
} from '../../../shared/src/server-installer/types.js';

// Mock the installer module
vi.mock('../../../shared/src/server-installer/installer.js', () => ({
  installServers: vi.fn(),
}));

describe('ServerInstallerFactory', () => {
  let mockClaudeClient: IClaudeCodeInferenceClient;
  let mockSecretsProvider: ISecretsProvider;
  let factory: ServerInstallerFactory;

  beforeEach(() => {
    mockClaudeClient = {
      runInference: vi.fn(),
    };

    mockSecretsProvider = {
      getSecret: vi.fn(),
      listAvailableSecrets: vi.fn(),
    };

    factory = new ServerInstallerFactory(mockClaudeClient, mockSecretsProvider);
  });

  it('should create installer with default secrets provider', () => {
    const installer = factory.createInstaller('/mock/servers.json');

    expect(typeof installer).toBe('function');
  });

  it('should create installer with custom secrets provider', () => {
    const customSecretsProvider = {
      getSecret: vi.fn(),
      listAvailableSecrets: vi.fn(),
    };

    const installer = factory.createInstaller('/mock/servers.json', {
      secretsProvider: customSecretsProvider,
    });

    expect(typeof installer).toBe('function');
  });

  it('should create installer with secrets path', () => {
    const installer = factory.createInstaller('/mock/servers.json', {
      secretsPath: '/mock/secrets.json',
    });

    expect(typeof installer).toBe('function');
  });
});

describe('createInstaller', () => {
  let mockClaudeClient: IClaudeCodeInferenceClient;

  beforeEach(() => {
    mockClaudeClient = {
      runInference: vi.fn(),
    };
  });

  it('should create installer function with minimal configuration', () => {
    const installer = createInstaller(mockClaudeClient, '/mock/servers.json');

    expect(typeof installer).toBe('function');
  });

  it('should create installer function with secrets path', () => {
    const installer = createInstaller(mockClaudeClient, '/mock/servers.json', {
      secretsPath: '/mock/secrets.json',
    });

    expect(typeof installer).toBe('function');
  });

  it('should create installer function with custom secrets provider', () => {
    const mockSecretsProvider = {
      getSecret: vi.fn(),
      listAvailableSecrets: vi.fn(),
    };

    const installer = createInstaller(mockClaudeClient, '/mock/servers.json', {
      secretsProvider: mockSecretsProvider,
    });

    expect(typeof installer).toBe('function');
  });
});
