import {
  IClaudeCodeInferenceClient,
  ISecretsProvider,
  InstallationContext,
  InstallationResult,
} from './types.js';
import { installServers } from './installer.js';

/**
 * Factory for creating configured installer instances
 */
export class ServerInstallerFactory {
  constructor(
    private claudeClient: IClaudeCodeInferenceClient,
    private defaultSecretsProvider?: ISecretsProvider
  ) {}

  /**
   * Creates an installer function with pre-configured dependencies
   */
  createInstaller(
    serversConfigPath: string,
    options: {
      secretsPath?: string;
      secretsProvider?: ISecretsProvider;
    } = {}
  ) {
    const secretsProvider = options.secretsProvider || this.defaultSecretsProvider;

    return async (
      serverNames: string[],
      context?: InstallationContext
    ): Promise<InstallationResult> => {
      return installServers(serverNames, serversConfigPath, this.claudeClient, {
        secretsPath: options.secretsPath,
        context,
        secretsProvider,
      });
    };
  }
}

/**
 * Convenience function to create an installer with default configuration
 */
export function createInstaller(
  claudeClient: IClaudeCodeInferenceClient,
  serversConfigPath: string,
  options: {
    secretsPath?: string;
    secretsProvider?: ISecretsProvider;
  } = {}
): (serverNames: string[], context?: InstallationContext) => Promise<InstallationResult> {
  const factory = new ServerInstallerFactory(claudeClient, options.secretsProvider);
  return factory.createInstaller(serversConfigPath, options);
}
