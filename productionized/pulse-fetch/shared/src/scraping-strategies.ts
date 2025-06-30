import type { IScrapingClients } from './server.js';
import type { ScrapingStrategy, IStrategyConfigClient } from './strategy-config/index.js';

export interface ScrapeOptions {
  url: string;
  timeout?: number;
}

export interface ScrapeResult {
  success: boolean;
  content: string | null;
  source: string;
  error?: string;
}

/**
 * Extract URL pattern for strategy learning by taking the path up to the last segment.
 * For example:
 * - https://yelp.com/biz/dolly-san-francisco → yelp.com/biz/
 * - https://reddit.com/r/programming/comments/123/title → reddit.com/r/programming/comments/123/
 * - https://example.com/blog/2024/article → example.com/blog/2024/
 */
export function extractUrlPattern(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const port = urlObj.port;
    const pathname = urlObj.pathname;

    // Include port in hostname if present
    const hostWithPort = port ? `${hostname}:${port}` : hostname;

    // If no path or just root, return hostname with port
    if (!pathname || pathname === '/') {
      return hostWithPort;
    }

    // Split path into segments
    const segments = pathname.split('/').filter((s) => s.length > 0);

    // If no segments or only one segment, return hostname
    if (segments.length <= 1) {
      return hostWithPort;
    }

    // Return everything except the last segment
    const pathWithoutLastSegment = segments.slice(0, -1).join('/');
    return hostWithPort + '/' + pathWithoutLastSegment + '/';
  } catch {
    // If URL parsing fails, return as-is
    return url;
  }
}

/**
 * Universal scraping that tries all strategies sequentially
 * Default (COST optimization): native -> firecrawl -> brightdata
 * SPEED optimization: firecrawl -> brightdata (skips native)
 */
export async function scrapeUniversal(
  clients: IScrapingClients,
  options: ScrapeOptions
): Promise<ScrapeResult> {
  const { url } = options;
  const optimizeFor = process.env.OPTIMIZE_FOR || 'COST';

  // Helper function to try native scraping
  const tryNative = async (): Promise<ScrapeResult | null> => {
    try {
      const nativeResult = await clients.native.scrape(url, { timeout: options.timeout });
      if (nativeResult.success && nativeResult.status === 200 && nativeResult.data) {
        return {
          success: true,
          content: nativeResult.data,
          source: 'native',
        };
      }
    } catch {
      // Continue to next strategy
    }
    return null;
  };

  // Helper function to try Firecrawl scraping
  const tryFirecrawl = async (): Promise<ScrapeResult | null> => {
    if (!clients.firecrawl) return null;

    try {
      const firecrawlResult = await clients.firecrawl.scrape(url, {
        formats: ['html'],
      });

      if (firecrawlResult.success && firecrawlResult.data) {
        return {
          success: true,
          content: firecrawlResult.data.html,
          source: 'firecrawl',
        };
      }
    } catch {
      // Continue to next strategy
    }
    return null;
  };

  // Helper function to try BrightData scraping
  const tryBrightData = async (): Promise<ScrapeResult | null> => {
    if (!clients.brightData) return null;

    try {
      const brightDataResult = await clients.brightData.scrape(url);
      if (brightDataResult.success && brightDataResult.data) {
        return {
          success: true,
          content: brightDataResult.data,
          source: 'brightdata',
        };
      }
    } catch {
      // All strategies failed
    }
    return null;
  };

  // Execute strategies based on optimization mode
  if (optimizeFor === 'SPEED') {
    // SPEED mode: firecrawl -> brightdata (skip native)
    const firecrawlResult = await tryFirecrawl();
    if (firecrawlResult) return firecrawlResult;

    const brightDataResult = await tryBrightData();
    if (brightDataResult) return brightDataResult;
  } else {
    // COST mode (default): native -> firecrawl -> brightdata
    const nativeResult = await tryNative();
    if (nativeResult) return nativeResult;

    const firecrawlResult = await tryFirecrawl();
    if (firecrawlResult) return firecrawlResult;

    const brightDataResult = await tryBrightData();
    if (brightDataResult) return brightDataResult;
  }

  return {
    success: false,
    content: null,
    source: 'none',
    error: 'All fallback strategies failed',
  };
}

