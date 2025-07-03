import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { logDebug } from '../logging.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get the path to the strategy configuration file.
 *
 * Priority:
 * 1. STRATEGY_CONFIG_PATH environment variable
 * 2. Default temp directory location
 *
 * If using default location and file doesn't exist, copies the
 * built-in config to the temp directory.
 */
export async function getStrategyConfigPath(): Promise<string> {
  // Check for environment variable
  const envPath = process.env.STRATEGY_CONFIG_PATH;
  if (envPath) {
    return envPath;
  }

  // Use default temp directory location
  const tempDir = join(tmpdir(), 'pulse-fetch');
  const tempConfigPath = join(tempDir, 'scraping-strategies.md');

  // Check if temp config already exists
  try {
    await fs.access(tempConfigPath);
    return tempConfigPath;
  } catch {
    // File doesn't exist, copy the default
    await fs.mkdir(tempDir, { recursive: true });

    // Find the default config file in the source
    const defaultConfigPath = join(__dirname, '..', '..', '..', 'scraping-strategies.md');

    try {
      const defaultContent = await fs.readFile(defaultConfigPath, 'utf-8');
      await fs.writeFile(tempConfigPath, defaultContent, 'utf-8');
      logDebug('getStrategyConfigPath', `Initialized strategy config at: ${tempConfigPath}`);
    } catch {
      // If we can't find the default config, create a minimal one
      const minimalConfig = `# Scraping Strategy Configuration

This file defines which scraping strategy to use for different URL prefixes (firecrawl, brightdata, native).

| prefix        | default_strategy | notes                                      |
| ------------- | ---------------- | ------------------------------------------ |
| yelp.com/biz/ | brightdata       | Yelp business pages need anti-bot measures |
`;
      await fs.writeFile(tempConfigPath, minimalConfig, 'utf-8');
      logDebug('getStrategyConfigPath', `Created minimal strategy config at: ${tempConfigPath}`);
    }

    return tempConfigPath;
  }
}
