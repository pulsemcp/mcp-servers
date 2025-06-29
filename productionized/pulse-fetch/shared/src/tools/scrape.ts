import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IScrapingClients, StrategyConfigFactory } from '../server.js';
import { scrapeWithStrategy } from '../scraping-strategies.js';

const ScrapeArgsSchema = z.object({
  url: z.string().url().describe('URL to scrape'),
  format: z
    .enum(['markdown', 'html', 'rawHtml', 'links', 'extract'])
    .optional()
    .default('markdown')
    .describe('Output format for the scraped content'),
  onlyMainContent: z
    .boolean()
    .optional()
    .default(true)
    .describe('Extract only main content, removing navigation and ads'),
  waitFor: z.number().optional().describe('Milliseconds to wait for dynamic content to load'),
  timeout: z.number().optional().describe('Maximum time to wait for page load'),
  extract: z
    .object({
      schema: z.record(z.unknown()).optional().describe('JSON schema for structured data'),
      systemPrompt: z.string().optional().describe('System prompt for LLM extraction'),
      prompt: z.string().optional().describe('User prompt for LLM extraction'),
    })
    .optional()
    .describe('Configuration for structured data extraction'),
  removeBase64Images: z
    .boolean()
    .optional()
    .default(true)
    .describe('Remove base64 images from output'),
  maxChars: z.number().optional().default(100000).describe('Maximum characters to return'),
  startIndex: z.number().optional().default(0).describe('Character index to start output from'),
  saveResource: z.boolean().optional().default(true).describe('Save result as MCP Resource'),
});

export function scrapeTool(
  _server: Server,
  clientsFactory: () => IScrapingClients,
  strategyConfigFactory: StrategyConfigFactory
) {
  return {
    name: 'scrape',
    description: `Scrape a single webpage with smart automatic strategy selection.

The tool automatically determines the best scraping method based on:
1. Previously successful strategies for the domain (learned from past scrapes)
2. Intelligent fallback sequence: native fetch → Firecrawl → BrightData

Features:
- Auto-learning: Successful strategies are remembered for each domain
- Smart fallback: If one method fails, automatically tries the next
- Optimized performance: Uses the fastest suitable method for each site

Examples:
- Extract article content: scrape({url: "https://example.com/article", onlyMainContent: true})
- Get full HTML: scrape({url: "https://example.com", format: "html"})
- Handle protected content: scrape({url: "https://protected-site.com"}) - automatically selects appropriate method`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        url: { type: 'string', format: 'uri', description: 'URL to scrape' },
        format: {
          type: 'string',
          enum: ['markdown', 'html', 'rawHtml', 'links', 'extract'],
          default: 'markdown',
          description: 'Output format for the scraped content',
        },
        onlyMainContent: {
          type: 'boolean',
          default: true,
          description: 'Extract only main content, removing navigation and ads',
        },
        waitFor: {
          type: 'number',
          description: 'Milliseconds to wait for dynamic content to load',
        },
        timeout: { type: 'number', description: 'Maximum time to wait for page load' },
        removeBase64Images: {
          type: 'boolean',
          default: true,
          description: 'Remove base64 images from output',
        },
        maxChars: { type: 'number', default: 100000, description: 'Maximum characters to return' },
        startIndex: {
          type: 'number',
          default: 0,
          description: 'Character index to start output from',
        },
        saveResource: {
          type: 'boolean',
          default: true,
          description: 'Save result as MCP Resource',
        },
      },
      required: ['url'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = ScrapeArgsSchema.parse(args);
        const clients = clientsFactory();
        const configClient = strategyConfigFactory();

        const { url, format, onlyMainContent, maxChars, startIndex } = validatedArgs;

        // Use the new strategy system (no explicit strategy from user)
        const result = await scrapeWithStrategy(
          clients,
          configClient,
          {
            url,
            format,
            onlyMainContent,
            waitFor: validatedArgs.waitFor,
            timeout: validatedArgs.timeout,
            removeBase64Images: validatedArgs.removeBase64Images,
          },
          undefined // No explicit strategy - let the system decide
        );

        if (!result.success || !result.content) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Failed to scrape ${url}. ${result.error || 'All strategies failed'}. Available methods: ${[
                  'native',
                  clients.firecrawl ? 'firecrawl' : null,
                  clients.brightData ? 'brightdata' : null,
                ]
                  .filter(Boolean)
                  .join(', ')}`,
              },
            ],
            isError: true,
          };
        }

        // Apply content processing
        let processedContent = result.content;

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

        return {
          content: [
            {
              type: 'text' as const,
              text: resultText,
            },
          ],
        };
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
