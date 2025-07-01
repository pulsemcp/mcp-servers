import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IScrapingClients, StrategyConfigFactory } from '../server.js';
import { scrapeWithStrategy } from '../scraping-strategies.js';
import { ResourceStorageFactory } from '../storage/index.js';
import { ExtractClientFactory } from '../extract/index.js';

// Build the schema dynamically based on available features
const buildScrapeArgsSchema = () => {
  const baseSchema = {
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
    forceRescrape: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        'Force a fresh scrape even if cached content exists for this URL. Useful when you know the content has changed. Default: false'
      ),
  };

  // Only include extract parameter if extraction is available
  if (ExtractClientFactory.isAvailable()) {
    return z.object({
      ...baseSchema,
      extract: z
        .string()
        .optional()
        .describe(
          `Natural language query for intelligent content extraction. Describe what information you want extracted from the scraped page.

Examples:

Simple data extraction:
- "the author name and publication date"
- "all email addresses mentioned on the page"
- "the main product price and availability status"
- "company address and phone number"

Formatted extraction (specify desired format):
- "summarize the main article in 3 bullet points"
- "extract the recipe ingredients as a markdown list"
- "get the pricing tiers as a comparison table in markdown"
- "extract all testimonials with customer names and quotes formatted as markdown blockquotes"

Structured data extraction (request specific output format):
- "extract product details as JSON with fields: name, price, description, specifications"
- "get all job listings as JSON array with title, location, salary, and requirements"
- "extract the FAQ section as JSON with question and answer pairs"
- "parse the contact information into JSON format with fields for address, phone, email, and hours"

Complex queries:
- "analyze the sentiment of customer reviews and categorize them as positive, negative, or neutral"
- "extract and summarize the key features of the product, highlighting unique selling points"
- "identify all dates mentioned and what events they relate to"
- "extract technical specifications and explain them in simple terms"

The LLM will intelligently parse the page content and return only the requested information in a clear, readable format.`
        ),
    });
  }

  return z.object(baseSchema);
};

