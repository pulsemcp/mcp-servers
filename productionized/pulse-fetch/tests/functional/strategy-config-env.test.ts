import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { FilesystemStrategyConfigClient } from '../../shared/src/strategy-config/filesystem-client.js';
import type { StrategyConfigEntry } from '../../shared/src/strategy-config/types.js';

describe('FilesystemStrategyConfigClient with Environment', () => {
  const originalEnv = process.env.STRATEGY_CONFIG_PATH;
  const testDir = join(tmpdir(), 'pulse-fetch-test-' + Date.now());
  const customConfigPath = join(testDir, 'custom-strategies.md');

  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Restore original environment
    if (originalEnv) {
      process.env.STRATEGY_CONFIG_PATH = originalEnv;
    } else {
      delete process.env.STRATEGY_CONFIG_PATH;
    }

    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should use custom path when provided in constructor', async () => {
    // Create the custom config file first
    await fs.writeFile(
      customConfigPath,
      '# Test Config\n| prefix | default_strategy | notes |\n|--------|------------------|-------|\n',
      'utf-8'
    );

    const client = new FilesystemStrategyConfigClient({ configPath: customConfigPath });

    const testEntry: StrategyConfigEntry = {
      prefix: 'test.com',
      default_strategy: 'native',
      notes: 'Test entry',
    };

    await client.upsertEntry(testEntry);

    // Verify file was created at custom path
    const content = await fs.readFile(customConfigPath, 'utf-8');
    expect(content).toContain('test.com');
    expect(content).toContain('native');
  });

  it('should use environment variable path when no path provided', async () => {
    process.env.STRATEGY_CONFIG_PATH = customConfigPath;

    // Create a test config file
    const testContent = `# Test Config
| prefix | default_strategy | notes |
|--------|------------------|-------|
| env.com | firecrawl | From env |
`;
    await fs.writeFile(customConfigPath, testContent, 'utf-8');

    // Create client without explicit path
    const client = new FilesystemStrategyConfigClient();

    // Should read from env path
    const config = await client.loadConfig();
    expect(config).toHaveLength(1);
    expect(config[0].prefix).toBe('env.com');
    expect(config[0].default_strategy).toBe('firecrawl');
  });

  it('should use default temp directory when no path provided and no env var', async () => {
    delete process.env.STRATEGY_CONFIG_PATH;

    // Clean up default temp directory before test
    try {
      await fs.rm(join(tmpdir(), 'pulse-fetch'), { recursive: true, force: true });
    } catch {
      // Ignore if doesn't exist
    }

    const client = new FilesystemStrategyConfigClient();

    // Add an entry
    const testEntry: StrategyConfigEntry = {
      prefix: 'default.com',
      default_strategy: 'brightdata',
      notes: 'Default location',
    };

    await client.upsertEntry(testEntry);

    // Create a new client to ensure we're reading from disk
    const newClient = new FilesystemStrategyConfigClient();
    const config = await newClient.loadConfig();

    // The config should contain our entry (among possibly others from initialization)
    const addedEntry = config.find((e) => e.prefix === 'default.com');
    expect(addedEntry).toBeDefined();
    expect(addedEntry?.default_strategy).toBe('brightdata');
    expect(addedEntry?.notes).toBe('Default location');

    // Clean up after test
    try {
      await fs.rm(join(tmpdir(), 'pulse-fetch'), { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });
});
