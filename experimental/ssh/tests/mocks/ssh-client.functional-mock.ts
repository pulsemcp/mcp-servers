import { vi } from 'vitest';
import type { ISSHClient, CommandResult, DirectoryEntry } from '../../shared/src/server.js';

export function createMockSSHClient(): ISSHClient {
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    isConnected: vi.fn().mockReturnValue(true),

    execute: vi.fn().mockResolvedValue({
      stdout: 'command output',
      stderr: '',
      exitCode: 0,
    } as CommandResult),

    upload: vi.fn().mockResolvedValue(undefined),
    download: vi.fn().mockResolvedValue(undefined),

    listDirectory: vi.fn().mockResolvedValue([
      {
        filename: 'file1.txt',
        isDirectory: false,
        size: 1024,
        modifyTime: new Date('2024-01-01'),
        permissions: '-rw-r--r--',
      },
      {
        filename: 'subdir',
        isDirectory: true,
        size: 4096,
        modifyTime: new Date('2024-01-01'),
        permissions: 'drwxr-xr-x',
      },
    ] as DirectoryEntry[]),
  };
}
