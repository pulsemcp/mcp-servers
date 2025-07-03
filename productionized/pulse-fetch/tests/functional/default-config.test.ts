import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { getStrategyConfigPath } from '../../shared/src/strategy-config/default-config.js';

describe('Default Config Path', () => {
  const originalEnv = process.env.STRATEGY_CONFIG_PATH;

  beforeEach(() => {
    // Clear the environment variable
    delete process.env.STRATEGY_CONFIG_PATH;
  });

  afterEach(async () => {
    // Restore original environment
    if (originalEnv) {
      process.env.STRATEGY_CONFIG_PATH = originalEnv;
    } else {
      delete process.env.STRATEGY_CONFIG_PATH;
    }

    // Clean up default temp directory used by the function
    const defaultTempDir = join(tmpdir(), 'pulse-fetch');
    try {
      await fs.rm(defaultTempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should use environment variable when set', async () => {
    const customPath = '/custom/path/strategies.md';
    process.env.STRATEGY_CONFIG_PATH = customPath;

    const configPath = await getStrategyConfigPath();
    expect(configPath).toBe(customPath);
  });

  it('should use temp directory when environment variable not set', async () => {
    const configPath = await getStrategyConfigPath();
    expect(configPath).toContain(tmpdir());
    expect(configPath).toContain('pulse-fetch');
    expect(configPath).toContain('scraping-strategies.md');
  });

  it('should create temp directory if it does not exist', async () => {
    await getStrategyConfigPath(); // This creates the directory
    const dirPath = join(tmpdir(), 'pulse-fetch');

    // Check that directory was created
    const stats = await fs.stat(dirPath);
    expect(stats.isDirectory()).toBe(true);
  });

  it('should copy default config to temp directory on first run', async () => {
    const configPath = await getStrategyConfigPath();

    // Check that file was created
    const content = await fs.readFile(configPath, 'utf-8');
    expect(content).toContain('# Scraping Strategy Configuration');
    expect(content).toContain('yelp.com/biz/');
    expect(content).toContain('brightdata');
  });

  it('should reuse existing temp config on subsequent calls', async () => {
    // First call creates the file
    const configPath1 = await getStrategyConfigPath();

    // Add some content to the file to make it unique
    await fs.appendFile(configPath1, '\n# Test marker\n', 'utf-8');

    // Second call should reuse the file
    const configPath2 = await getStrategyConfigPath();

    // Verify the file still has our test marker
    const content = await fs.readFile(configPath2, 'utf-8');
    expect(configPath1).toBe(configPath2);
    expect(content).toContain('# Test marker'); // File was reused, not recreated
  });
});
