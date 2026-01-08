import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ClientFactory } from './server.js';
import { z } from 'zod';
import { ScreenshotStorageFactory } from './storage/index.js';

// =============================================================================
// TOOL SCHEMAS
// =============================================================================

const ExecuteSchema = z.object({
  code: z.string().describe('Playwright code to execute. The `page` object is available in scope.'),
  timeout: z.number().optional().describe('Execution timeout in milliseconds. Default: 30000'),
});

const ScreenshotSchema = z.object({
  fullPage: z.boolean().optional().describe('Capture the full scrollable page. Default: false'),
  resultHandling: z
    .enum(['saveAndReturn', 'saveOnly'])
    .optional()
    .describe(
      "How to handle the screenshot result. 'saveAndReturn' (default) saves to storage and returns inline base64, 'saveOnly' saves to storage and returns only the resource URI"
    ),
});

// =============================================================================
// TOOL DESCRIPTIONS
// =============================================================================

const EXECUTE_DESCRIPTION = `Execute Playwright code in the browser.

This tool runs JavaScript code with access to a Playwright \`page\` object. The browser session persists across calls, so you can navigate, interact with elements, and extract data across multiple tool invocations.

**Available in scope:**
- \`page\` - The Playwright Page object with full API access

**Example usage:**

Navigate to a page:
\`\`\`javascript
await page.goto('https://example.com');
return await page.title();
\`\`\`

Click an element and wait:
\`\`\`javascript
await page.click('button.submit');
await page.waitForSelector('.success-message');
\`\`\`

Extract text content:
\`\`\`javascript
const items = await page.$$eval('.item', els => els.map(el => el.textContent));
return items;
\`\`\`

Fill a form:
\`\`\`javascript
await page.fill('input[name="email"]', 'test@example.com');
await page.fill('input[name="password"]', 'secret');
await page.click('button[type="submit"]');
\`\`\`

**Returns:**
- \`success\`: boolean indicating if execution succeeded
- \`result\`: JSON stringified return value (if any)
- \`error\`: error message (if failed)
- \`consoleOutput\`: array of console messages from the page

**Note:** When STEALTH_MODE=true, the browser includes anti-detection measures to help bypass bot protection.`;

const SCREENSHOT_DESCRIPTION = `Take a screenshot of the current page.

Captures the visible viewport or full page as a PNG image. Screenshots are saved to filesystem storage and can be accessed later via MCP resources.

**Parameters:**
- \`fullPage\`: Whether to capture the full scrollable page (default: false)
- \`resultHandling\`: How to handle the result:
  - \`saveAndReturn\` (default): Saves to storage AND returns inline base64 image
  - \`saveOnly\`: Saves to storage and returns only the resource URI (more efficient for large screenshots)

**Returns:**
- With \`saveAndReturn\`: Inline base64 PNG image data plus a resource_link to the saved file
- With \`saveOnly\`: A resource_link with the \`file://\` URI to the saved screenshot

**Use cases:**
- Verify page state after navigation
- Debug automation issues
- Capture visual content for analysis
- Store screenshots for later reference via MCP resources`;

const GET_STATE_DESCRIPTION = `Get the current browser state.

Returns information about the current browser session including the URL, page title, and whether a browser is open.

**Returns:**
- \`currentUrl\`: Current page URL
- \`title\`: Current page title
- \`isOpen\`: Whether a browser session is active`;

const CLOSE_DESCRIPTION = `Close the browser session.

Shuts down the browser and clears all state. A new browser will be launched on the next execute call.`;

// =============================================================================
// TOOL REGISTRATION
// =============================================================================

interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  handler: (args: unknown) => Promise<{
    content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
    isError?: boolean;
  }>;
}

