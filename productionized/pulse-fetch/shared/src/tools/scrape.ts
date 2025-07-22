import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IScrapingClients, StrategyConfigFactory } from '../server.js';
import { scrapeWithStrategy } from '../scraping-strategies.js';
import { ResourceStorageFactory } from '../storage/index.js';
import { ExtractClientFactory } from '../extract/index.js';
import { createCleaner } from '../clean/index.js';

// Detect content type based on content
function detectContentType(content: string): string {
  // Check if content is HTML
  const htmlRegex =
    /<(!DOCTYPE\s+)?html[^>]*>|<head[^>]*>|<body[^>]*>|<div[^>]*>|<p[^>]*>|<h[1-6][^>]*>/i;
  if (htmlRegex.test(content.substring(0, 1000))) {
    return 'text/html';
  }

  // Check if content is JSON
  try {
    JSON.parse(content);
    return 'application/json';
  } catch {
    // Not JSON
  }

  // Check if content is XML
  const xmlRegex = /^\s*<\?xml[^>]*\?>|^\s*<[^>]+>/;
  if (xmlRegex.test(content)) {
    return 'application/xml';
  }

  // Default to plain text
  return 'text/plain';
}

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  url: 'The webpage URL to scrape (e.g., "https://example.com/article", "https://api.example.com/docs")',
  timeout:
    'Maximum time to wait for page load in milliseconds. Increase for slow-loading sites (e.g., 120000 for 2 minutes). Default: 60000 (1 minute)',
  maxChars:
    'Maximum number of characters to return from the scraped content. Useful for limiting response size. Default: 100000',
  startIndex:
    'Character position to start reading from. Use with maxChars for pagination through large documents (e.g., startIndex: 100000 to skip first 100k chars). Default: 0',
  resultHandling:
    'How to handle scraped content and MCP Resources. Options: "saveOnly" (saves as linked resource, no content returned), "saveAndReturn" (saves as embedded resource and returns content - default), "returnOnly" (returns content without saving). Default: "saveAndReturn"',
  forceRescrape:
    'Force a fresh scrape even if cached content exists for this URL. Useful when you know the content has changed. Default: false',
  cleanScrape:
    "Whether to clean the scraped content by converting HTML to semantic Markdown of what's on the page, removing ads, navigation, and boilerplate. This typically reduces content size by 50-90% while preserving main content. Only disable this for debugging or when you need the exact raw HTML structure. Default: true",
  extract: `Natural language query for intelligent content extraction. Describe what information you want extracted from the scraped page.

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

The LLM will intelligently parse the page content and return only the requested information in a clear, readable format.`,
} as const;

// Preprocess URL to make it more forgiving
function preprocessUrl(url: string): string {
  // Trim whitespace
  url = url.trim();

  // If no protocol is specified, add https://
  if (!url.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:/)) {
    url = 'https://' + url;
  }

  return url;
}

