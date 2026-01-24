import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile, unlink } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';

const execFileAsync = promisify(execFile);

/**
 * Docker registry image info
 */
export interface RegistryImage {
  registry: string;
  repository: string;
  tag: string;
  digest?: string;
}

/**
 * Validates that a Fly.io app name follows expected patterns.
 * App names must be alphanumeric with hyphens, lowercase.
 */
function validateAppName(appName: string): void {
  // Fly.io app names: lowercase alphanumeric with hyphens, 2-63 chars
  const pattern = /^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$|^[a-z0-9]$/;
  if (!pattern.test(appName)) {
    throw new Error(
      `Invalid app name "${appName}". App names must be lowercase alphanumeric with hyphens, 1-63 characters.`
    );
  }
}

/**
 * Validates that a Docker tag follows expected patterns.
 * Tags can contain alphanumeric, dots, hyphens, and underscores.
 */
function validateTag(tag: string): void {
  // Docker tag: alphanumeric, dots, hyphens, underscores, max 128 chars
  const pattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;
  if (!pattern.test(tag)) {
    throw new Error(
      `Invalid tag "${tag}". Tags must start with alphanumeric and contain only alphanumeric, dots, hyphens, or underscores.`
    );
  }
}

/**
 * Context for a Docker config backup operation.
 * Each operation gets its own backup file to prevent race conditions.
 */
interface BackupContext {
  backupPath: string | null;
  hadExistingConfig: boolean;
}

/**
 * Docker CLI client for interacting with Fly.io's registry
 * Handles authentication and cleanup automatically
 */
export class DockerCLIClient {
  private apiToken: string;
  private dockerConfigPath: string;

  constructor(apiToken: string) {
    this.apiToken = apiToken;
    this.dockerConfigPath = join(homedir(), '.docker', 'config.json');
  }