/**
 * Try a specific scraping strategy
 */
export async function scrapeWithSingleStrategy(
  clients: IScrapingClients,
  strategy: ScrapingStrategy,
  options: ScrapeOptions
): Promise<ScrapeResult> {
  const { url } = options;

  try {
    switch (strategy) {
      case 'native': {
        const result = await clients.native.scrape(url, { timeout: options.timeout });
        if (result.success && result.status === 200 && result.data) {
          return {
            success: true,
            content: result.data,
            source: 'native',
          };
        }
        break;
      }

      case 'firecrawl': {
        if (!clients.firecrawl) {
          return {
            success: false,
            content: null,
            source: 'firecrawl',
            error: 'Firecrawl client not available',
          };
        }

        const result = await clients.firecrawl.scrape(url, {
          formats: ['html'],
        });

        if (result.success && result.data) {
          return {
            success: true,
            content: result.data.html,
            source: 'firecrawl',
          };
        }
        break;
      }

      case 'brightdata': {
        if (!clients.brightData) {
          return {
            success: false,
            content: null,
            source: 'brightdata',
            error: 'BrightData client not available',
          };
        }

        const result = await clients.brightData.scrape(url);
        if (result.success && result.data) {
          return {
            success: true,
            content: result.data,
            source: 'brightdata',
          };
        }
        break;
      }

      default:
        return {
          success: false,
          content: null,
          source: strategy,
          error: `Unknown strategy: ${strategy}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      content: null,
      source: strategy,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  return {
    success: false,
    content: null,
    source: strategy,
    error: `Strategy ${strategy} failed`,
  };
}

/**
 * Scrape with strategy configuration
 * First tries the configured strategy for the URL, then falls back to universal approach
 */
export async function scrapeWithStrategy(
  clients: IScrapingClients,
  configClient: IStrategyConfigClient,
  options: ScrapeOptions,
  explicitStrategy?: ScrapingStrategy
): Promise<ScrapeResult> {
  // If explicit strategy provided, try it first
  if (explicitStrategy) {
    const explicitResult = await scrapeWithSingleStrategy(clients, explicitStrategy, options);
    if (explicitResult.success) {
      return explicitResult;
    }

    // If explicit strategy failed, fall back to universal
    console.log(
      `Explicit strategy '${explicitStrategy}' failed, falling back to universal approach`
    );
    const universalResult = await scrapeUniversal(clients, options);

    // If universal succeeded and we have a config client, save the successful strategy
    if (universalResult.success && universalResult.source !== 'none') {
      try {
        const urlPattern = extractUrlPattern(options.url);
        await configClient.upsertEntry({
          prefix: urlPattern,
          default_strategy: universalResult.source as ScrapingStrategy,
          notes: `Auto-discovered after ${explicitStrategy} failed`,
        });
      } catch (error) {
        // Don't fail scraping if config update fails
        console.warn('Failed to update strategy config:', error);
      }
    }

    return universalResult;
  }

  // Try to get configured strategy for this URL
  let configuredStrategy: ScrapingStrategy | null = null;
  try {
    configuredStrategy = await configClient.getStrategyForUrl(options.url);
  } catch (error) {
    console.warn('Failed to load strategy config:', error);
  }

  // If we have a configured strategy, try it first
  if (configuredStrategy) {
    const configuredResult = await scrapeWithSingleStrategy(clients, configuredStrategy, options);
    if (configuredResult.success) {
      return configuredResult;
    }

    console.log(
      `Configured strategy '${configuredStrategy}' failed, falling back to universal approach`
    );
  }

  // Fall back to universal approach
  const universalResult = await scrapeUniversal(clients, options);

  // If universal succeeded and we don't have a configured strategy, save it
  if (universalResult.success && universalResult.source !== 'none' && !configuredStrategy) {
    try {
      const urlPattern = extractUrlPattern(options.url);
      await configClient.upsertEntry({
        prefix: urlPattern,
        default_strategy: universalResult.source as ScrapingStrategy,
        notes: 'Auto-discovered via universal fallback',
      });
    } catch (error) {
      // Don't fail scraping if config update fails
      console.warn('Failed to update strategy config:', error);
    }
  }

  return universalResult;
}