export function createRegisterTools(clientFactory: ClientFactory) {
  // Create a single client instance that persists across calls
  let client: ReturnType<ClientFactory> | null = null;

  const getClient = () => {
    if (!client) {
      client = clientFactory();
    }
    return client;
  };

  const tools: Tool[] = [
    {
      name: 'browser_execute',
      description: EXECUTE_DESCRIPTION,
      inputSchema: {
        type: 'object' as const,
        properties: {
          code: {
            type: 'string',
            description: 'Playwright code to execute. The `page` object is available in scope.',
          },
          timeout: {
            type: 'number',
            description: 'Execution timeout in milliseconds. Default: 30000',
          },
        },
        required: ['code'],
      },
      handler: async (args: unknown) => {
        try {
          const validated = ExecuteSchema.parse(args);
          const result = await getClient().execute(validated.code, {
            timeout: validated.timeout,
          });

          if (result.success) {
            const parts: string[] = [];
            if (result.result) {
              parts.push(`Result:\n${result.result}`);
            }
            if (result.consoleOutput && result.consoleOutput.length > 0) {
              parts.push(`Console output:\n${result.consoleOutput.join('\n')}`);
            }
            return {
              content: [
                {
                  type: 'text',
                  text: parts.length > 0 ? parts.join('\n\n') : 'Execution completed successfully.',
                },
              ],
            };
          } else {
            return {
              content: [
                {
                  type: 'text',
                  text: `Error: ${result.error}`,
                },
              ],
              isError: true,
            };
          }
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      },
    },
    {
      name: 'browser_screenshot',
      description: SCREENSHOT_DESCRIPTION,
      inputSchema: {
        type: 'object' as const,
        properties: {
          fullPage: {
            type: 'boolean',
            description: 'Capture the full scrollable page. Default: false',
          },
          resultHandling: {
            type: 'string',
            enum: ['saveAndReturn', 'saveOnly'],
            description:
              "How to handle the screenshot result. 'saveAndReturn' (default) saves to storage and returns inline base64, 'saveOnly' saves to storage and returns only the resource URI",
          },
        },
      },
      handler: async (args: unknown) => {
        try {
          const validated = ScreenshotSchema.parse(args);
          const client = getClient();
          const base64 = await client.screenshot({
            fullPage: validated.fullPage,
          });

          // Get page metadata for the screenshot
          const state = await client.getState();

          // Save to storage
          const storage = await ScreenshotStorageFactory.create();
          const uri = await storage.write(base64, {
            pageUrl: state.currentUrl,
            pageTitle: state.title,
            fullPage: validated.fullPage ?? false,
          });

          const resultHandling = validated.resultHandling ?? 'saveAndReturn';

          // Generate a name from the URI for the resource link
          const fileName = uri.split('/').pop() || 'screenshot.png';

          if (resultHandling === 'saveOnly') {
            // Return only the resource link
            return {
              content: [
                {
                  type: 'resource_link',
                  uri,
                  name: fileName,
                  description: `Screenshot saved to ${uri}`,
                  mimeType: 'image/png',
                },
              ],
            };
          }

          // Default: saveAndReturn - return both inline image and resource link
          return {
            content: [
              {
                type: 'image',
                data: base64,
                mimeType: 'image/png',
              },
              {
                type: 'resource_link',
                uri,
                name: fileName,
                description: `Screenshot also saved to ${uri}`,
                mimeType: 'image/png',
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error taking screenshot: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      },
    },
    {
      name: 'browser_get_state',
      description: GET_STATE_DESCRIPTION,
      inputSchema: {
        type: 'object' as const,
        properties: {},
      },
      handler: async () => {
        try {
          const state = await getClient().getState();
          const config = getClient().getConfig();

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    ...state,
                    stealthMode: config.stealthMode,
                    headless: config.headless,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error getting state: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      },
    },
    {
      name: 'browser_close',
      description: CLOSE_DESCRIPTION,
      inputSchema: {
        type: 'object' as const,
        properties: {},
      },
      handler: async () => {
        try {
          await getClient().close();
          client = null; // Clear the reference so a new browser is created on next call

          return {
            content: [
              {
                type: 'text',
                text: 'Browser closed successfully.',
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error closing browser: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      },
    },
  ];

  return (server: Server) => {
    // List available tools
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      };
    });

    // Handle tool calls
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      const tool = tools.find((t) => t.name === name);
      if (!tool) {
        throw new Error(`Unknown tool: ${name}`);
      }

      return await tool.handler(args);
    });
  };
}
