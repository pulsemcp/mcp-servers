/**
 * Native scraping client implementation
 * Provides basic HTTP fetching without external services
 */

export interface INativeScrapingClient {
  scrape(url: string, options?: NativeScrapingOptions): Promise<NativeScrapingResult>;
}

export interface NativeScrapingOptions {
  timeout?: number;
  headers?: Record<string, string>;
  method?: 'GET' | 'POST';
  body?: string;
}

export interface NativeScrapingResult {
  success: boolean;
  data?: string;
  error?: string;
  statusCode?: number;
  headers?: Record<string, string>;
  contentType?: string;
  contentLength?: number;
}

export class NativeScrapingClient implements INativeScrapingClient {
  private defaultHeaders: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (compatible; PulseMCP/1.0; +https://pulsemcp.com)',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate',
    'Cache-Control': 'no-cache',
  };

  async scrape(url: string, options: NativeScrapingOptions = {}): Promise<NativeScrapingResult> {
    try {
      const controller = new AbortController();
      const timeoutId = options.timeout
        ? setTimeout(() => controller.abort(), options.timeout)
        : null;

      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          ...this.defaultHeaders,
          ...options.headers,
        },
        body: options.body,
        signal: controller.signal,
      });

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          statusCode: response.status,
          headers: responseHeaders,
        };
      }

      const data = await response.text();

      return {
        success: true,
        data,
        statusCode: response.status,
        headers: responseHeaders,
        contentType: response.headers.get('content-type') || undefined,
        contentLength: data.length,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout',
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
