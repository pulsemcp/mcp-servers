import { promises as fs } from 'fs';
import { dirname } from 'path';
import { getStrategyConfigPath } from './default-config.js';
import type {
  IStrategyConfigClient,
  StrategyConfigEntry,
  StrategyConfigOptions,
  ScrapingStrategy,
} from './types.js';

/**
 * Filesystem-based implementation of strategy config client
 * Stores configuration as a markdown table in a local file
 */
export class FilesystemStrategyConfigClient implements IStrategyConfigClient {
  private configPath: string | undefined;
  private configPathPromise: Promise<string> | undefined;
  private options: StrategyConfigOptions;

  constructor(options: StrategyConfigOptions = {}) {
    this.options = options;
    if (options.configPath) {
      this.configPath = options.configPath;
    }
  }

  private async getConfigPath(): Promise<string> {
    if (this.configPath) {
      return this.configPath;
    }

    // If we're already resolving the path, wait for it
    if (this.configPathPromise) {
      return this.configPathPromise;
    }

    // Start resolving the path
    this.configPathPromise = getStrategyConfigPath();
    this.configPath = await this.configPathPromise;
    return this.configPath;
  }

  async loadConfig(): Promise<StrategyConfigEntry[]> {
    try {
      const configPath = await this.getConfigPath();
      const content = await fs.readFile(configPath, 'utf-8');
      return this.parseMarkdownTable(content);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist, return empty config
        return [];
      }
      throw error;
    }
  }

  async saveConfig(config: StrategyConfigEntry[]): Promise<void> {
    const configPath = await this.getConfigPath();
    const markdownContent = this.generateMarkdownTable(config);

    // Ensure directory exists
    await fs.mkdir(dirname(configPath), { recursive: true });

    await fs.writeFile(configPath, markdownContent, 'utf-8');
  }

  async upsertEntry(entry: StrategyConfigEntry): Promise<void> {
    const config = await this.loadConfig();

    // Find existing entry with same prefix
    const existingIndex = config.findIndex((e) => e.prefix === entry.prefix);

    if (existingIndex >= 0) {
      // Update existing entry
      config[existingIndex] = entry;
    } else {
      // Add new entry
      config.push(entry);
    }

    // Sort by prefix length (longest first) for better matching
    config.sort((a, b) => b.prefix.length - a.prefix.length);

    await this.saveConfig(config);
  }

  async getStrategyForUrl(url: string): Promise<ScrapingStrategy | null> {
    const config = await this.loadConfig();

    // Parse URL to get hostname and path
    let hostname: string;
    let pathname: string;

    try {
      const urlObj = new URL(url);
      hostname = urlObj.hostname;
      pathname = urlObj.pathname;
    } catch {
      return null;
    }

    // Find matching prefix (longest match first due to sorting)
    for (const entry of config) {
      if (this.matchesPrefix(hostname, pathname, entry.prefix)) {
        return entry.default_strategy;
      }
    }

    return null;
  }

  private matchesPrefix(hostname: string, pathname: string, prefix: string): boolean {
    // If prefix contains slash, match hostname + path
    if (prefix.includes('/')) {
      const fullPath = hostname + pathname;
      return fullPath.startsWith(prefix) || fullPath.startsWith('www.' + prefix);
    }

    // Otherwise just match hostname
    return hostname === prefix || hostname === 'www.' + prefix || hostname.endsWith('.' + prefix);
  }

  private parseMarkdownTable(content: string): StrategyConfigEntry[] {
    const lines = content.split('\n');
    const entries: StrategyConfigEntry[] = [];

    let inTable = false;
    let headerFound = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines
      if (!trimmed) continue;

      // Check if this is a table row
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        if (!headerFound) {
          // Check if this is the header row
          if (
            trimmed.toLowerCase().includes('prefix') &&
            trimmed.toLowerCase().includes('default_strategy') &&
            trimmed.toLowerCase().includes('notes')
          ) {
            headerFound = true;
            inTable = true;
          }
          continue;
        }

        // Skip separator row
        if (trimmed.includes('---')) {
          continue;
        }

        if (inTable) {
          const entry = this.parseTableRow(trimmed);
          if (entry) {
            entries.push(entry);
          }
        }
      } else if (inTable) {
        // End of table
        break;
      }
    }

    return entries;
  }

  private parseTableRow(row: string): StrategyConfigEntry | null {
    // Remove leading/trailing pipes and split
    const cells = row
      .slice(1, -1)
      .split('|')
      .map((cell) => cell.trim());

    if (cells.length < 2) return null;

    const prefix = cells[0];
    const strategy = cells[1] as ScrapingStrategy;
    const notes = cells[2] || undefined;

    // Validate strategy
    if (!['native', 'firecrawl', 'brightdata'].includes(strategy)) {
      return null;
    }

    return {
      prefix,
      default_strategy: strategy,
      notes: notes || undefined,
    };
  }

  private generateMarkdownTable(config: StrategyConfigEntry[]): string {
    const header = `# Scraping Strategy Configuration

This file defines which scraping strategy to use for different URL prefixes (firecrawl, brightdata, native).

| prefix | default_strategy | notes |
| ------ | ---------------- | ----- |`;

    const rows = config.map((entry) => {
      const notes = entry.notes || '';
      return `| ${entry.prefix} | ${entry.default_strategy} | ${notes} |`;
    });

    return [header, ...rows, ''].join('\n');
  }
}
