import { Client, ConnectConfig, ClientChannel } from 'ssh2';
import * as fs from 'fs';
import * as path from 'path';
import { logDebug, logError } from '../logging.js';

/**
 * SSH connection configuration
 */
export interface SSHConfig {
  host: string;
  port?: number;
  username: string;
  /** Path to private key file (optional if using SSH agent) */
  privateKeyPath?: string;
  /** Passphrase for encrypted private key */
  passphrase?: string;
  /** SSH agent socket path (defaults to SSH_AUTH_SOCK env var) */
  agentSocket?: string;
  /** Connection timeout in milliseconds */
  timeout?: number;
  /** Default command execution timeout in milliseconds (activity-based) */
  commandTimeout?: number;
}

/**
 * Result of a command execution
 */
export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Interface for SSH client operations
 */
export interface ISSHClient {
  connect(): Promise<void>;
  disconnect(): void;
  isConnected(): boolean;
  execute(command: string, options?: ExecuteOptions): Promise<CommandResult>;
  upload(localPath: string, remotePath: string): Promise<void>;
  download(remotePath: string, localPath: string): Promise<void>;
  listDirectory(remotePath: string): Promise<DirectoryEntry[]>;
}

export interface ExecuteOptions {
  cwd?: string;
  timeout?: number;
}

export interface DirectoryEntry {
  filename: string;
  isDirectory: boolean;
  size: number;
  modifyTime: Date;
  permissions: string;
}

/**
 * SSH Client implementation with SSH agent authentication support.
 *
 * This client supports multiple authentication methods:
 * 1. SSH Agent (recommended for passphrase-protected keys)
 * 2. Private key file
 * 3. Private key file with passphrase
 */
export class SSHClient implements ISSHClient {
  private client: Client;
  private connected: boolean = false;
  private config: SSHConfig;

  constructor(config: SSHConfig) {
    this.config = config;
    this.client = new Client();
  }

  /**
   * Establish SSH connection using the configured authentication method
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    const connConfig = this.buildConnectionConfig();

    return new Promise((resolve, reject) => {
      const timeout = this.config.timeout || 30000;
      const timeoutId = setTimeout(() => {
        this.client.end();
        reject(new Error(`SSH connection timeout after ${timeout}ms`));
      }, timeout);

      this.client.once('ready', () => {
        clearTimeout(timeoutId);
        this.connected = true;
        logDebug('SSHClient', `Connected to ${this.config.host}:${this.config.port || 22}`);
        resolve();
      });

      this.client.once('error', (err) => {
        clearTimeout(timeoutId);
        this.connected = false;
        logError('SSHClient', `Connection error: ${err.message}`);
        reject(err);
      });

      this.client.connect(connConfig);
    });
  }

  /**
   * Build the SSH connection configuration based on available authentication methods
   */
  private buildConnectionConfig(): ConnectConfig {
    const config: ConnectConfig = {
      host: this.config.host,
      port: this.config.port || 22,
      username: this.config.username,
      readyTimeout: this.config.timeout || 30000,
    };

    // Priority 1: SSH Agent (best for passphrase-protected keys)
    const agentSocket = this.config.agentSocket || process.env.SSH_AUTH_SOCK;
    if (agentSocket) {
      config.agent = agentSocket;
      logDebug('SSHClient', 'Using SSH agent authentication');
    }

    // Priority 2: Private key file (with optional passphrase)
    if (this.config.privateKeyPath) {
      const keyPath = this.resolveKeyPath(this.config.privateKeyPath);
      if (fs.existsSync(keyPath)) {
        config.privateKey = fs.readFileSync(keyPath);
        if (this.config.passphrase) {
          config.passphrase = this.config.passphrase;
        }
        logDebug('SSHClient', `Using private key: ${keyPath}`);
      } else {
        logError('SSHClient', `Private key not found: ${keyPath}`);
      }
    }

    return config;
  }

  /**
   * Resolve key path, expanding ~ to home directory
   */
  private resolveKeyPath(keyPath: string): string {
    if (keyPath.startsWith('~')) {
      const home = process.env.HOME || process.env.USERPROFILE || '';
      return path.join(home, keyPath.slice(1));
    }
    return path.resolve(keyPath);
  }

  /**
   * Disconnect from the SSH server
   */
  disconnect(): void {
    if (this.connected) {
      this.client.end();
      this.connected = false;
      logDebug('SSHClient', 'Disconnected');
    }
  }

