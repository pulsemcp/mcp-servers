import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';

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
 * Docker CLI client for interacting with Fly.io's registry
 * Handles authentication and cleanup automatically
 */
export class DockerCLIClient {
  private apiToken: string;
  private dockerConfigPath: string;
  private originalConfig: string | null = null;

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
   * Backup the current Docker config before modifying it
   */
  private async backupDockerConfig(): Promise<void> {
    try {
      this.originalConfig = await readFile(this.dockerConfigPath, 'utf-8');
    } catch {
      // Config doesn't exist yet, that's fine
      this.originalConfig = null;
    }
  }

  /**
   * Restore the Docker config to its original state
   */
  private async restoreDockerConfig(): Promise<void> {
    try {
      if (this.originalConfig === null) {
        // Config didn't exist before, try to remove Fly's auth entry
        const currentConfig = await readFile(this.dockerConfigPath, 'utf-8');
        const config = JSON.parse(currentConfig);
        if (config.auths && config.auths['registry.fly.io']) {
          delete config.auths['registry.fly.io'];
          await writeFile(this.dockerConfigPath, JSON.stringify(config, null, 2));
        }
      } else {
        // Restore the original config
        await writeFile(this.dockerConfigPath, this.originalConfig);
      }
    } catch {
      // Best effort cleanup, don't fail the operation
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
   * Run a Docker operation with automatic Fly registry auth and cleanup
   */
  private async withFlyAuth<T>(operation: () => Promise<T>): Promise<T> {
    await this.backupDockerConfig();
    try {
      await this.authenticateFlyRegistry();
      return await operation();
    } finally {
      await this.restoreDockerConfig();
    }
  }

  /**
   * Push a local image to Fly.io registry
   * @param sourceImage - Local image to push (e.g., "my-app:latest" or "nginx:1.25")
   * @param appName - Fly app name (determines registry path)
   * @param tag - Tag for the pushed image (e.g., "v1", "latest")
   */
  async pushImage(sourceImage: string, appName: string, tag: string): Promise<RegistryImage> {
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