  /**
   * Execute a docker CLI command
   */
  private async execDocker(args: string[], options: { timeout?: number } = {}): Promise<string> {
    const { timeout = 120000 } = options;

    try {
      const { stdout, stderr } = await execFileAsync('docker', args, {
        timeout,
        maxBuffer: 10 * 1024 * 1024,
      });

      if (stderr && !stdout) {
        throw new Error(stderr);
      }

      return stdout.trim();
    } catch (error) {
      if (error instanceof Error) {
        const message = error.message.includes('Command failed')
          ? error.message.split('\n').slice(1).join('\n').trim() || error.message
          : error.message;
        throw new Error(`docker CLI error: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Backup the current Docker config before modifying it.
   * Uses a unique temp file to prevent race conditions with concurrent operations.
   */
  private async backupDockerConfig(): Promise<BackupContext> {
    const backupId = randomBytes(8).toString('hex');
    const backupPath = join(homedir(), '.docker', `.config.backup.${backupId}.json`);

    try {
      const content = await readFile(this.dockerConfigPath, 'utf-8');
      await writeFile(backupPath, content);
      return { backupPath, hadExistingConfig: true };
    } catch {
      // Config doesn't exist yet, that's fine
      return { backupPath: null, hadExistingConfig: false };
    }
  }

  /**
   * Restore the Docker config to its original state.
   * @param context - The backup context from backupDockerConfig
   */
  private async restoreDockerConfig(context: BackupContext): Promise<void> {
    try {
      if (!context.hadExistingConfig) {
        // Config didn't exist before, try to remove Fly's auth entry
        const currentConfig = await readFile(this.dockerConfigPath, 'utf-8');
        const config = JSON.parse(currentConfig);
        if (config.auths && config.auths['registry.fly.io']) {
          delete config.auths['registry.fly.io'];
          // If auths is now empty, clean it up
          if (Object.keys(config.auths).length === 0) {
            delete config.auths;
          }
          await writeFile(this.dockerConfigPath, JSON.stringify(config, null, 2));
        }
      } else if (context.backupPath) {
        // Restore from backup file
        const backupContent = await readFile(context.backupPath, 'utf-8');
        await writeFile(this.dockerConfigPath, backupContent);
      }
    } catch {
      // Best effort cleanup, don't fail the operation
    } finally {
      // Clean up the backup file
      if (context.backupPath) {
        try {
          await unlink(context.backupPath);
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }

  /**
   * Authenticate with Fly.io registry using flyctl
   */
  private async authenticateFlyRegistry(): Promise<void> {
    try {
      await execFileAsync('fly', ['auth', 'docker'], {
        env: {
          ...process.env,
          FLY_API_TOKEN: this.apiToken,
        },
        timeout: 30000,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to authenticate with Fly registry: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Run a Docker operation with automatic Fly registry auth and cleanup.
   * Each call gets its own backup context to support concurrent operations safely.
   */
  private async withFlyAuth<T>(operation: () => Promise<T>): Promise<T> {
    const backupContext = await this.backupDockerConfig();
    try {
      await this.authenticateFlyRegistry();
      return await operation();
    } finally {
      await this.restoreDockerConfig(backupContext);
    }
  }

  /**
   * Push a local image to Fly.io registry
   * @param sourceImage - Local image to push (e.g., "my-app:latest" or "nginx:1.25")
   * @param appName - Fly app name (determines registry path)
   * @param tag - Tag for the pushed image (e.g., "v1", "latest")
   */
  async pushImage(sourceImage: string, appName: string, tag: string): Promise<RegistryImage> {
    validateAppName(appName);
    validateTag(tag);
    const flyImageRef = `registry.fly.io/${appName}:${tag}`;

    return this.withFlyAuth(async () => {
      // Tag the source image with Fly registry path
      await this.execDocker(['tag', sourceImage, flyImageRef]);

      // Push to Fly registry
      await this.execDocker(['push', flyImageRef], { timeout: 300000 });

      // Get the digest of the pushed image
      let digest: string | undefined;
      try {
        const inspectOutput = await this.execDocker([
          'inspect',
          '--format',
          '{{index .RepoDigests 0}}',
          flyImageRef,
        ]);
        const digestMatch = inspectOutput.match(/@(sha256:[a-f0-9]+)/);
        if (digestMatch) {
          digest = digestMatch[1];
        }
      } catch {
        // Digest extraction is best-effort
      }

      return {
        registry: 'registry.fly.io',
        repository: appName,
        tag,
        digest,
      };
    });
  }

  /**
   * Pull an image from Fly.io registry
   * @param appName - Fly app name
   * @param tag - Image tag to pull
   */
  async pullImage(appName: string, tag: string): Promise<RegistryImage> {
    validateAppName(appName);
    validateTag(tag);
    const flyImageRef = `registry.fly.io/${appName}:${tag}`;

    return this.withFlyAuth(async () => {
      await this.execDocker(['pull', flyImageRef], { timeout: 300000 });

      return {
        registry: 'registry.fly.io',
        repository: appName,
        tag,
      };
    });
  }

  /**
   * List tags for an app in Fly.io registry
   * Uses docker manifest inspect to check if tags exist
   * Note: Fly.io doesn't have a list tags API, so we check known patterns
   */
  async listRegistryTags(appName: string): Promise<string[]> {
    validateAppName(appName);
    return this.withFlyAuth(async () => {
      // Try to get tags from the registry using docker manifest inspect
      // Since Fly doesn't have a list API, we'll inspect the manifest to see what's available
      const tags: string[] = [];

      // Check for common tags
      const commonTags = ['latest', 'deployment'];
      for (const tag of commonTags) {
        try {
          await this.execDocker(['manifest', 'inspect', `registry.fly.io/${appName}:${tag}`], {
            timeout: 10000,
          });
          tags.push(tag);
        } catch {
          // Tag doesn't exist, skip
        }
      }

      return tags;
    });
  }

  /**
   * Check if an image exists in Fly.io registry
   */
  async imageExists(appName: string, tag: string): Promise<boolean> {
    validateAppName(appName);
    validateTag(tag);
    return this.withFlyAuth(async () => {
      try {
        await this.execDocker(['manifest', 'inspect', `registry.fly.io/${appName}:${tag}`], {
          timeout: 10000,
        });
        return true;
      } catch {
        return false;
      }
    });
  }
}
