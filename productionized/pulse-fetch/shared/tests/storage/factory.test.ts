import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ResourceStorageFactory } from '../../src/storage/factory.js';
import { MemoryResourceStorage } from '../../src/storage/memory.js';
import { FileSystemResourceStorage } from '../../src/storage/filesystem.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('ResourceStorageFactory', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset the factory instance
    ResourceStorageFactory.reset();
    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    ResourceStorageFactory.reset();
  });

  describe('create', () => {
    it('should create MemoryResourceStorage by default', async () => {
      delete process.env.MCP_RESOURCE_STORAGE;

      const storage = await ResourceStorageFactory.create();

      expect(storage).toBeInstanceOf(MemoryResourceStorage);
    });

    it('should create MemoryResourceStorage when explicitly set', async () => {
      process.env.MCP_RESOURCE_STORAGE = 'memory';

      const storage = await ResourceStorageFactory.create();

      expect(storage).toBeInstanceOf(MemoryResourceStorage);
    });

    it('should create FileSystemResourceStorage when set', async () => {
      process.env.MCP_RESOURCE_STORAGE = 'filesystem';

      const storage = await ResourceStorageFactory.create();

      expect(storage).toBeInstanceOf(FileSystemResourceStorage);
    });

    it('should use custom filesystem root when provided', async () => {
      const customPath = path.join(os.tmpdir(), 'mcp-test-custom');
      process.env.MCP_RESOURCE_STORAGE = 'filesystem';
      process.env.MCP_RESOURCE_FILESYSTEM_ROOT = customPath;

      const storage = (await ResourceStorageFactory.create()) as FileSystemResourceStorage;

      // Write a test file to verify the path is used
      const uri = await storage.write('https://example.com', 'test');
      expect(uri).toContain(customPath);

      // Clean up
      await fs.rm(customPath, { recursive: true, force: true }).catch(() => {});
    });

    it('should throw error for unsupported storage type', async () => {
      process.env.MCP_RESOURCE_STORAGE = 'unsupported';

      await expect(ResourceStorageFactory.create()).rejects.toThrow(
        'Unsupported storage type: unsupported. Supported types: memory, filesystem'
      );
    });

    it('should return the same instance on subsequent calls', async () => {
      process.env.MCP_RESOURCE_STORAGE = 'memory';

      const storage1 = await ResourceStorageFactory.create();
      const storage2 = await ResourceStorageFactory.create();

      expect(storage1).toBe(storage2);
    });

    it('should handle case-insensitive storage type', async () => {
      process.env.MCP_RESOURCE_STORAGE = 'MEMORY';

      const storage = await ResourceStorageFactory.create();

      expect(storage).toBeInstanceOf(MemoryResourceStorage);
    });
  });

  describe('reset', () => {
    it('should clear the singleton instance', async () => {
      process.env.MCP_RESOURCE_STORAGE = 'memory';

      const storage1 = await ResourceStorageFactory.create();
      ResourceStorageFactory.reset();
      const storage2 = await ResourceStorageFactory.create();

      expect(storage1).not.toBe(storage2);
    });
  });
});
