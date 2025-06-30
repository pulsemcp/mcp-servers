import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IScrapingClients, StrategyConfigFactory } from '../server.js';
import { scrapeWithStrategy } from '../scraping-strategies.js';
import { ResourceStorageFactory } from '../storage/index.js';

const ScrapeArgsSchema = z.object({
  url: z
    .string()
    .url()
    .describe(
      'The webpage URL to scrape (e.g., "https://example.com/article", "https://api.example.com/docs")'
    ),
  timeout: z
    .number()
    .optional()
    .default(60000)
    .describe(
      'Maximum time to wait for page load in milliseconds. Increase for slow-loading sites (e.g., 120000 for 2 minutes). Default: 60000 (1 minute)'
    ),
  extract: z
    .string()
    .optional()
    .describe(
      'Natural language description of what specific information to extract from the page (e.g., "article title and publish date", "product prices and availability", "all email addresses"). Note: This feature is not yet implemented - currently returns raw HTML'
    ),
  maxChars: z
    .number()
    .optional()
    .default(100000)
    .describe(
      'Maximum number of characters to return from the scraped content. Useful for limiting response size. Default: 100000'
    ),
  startIndex: z
    .number()
    .optional()
    .default(0)
    .describe(
      'Character position to start reading from. Use with maxChars for pagination through large documents (e.g., startIndex: 100000 to skip first 100k chars). Default: 0'
    ),
  saveResult: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      'Whether to save the scraped content as an MCP Resource for later retrieval. Default: true'
    ),
});

export function scrapeTool(
  _server: Server,
  clientsFactory: () => IScrapingClients,
  strategyConfigFactory: StrategyConfigFactory
) {
  return {
    name: 'scrape',
    description: `Scrape webpage content using intelligent automatic strategy selection. This tool fetches raw HTML content from any URL, automatically choosing the best scraping method based on the site's requirements and past successes.

Example response:
{
  "content": [
    {
      "type": "text",
      "text": "<!DOCTYPE html>\n<html>\n<head><title>Example Article</title></head>\n<body>\n<article>\n<h1>Breaking News: Technology Advances</h1>\n<p>Content of the article...</p>\n</article>\n</body>\n</html>\n\n---\nScraped using: native"
    }
  ]
}

Scraping strategies:
- native: Direct HTTP fetch (fastest, works for most public sites)
- firecrawl: Advanced scraping with JavaScript rendering (requires FIRECRAWL_API_KEY)
- brightdata: Premium scraping for heavily protected sites (requires BRIGHTDATA_BEARER_TOKEN)

The tool automatically:
1. Tries the most appropriate method based on learned domain patterns
2. Falls back to alternative methods if the first attempt fails
3. Remembers successful strategies for future requests to the same domain

Use cases:
- Fetching article content for analysis or summarization
- Extracting data from public websites for research
- Accessing JavaScript-heavy sites that require rendering
- Scraping content from sites with anti-bot protection
- Monitoring webpage changes over time
- Gathering data for competitive analysis`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        url: {
          type: 'string',
          format: 'uri',
          description: 'The webpage URL to scrape (e.g., "https://example.com/article")',
        },
        timeout: {
          type: 'number',
          default: 60000,
          description:
            'Maximum time to wait for page load in milliseconds. Increase for slow sites. Default: 60000',
        },
        extract: {
          type: 'string',
          description:
            'Natural language description of what to extract (not yet implemented - returns raw HTML)',
        },
        maxChars: {
          type: 'number',
          default: 100000,
          description: 'Maximum number of characters to return. Default: 100000',
        },
        startIndex: {
          type: 'number',
          default: 0,
          description: 'Character position to start from. Use for pagination. Default: 0',
        },
        saveResult: {
          type: 'boolean',
          default: true,
          description: 'Whether to save as MCP Resource. Default: true',
        },
      },
      required: ['url'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = ScrapeArgsSchema.parse(args);
        const clients = clientsFactory();
        const configClient = strategyConfigFactory();

        const { url, maxChars, startIndex, timeout, extract } = validatedArgs;

        // Use the new strategy system (no explicit strategy from user)
        const result = await scrapeWithStrategy(
          clients,
          configClient,
          {
            url,
            timeout,
          },
          undefined // No explicit strategy - let the system decide
        );

        if (!result.success || !result.content) {
          let errorMessage = `Failed to scrape ${url}. ${result.error || 'All strategies failed'}.`;

          // Add specific guidance for timeout errors
          if (result.error && result.error.toLowerCase().includes('timeout')) {
            errorMessage += ` The current timeout is ${timeout}ms. You can increase it by passing a larger timeout value.`;
          }

          errorMessage += ` Available methods: ${[
            'native',
            clients.firecrawl ? 'firecrawl' : null,
            clients.brightData ? 'brightdata' : null,
          ]
            .filter(Boolean)
            .join(', ')}`;

          return {
            content: [
              {
                type: 'text' as const,
                text: errorMessage,
              },
            ],
            isError: true,
          };
        }

        // Apply content processing
        let processedContent = result.content;

        // TODO: Implement extraction logic when extract parameter is provided
        // For now, just return the raw content regardless of extract parameter
        if (extract) {
          // Future implementation will transform content based on the extract description
          // Currently just passes through the raw content
        }

        // Apply character limits and pagination
        if (startIndex > 0) {
          processedContent = processedContent.slice(startIndex);
        }

        let wasTruncated = false;
        if (processedContent.length > maxChars) {
          processedContent = processedContent.slice(0, maxChars);
          wasTruncated = true;
        }

        // Format output
        let resultText = processedContent;
        if (wasTruncated) {
          resultText += `\n\n[Content truncated at ${maxChars} characters. Use startIndex parameter to continue reading from character ${startIndex + maxChars}]`;
        }

        resultText += `\n\n---\nScraped using: ${result.source}`;

        // Save as resource if requested
        let resourceUri: string | undefined;
        if (validatedArgs.saveResult) {
          try {
            const storage = await ResourceStorageFactory.create();
            const contentType = 'text/html'; // Always HTML since we return raw HTML now

            resourceUri = await storage.write(url, processedContent, {
              contentType,
              title: result.metadata?.title as string | undefined,
              description:
                (result.metadata?.description as string | undefined) ||
                `Scraped content from ${url}`,
              source: result.source,
            });
          } catch (error) {
            console.error('Failed to save resource:', error);
          }
        }

        const response: {
          content: Array<{
            type: string;
            text?: string;
            uri?: string;
            name?: string;
            mimeType?: string;
            description?: string;
          }>;
        } = {
          content: [
            {
              type: 'text' as const,
              text: resultText,
            },
          ],
        };

        // Add resource link if saved
        if (resourceUri) {
          response.content.push({
            type: 'resource_link' as const,
            uri: resourceUri,
            name: `Scraped: ${new URL(url).hostname}`,
            mimeType: 'text/html', // Always HTML since we return raw HTML now
            description: `Scraped content from ${url}`,
          });
        }

        return response;
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