// Build the schema dynamically based on available features
const buildScrapeArgsSchema = () => {
  const baseSchema = {
    url: z
      .string()
      .transform(preprocessUrl)
      .pipe(z.string().url())
      .describe(PARAM_DESCRIPTIONS.url),
    timeout: z.number().optional().default(60000).describe(PARAM_DESCRIPTIONS.timeout),
    maxChars: z.number().optional().default(100000).describe(PARAM_DESCRIPTIONS.maxChars),
    startIndex: z.number().optional().default(0).describe(PARAM_DESCRIPTIONS.startIndex),
    resultHandling: z
      .enum(['saveOnly', 'saveAndReturn', 'returnOnly'])
      .optional()
      .default('saveAndReturn')
      .describe(PARAM_DESCRIPTIONS.resultHandling),
    forceRescrape: z.boolean().optional().default(false).describe(PARAM_DESCRIPTIONS.forceRescrape),
    cleanScrape: z.boolean().optional().default(true).describe(PARAM_DESCRIPTIONS.cleanScrape),
  };

  // Only include extract parameter if extraction is available
  if (ExtractClientFactory.isAvailable()) {
    return z.object({
      ...baseSchema,
      extract: z.string().optional().describe(PARAM_DESCRIPTIONS.extract),
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
    description: `Scrape webpage content using intelligent automatic strategy selection with built-in caching. This tool fetches content from any URL with flexible result handling options.

Result handling modes:
- returnOnly: Returns scraped content without saving (uses maxChars for size limits)
- saveAndReturn: Saves content as MCP Resource AND returns it (default, best for reuse)
- saveOnly: Saves content as MCP Resource, returns only resource link (no content)

Example responses by mode:

returnOnly:
{
  "content": [
    {
      "type": "text",
      "text": "Article content here...\n\n---\nScraped using: native"
    }
  ]
}

saveAndReturn (embedded resource):
{
  "content": [
    {
      "type": "resource",
      "resource": {
        "uri": "scraped://example.com/article_2024-01-15T10:30:00Z",
        "name": "https://example.com/article",
        "text": "Full article content..."
      }
    }
  ]
}

saveOnly (linked resource):
{
  "content": [
    {
      "type": "resource_link",
      "uri": "scraped://example.com/article_2024-01-15T10:30:00Z",
      "name": "https://example.com/article"
    }
  ]
}

Caching behavior:
- Previously scraped URLs are automatically cached as MCP Resources
- Subsequent requests return cached content (unless forceRescrape: true)
- saveOnly mode bypasses cache lookup for efficiency

Scraping strategies:
- native: Direct HTTP fetch (fastest, works for most public sites)
- firecrawl: Advanced scraping with JavaScript rendering (requires FIRECRAWL_API_KEY)
- brightdata: Premium scraping for heavily protected sites (requires BRIGHTDATA_API_KEY)

The tool automatically:
1. Checks cache first (except in saveOnly mode)
2. Tries the most appropriate scraping method based on domain patterns
3. Falls back to alternative methods if needed
4. Remembers successful strategies for future requests`,
    inputSchema: (() => {
      const baseProperties = {
        url: {
          type: 'string',
          format: 'uri',
          description: PARAM_DESCRIPTIONS.url,
        },
        timeout: {
          type: 'number',
          default: 60000,
          description: PARAM_DESCRIPTIONS.timeout,
        },
        maxChars: {
          type: 'number',
          default: 100000,
          description: PARAM_DESCRIPTIONS.maxChars,
        },
        startIndex: {
          type: 'number',
          default: 0,
          description: PARAM_DESCRIPTIONS.startIndex,
        },
        resultHandling: {
          type: 'string',
          enum: ['saveOnly', 'saveAndReturn', 'returnOnly'],
          default: 'saveAndReturn',
          description: PARAM_DESCRIPTIONS.resultHandling,
        },
        forceRescrape: {
          type: 'boolean',
          default: false,
          description: PARAM_DESCRIPTIONS.forceRescrape,
        },
        cleanScrape: {
          type: 'boolean',
          default: true,
          description: PARAM_DESCRIPTIONS.cleanScrape,
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
              description: PARAM_DESCRIPTIONS.extract,
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

        const { url, maxChars, startIndex, timeout, forceRescrape, cleanScrape, resultHandling } =
          validatedArgs;

        // Type-safe extraction of optional extract parameter
        let extract: string | undefined;
        if (ExtractClientFactory.isAvailable() && 'extract' in validatedArgs) {
          // We know extract exists if ExtractClientFactory is available and it's in validatedArgs
          extract = (validatedArgs as { extract?: string }).extract;
        }

        // Check for cached resources unless forceRescrape is true or resultHandling is saveOnly
        if (!forceRescrape && resultHandling !== 'saveOnly') {
          try {
            const storage = await ResourceStorageFactory.create();
            const cachedResources = await storage.findByUrlAndExtract(url, extract);

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

              // Return based on resultHandling mode
              if (resultHandling === 'returnOnly') {
                return {
                  content: [
                    {
                      type: 'text' as const,
                      text: resultText,
                    },
                  ],
                };
              } else if (resultHandling === 'saveAndReturn') {
                // For saveAndReturn, return embedded resource with content
                return {
                  content: [
                    {
                      type: 'resource' as const,
                      resource: {
                        uri: cachedResource.uri,
                        name: cachedResource.name,
                        mimeType: cachedResource.mimeType,
                        description: cachedResource.description,
                        text: processedContent, // Original content without metadata
                      },
                    },
                  ],
                };
              } else {
                // saveOnly mode shouldn't reach here due to cache bypass
                throw new Error('Invalid state: saveOnly mode should bypass cache');
              }
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
          let errorMessage = `Failed to scrape ${url}`;

          if (result.diagnostics) {
            errorMessage += `\n\nDiagnostics:\n`;
            errorMessage += `- Strategies attempted: ${result.diagnostics.strategiesAttempted.join(', ')}\n`;

            if (Object.keys(result.diagnostics.strategyErrors).length > 0) {
              errorMessage += `- Strategy errors:\n`;
              for (const [strategy, error] of Object.entries(result.diagnostics.strategyErrors)) {
                errorMessage += `  - ${strategy}: ${error}\n`;
              }
            }

            if (result.diagnostics.timing && Object.keys(result.diagnostics.timing).length > 0) {
              errorMessage += `- Timing:\n`;
              for (const [strategy, ms] of Object.entries(result.diagnostics.timing)) {
                errorMessage += `  - ${strategy}: ${ms}ms\n`;
              }
            }
          } else {
            errorMessage += `: ${result.error || 'All scraping strategies failed'}`;
          }

          return {
            content: [
              {
                type: 'text',
                text: errorMessage,
              },
            ],
            isError: true,
          };
        }

        const rawContent = result.content || '';
        let cleanedContent: string | undefined;
        let extractedContent: string | undefined;
        let displayContent = rawContent;

        // Apply cleaning if cleanScrape is true (default)
        // This converts HTML to semantic Markdown and removes ads, navigation, etc.
        if (cleanScrape) {
          try {
            const cleaner = createCleaner(rawContent, url);
            cleanedContent = await cleaner.clean(rawContent, url);
            displayContent = cleanedContent;
          } catch (cleanError) {
            console.warn('Content cleaning failed, proceeding with raw content:', cleanError);
            // Continue with raw content if cleaning fails
            displayContent = rawContent;
          }
        }

        // If extract parameter is provided and extraction is available, perform extraction
        if (extract && ExtractClientFactory.isAvailable()) {
          try {
            const extractClient = ExtractClientFactory.createFromEnv();
            if (extractClient) {
              // TypeScript needs explicit confirmation that extract is a string here
              const extractQuery: string = extract;
              // Use cleaned content if available, otherwise raw content
              const contentToExtract = cleanedContent || rawContent;
              const extractResult = await extractClient.extract(contentToExtract, extractQuery);
              if (extractResult.success && extractResult.content) {
                extractedContent = extractResult.content;
                displayContent = extractedContent;
              } else {
                // Include error in the response but still return the cleaned/raw content
                displayContent = `Extraction failed: ${extractResult.error}\n\n---\nRaw content:\n${displayContent}`;
              }
            }
          } catch (error) {
            console.error('Extraction error:', error);
            displayContent = `Extraction error: ${error instanceof Error ? error.message : String(error)}\n\n---\nRaw content:\n${displayContent}`;
          }
        }

        // Apply character limits and pagination (only for return options)
        let processedContent = displayContent;
        let wasTruncated = false;

        if (resultHandling !== 'saveOnly') {
          if (startIndex > 0) {
            processedContent = processedContent.slice(startIndex);
          }

          if (processedContent.length > maxChars) {
            processedContent = processedContent.slice(0, maxChars);
            wasTruncated = true;
          }
        }

        // Format output for return options
        let resultText = '';
        if (resultHandling !== 'saveOnly') {
          resultText = processedContent;
          if (wasTruncated) {
            resultText += `\n\n[Content truncated at ${maxChars} characters. Use startIndex parameter to continue reading from character ${startIndex + maxChars}]`;
          }
          resultText += `\n\n---\nScraped using: ${result.source}`;
        }

        const response: {
          content: Array<{
            type: string;
            text?: string;
            uri?: string;
            name?: string;
            mimeType?: string;
            description?: string;
            resource?: {
              uri: string;
              name?: string;
              mimeType?: string;
              description?: string;
              text?: string;
            };
          }>;
        } = {
          content: [],
        };

        // Add text content for returnOnly option
        if (resultHandling === 'returnOnly') {
          response.content.push({
            type: 'text',
            text: resultText,
          });
        }

        // Save as a resource for save options
        if (resultHandling === 'saveOnly' || resultHandling === 'saveAndReturn') {
          try {
            const storage = await ResourceStorageFactory.create();
            const uris = await storage.writeMulti({
              url,
              raw: rawContent,
              cleaned: cleanedContent,
              extracted: extractedContent,
              metadata: {
                url,
                source: result.source,
                timestamp: new Date().toISOString(),
                extract: extract || undefined,
                contentLength: rawContent.length,
                startIndex,
                maxChars,
                wasTruncated,
                contentType: detectContentType(rawContent),
              },
            });

            // Add the resource link to the response - use the most processed version
            const primaryUri = extractedContent
              ? uris.extracted
              : cleanedContent
                ? uris.cleaned
                : uris.raw;

            const resourceDescription = extract
              ? `Extracted information from ${url} using query: "${extract}"`
              : `Scraped content from ${url}`;

            // Determine MIME type based on what content we're actually storing/returning
            const contentMimeType =
              extractedContent || cleanedContent
                ? 'text/markdown' // Cleaned/extracted content is in Markdown format
                : detectContentType(rawContent); // Raw content keeps original type

            if (resultHandling === 'saveOnly') {
              // For saveOnly, return only the resource link
              response.content.push({
                type: 'resource_link',
                uri: primaryUri!,
                name: url,
                mimeType: contentMimeType,
                description: resourceDescription,
              });
            } else if (resultHandling === 'saveAndReturn') {
              // For saveAndReturn, return embedded resource with content
              response.content.push({
                type: 'resource',
                resource: {
                  uri: primaryUri!,
                  name: url,
                  mimeType: contentMimeType,
                  description: resourceDescription,
                  text: displayContent,
                },
              });
            }
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
