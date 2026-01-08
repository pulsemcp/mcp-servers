import { ISSHClient, CommandResult, DirectoryEntry, ExecuteOptions } from './ssh-client.js';

/**
 * Mock data configuration for integration tests
 */
export interface MockSSHData {
  /** Map of command patterns to results */
  commandResponses?: Record<string, CommandResult>;
  /** Map of remote paths to directory listings */
  directoryListings?: Record<string, DirectoryEntry[]>;
  /** Simulated uploaded files (localPath -> remotePath) */
  uploadedFiles?: Map<string, string>;
  /** Simulated downloaded files (remotePath -> localPath) */
  downloadedFiles?: Map<string, string>;
  /** Whether connection should succeed */
  shouldConnect?: boolean;
  /** Error to throw on connection */
  connectionError?: Error;
}

/**
 * Mock SSH client for integration testing.
 * Simulates SSH operations without actual network connections.
 */
export class MockSSHClient implements ISSHClient {
  private connected: boolean = false;
  private mockData: MockSSHData;

  constructor(mockData: MockSSHData = {}) {
    this.mockData = {
      shouldConnect: true,
      commandResponses: {},
      directoryListings: {},
      uploadedFiles: new Map(),
      downloadedFiles: new Map(),
      ...mockData,
    };
  }

  async connect(): Promise<void> {
    if (this.mockData.connectionError) {
      throw this.mockData.connectionError;
    }
    if (!this.mockData.shouldConnect) {
      throw new Error('Connection refused');
    }
    this.connected = true;
  }

  disconnect(): void {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async execute(command: string, _options?: ExecuteOptions): Promise<CommandResult> {
    if (!this.connected) {
      await this.connect();
    }

    // Check for exact command match
    if (this.mockData.commandResponses?.[command]) {
      return this.mockData.commandResponses[command];
    }

    // Check for pattern matches
    for (const [pattern, result] of Object.entries(this.mockData.commandResponses || {})) {
      if (command.includes(pattern)) {
        return result;
      }
    }

    // Default response for unmatched commands
    return {
      stdout: `Mock output for: ${command}`,
      stderr: '',
      exitCode: 0,
    };
  }

  async upload(localPath: string, remotePath: string): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }
    this.mockData.uploadedFiles?.set(localPath, remotePath);
  }

  async download(remotePath: string, localPath: string): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }
    this.mockData.downloadedFiles?.set(remotePath, localPath);
  }

  async listDirectory(remotePath: string): Promise<DirectoryEntry[]> {
    if (!this.connected) {
      await this.connect();
    }

    const listing = this.mockData.directoryListings?.[remotePath];
    if (listing) {
      return listing;
    }

    // Default mock directory listing
    return [
      {
        filename: 'file1.txt',
        isDirectory: false,
        size: 1024,
        modifyTime: new Date(),
        permissions: '-rw-r--r--',
      },
      {
        filename: 'subdir',
        isDirectory: true,
        size: 4096,
        modifyTime: new Date(),
        permissions: 'drwxr-xr-x',
      },
    ];
  }

  // Test helper methods
  getUploadedFiles(): Map<string, string> {
    return this.mockData.uploadedFiles || new Map();
  }

  getDownloadedFiles(): Map<string, string> {
    return this.mockData.downloadedFiles || new Map();
  }
}

/**
 * Create a mock SSH client for integration tests
 */
export function createIntegrationMockSSHClient(mockData: MockSSHData = {}): ISSHClient {
  return new MockSSHClient(mockData);
}