  /**
   * Check if connected to the SSH server
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Execute a command on the remote server.
   *
   * The timeout is activity-based: it resets whenever stdout or stderr data is received.
   * This allows long-running commands that produce periodic output to complete successfully,
   * while still timing out commands that hang with no activity.
   */
  async execute(command: string, options?: ExecuteOptions): Promise<CommandResult> {
    if (!this.connected) {
      await this.connect();
    }

    // Build full command with optional working directory
    let fullCommand = command;
    if (options?.cwd) {
      fullCommand = `cd ${this.escapeShellArg(options.cwd)} && ${command}`;
    }

    return new Promise((resolve, reject) => {
      // Priority: per-command timeout > config default > 60 seconds
      // Use nullish coalescing to properly handle timeout=0
      const timeout = options?.timeout ?? this.config.commandTimeout ?? 60000;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      let stdout = '';
      let stderr = '';

      // Declare stream variable for use in resetTimeout
      let stream: ClientChannel | null = null;

      // Helper to reset the activity timeout
      const resetTimeout = () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (stream) stream.close();
          reject(new Error(`Command timeout after ${timeout}ms of inactivity`));
        }, timeout);
      };

      this.client.exec(fullCommand, (err, execStream) => {
        if (err) {
          reject(err);
          return;
        }

        stream = execStream;

        // Start the initial activity timeout
        resetTimeout();

        stream.on('data', (data: Buffer) => {
          stdout += data.toString();
          // Reset timeout on activity
          resetTimeout();
        });

        stream.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
          // Reset timeout on activity
          resetTimeout();
        });

        stream.on('close', (code: number) => {
          if (timeoutId) clearTimeout(timeoutId);
          resolve({
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode: code ?? 0,
          });
        });

        stream.on('error', (streamErr: Error) => {
          if (timeoutId) clearTimeout(timeoutId);
          reject(streamErr);
        });
      });
    });
  }

  /**
   * Upload a file to the remote server via SFTP
   */
  async upload(localPath: string, remotePath: string): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      this.client.sftp((err, sftp) => {
        if (err) {
          reject(err);
          return;
        }

        const readStream = fs.createReadStream(localPath);
        const writeStream = sftp.createWriteStream(remotePath);

        writeStream.on('close', () => {
          sftp.end();
          resolve();
        });

        writeStream.on('error', (streamErr: Error) => {
          sftp.end();
          reject(streamErr);
        });

        readStream.on('error', (streamErr: Error) => {
          sftp.end();
          reject(streamErr);
        });

        readStream.pipe(writeStream);
      });
    });
  }

  /**
   * Download a file from the remote server via SFTP
   */
  async download(remotePath: string, localPath: string): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      this.client.sftp((err, sftp) => {
        if (err) {
          reject(err);
          return;
        }

        const readStream = sftp.createReadStream(remotePath);
        const writeStream = fs.createWriteStream(localPath);

        writeStream.on('close', () => {
          sftp.end();
          resolve();
        });

        writeStream.on('error', (streamErr: Error) => {
          sftp.end();
          reject(streamErr);
        });

        readStream.on('error', (streamErr: Error) => {
          sftp.end();
          reject(streamErr);
        });

        readStream.pipe(writeStream);
      });
    });
  }

  /**
   * List directory contents on the remote server
   */
  async listDirectory(remotePath: string): Promise<DirectoryEntry[]> {
    if (!this.connected) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      this.client.sftp((err, sftp) => {
        if (err) {
          reject(err);
          return;
        }

        sftp.readdir(remotePath, (readdirErr, list) => {
          sftp.end();

          if (readdirErr) {
            reject(readdirErr);
            return;
          }

          const entries: DirectoryEntry[] = list.map((item) => ({
            filename: item.filename,
            isDirectory: (item.attrs.mode & 0o040000) !== 0,
            size: item.attrs.size,
            modifyTime: new Date(item.attrs.mtime * 1000),
            permissions: this.formatPermissions(item.attrs.mode),
          }));

          resolve(entries);
        });
      });
    });
  }

  /**
   * Format Unix permissions to string representation
   */
  private formatPermissions(mode: number): string {
    const perms = ['---', '--x', '-w-', '-wx', 'r--', 'r-x', 'rw-', 'rwx'];
    const owner = perms[(mode >> 6) & 7];
    const group = perms[(mode >> 3) & 7];
    const other = perms[mode & 7];
    const type = (mode & 0o040000) !== 0 ? 'd' : '-';
    return `${type}${owner}${group}${other}`;
  }

  /**
   * Escape shell argument to prevent injection
   */
  private escapeShellArg(arg: string): string {
    return `'${arg.replace(/'/g, "'\\''")}'`;
  }
}