export function scrapeTool(
  _server: Server,
  clientsFactory: () => IScrapingClients,
  strategyConfigFactory: StrategyConfigFactory
) {
  return {
    name: 'scrape',
    description: `Scrape webpage content using intelligent automatic strategy selection with built-in caching. This tool fetches raw HTML content from any URL, using cached content when available to improve performance and reduce API usage.

Example response:
{
  "content": [
    {
      "type": "text",
      "text": "<!DOCTYPE html>\n<html>\n<head><title>Example Article</title></head>\n<body>\n<article>\n<h1>Breaking News: Technology Advances</h1>\n<p>Content of the article...</p>\n</article>\n</body>\n</html>\n\n---\nScraped using: native"
    }
  ]
}

Caching behavior:
- Previously scraped URLs are automatically cached as MCP Resources
- Subsequent requests for the same URL return cached content (fastest)
- Use forceRescrape: true to bypass cache and get fresh content
- Cache hits show "Served from cache" with original scrape method and timestamp

Scraping strategies (for fresh scrapes):
- native: Direct HTTP fetch (fastest, works for most public sites)
- firecrawl: Advanced scraping with JavaScript rendering (requires FIRECRAWL_API_KEY)
- brightdata: Premium scraping for heavily protected sites (requires BRIGHTDATA_BEARER_TOKEN)

The tool automatically:
1. Checks for cached content first (unless forceRescrape is true)
2. For fresh scrapes, tries the most appropriate method based on learned domain patterns
3. Falls back to alternative methods if the first attempt fails
4. Remembers successful strategies for future requests to the same domain

Use cases:
- Fetching article content for analysis or summarization
- Extracting data from public websites for research
- Accessing JavaScript-heavy sites that require rendering
- Scraping content from sites with anti-bot protection
- Monitoring webpage changes over time (use forceRescrape for updates)
- Gathering data for competitive analysis with automatic caching`,
    inputSchema: (() => {
      const baseProperties = {
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
        forceRescrape: {
          type: 'boolean',
          default: false,
          description: 'Force fresh scrape even if cached. Default: false',
        },
      };

      // Only include extract parameter if extraction is available
      if (ExtractClientFactory.isAvailable()) {
        return {
          type: 'object' as const,
          properties: {
            ...baseProperties,
            extract: {
              type: 'string',
              description:
                'Natural language description of what to extract from the page (e.g., "article title and publish date")',
            },
          },
          required: ['url'],
        };
      }

      return {
        type: 'object' as const,
        properties: baseProperties,
        required: ['url'],
      };
    })(),
    handler: async (args: unknown) => {
      try {
        const ScrapeArgsSchema = buildScrapeArgsSchema();
        const validatedArgs = ScrapeArgsSchema.parse(args);
        const clients = clientsFactory();
        const configClient = strategyConfigFactory();

        const { url, maxChars, startIndex, timeout, forceRescrape } = validatedArgs;
        // Type-safe extraction of optional extract parameter
        let extract: string | undefined;
        if (ExtractClientFactory.isAvailable() && 'extract' in validatedArgs) {
          // We know extract exists if ExtractClientFactory is available and it's in validatedArgs
          extract = (validatedArgs as { extract?: string }).extract;
        }

        // Check for cached resources unless forceRescrape is true
        if (!forceRescrape) {
          try {
            const storage = await ResourceStorageFactory.create();
            const cachedResources = await storage.findByUrl(url);

            if (cachedResources.length > 0) {
              // Use the most recent cached resource (already sorted by timestamp desc)
              const cachedResource = cachedResources[0];
              const cachedContent = await storage.read(cachedResource.uri);

              // Apply the same content processing as fresh scrapes
              let processedContent = cachedContent.text || '';

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

              resultText += `\n\n---\nServed from cache (originally scraped using: ${cachedResource.metadata.source || 'unknown'})\nCached at: ${cachedResource.metadata.timestamp}`;

              return {
                content: [
                  {
                    type: 'text' as const,
                    text: resultText,
                  },
                  {
                    type: 'resource_link' as const,
                    uri: cachedResource.uri,
                    name: cachedResource.name,
                    mimeType: cachedResource.mimeType,
                    description: cachedResource.description,
                  },
                ],
              };
            }
          } catch (error) {
            // If cache lookup fails, proceed with fresh scrape
            console.error('Cache lookup failed, proceeding with fresh scrape:', error);
          }
        }

        // Use the new strategy system (no explicit strategy from user)
        const result = await scrapeWithStrategy(clients, configClient, {
          url,
          timeout,
        });

        // Check if scraping failed
        if (!result.success) {
          return {
            content: [
              {
                type: 'text',
                text: `Failed to scrape ${url}: ${result.error || 'All scraping strategies failed'}`,
              },
            ],
            isError: true,
          };
        }

        let rawContent = result.content || '';

        // If extract parameter is provided and extraction is available, perform extraction
        if (extract && ExtractClientFactory.isAvailable()) {
          try {
            const extractClient = ExtractClientFactory.createFromEnv();
            if (extractClient) {
              // TypeScript needs explicit confirmation that extract is a string here
              const extractQuery: string = extract;
              const extractResult = await extractClient.extract(rawContent, extractQuery);
              if (extractResult.success && extractResult.content) {
                rawContent = extractResult.content;
              } else {
                // Include error in the response but still return the raw content
                rawContent = `Extraction failed: ${extractResult.error}\n\n---\nRaw content:\n${rawContent}`;
              }
            }
          } catch (error) {
            console.error('Extraction error:', error);
            rawContent = `Extraction error: ${error instanceof Error ? error.message : String(error)}\n\n---\nRaw content:\n${rawContent}`;
          }
        }

        // Apply character limits and pagination
        let processedContent = rawContent;
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
              type: 'text',
              text: resultText,
            },
          ],
        };

        // Save as a resource if requested
        if (validatedArgs.saveResult) {
          try {
            const storage = await ResourceStorageFactory.create();
            const resourceId = await storage.write(url, rawContent, {
              url,
              source: result.source,
              timestamp: new Date().toISOString(),
              extract: extract || undefined,
              contentLength: rawContent.length,
              startIndex,
              maxChars,
              wasTruncated,
            });

            // Add the resource link to the response
            response.content.push({
              type: 'resource_link',
              uri: resourceId,
              name: url,
              mimeType: extract ? 'text/plain' : 'text/html',
              description: extract
                ? `Extracted information from ${url} using query: "${extract}"`
                : `Scraped content from ${url}`,
            });
          } catch (error) {
            console.error('Failed to save scraped content as resource:', error);
            // Continue without resource saving - the scraping was still successful
          }
        }

        return response;
      } catch (error) {
        if (error instanceof z.ZodError) {
          return {
            content: [
              {
                type: 'text',
                text: `Invalid arguments: ${error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Failed to scrape ${(args as { url?: string })?.url || 'URL'}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
