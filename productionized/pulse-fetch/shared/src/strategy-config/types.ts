/**
 * Types for scraping strategy configuration system
 */

export type ScrapingStrategy = 'native' | 'firecrawl' | 'brightdata';

export interface StrategyConfigEntry {
  prefix: string;
  default_strategy: ScrapingStrategy;
  notes?: string;
}

export interface IStrategyConfigClient {
  /**
   * Load the strategy configuration
   */
  loadConfig(): Promise<StrategyConfigEntry[]>;

  /**
   * Save the strategy configuration
   */
  saveConfig(config: StrategyConfigEntry[]): Promise<void>;

  /**
   * Add or update a single strategy entry
   */
  upsertEntry(entry: StrategyConfigEntry): Promise<void>;

  /**
   * Get strategy for a specific URL
   */
  getStrategyForUrl(url: string): Promise<ScrapingStrategy | null>;
}

export interface StrategyConfigOptions {
  configPath?: string;
}
