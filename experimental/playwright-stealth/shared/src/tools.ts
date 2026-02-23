import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ClientFactory } from './server.js';
import { z } from 'zod';
import { ScreenshotStorageFactory, VideoStorageFactory } from './storage/index.js';

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

**Dimension Limits:**
Screenshots are limited to 8000 pixels in any dimension. If a full-page screenshot would exceed this limit, it is automatically clipped from the top-left corner and a warning is included in the response.

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
- \`isOpen\`: Whether a browser session is active
- \`stealthMode\`: Whether stealth mode is enabled
- \`headless\`: Whether running in headless mode
- \`proxyEnabled\`: Whether a proxy is configured
- \`ignoreHttpsErrors\`: Whether HTTPS certificate errors are being ignored`;

const CLOSE_DESCRIPTION = `Close the browser session.

Shuts down the browser and clears all state. A new browser will be launched on the next execute call.`;

const START_RECORDING_DESCRIPTION = `Start recording the browser session as a video.

This tool begins capturing all browser interactions as a WebM video file. It works by recycling the browser context with video recording enabled.

**Important: Browser state is lost when recording starts.** Starting a recording closes the current browser context and creates a new one. This means:
- Cookies are lost
- localStorage and sessionStorage are cleared
- Any authenticated sessions will be invalidated

If you need to be logged in during the recording, navigate to the login page and authenticate again after starting the recording.

**Behavior when already recording:** If recording is already active, the current recording will be stopped (saving the video) and a new recording will begin.

**The video is NOT available until you call \`browser_stop_recording\`.** Playwright only finalizes the video file when the recording context is closed.

**Returns:**
- Confirmation that recording has started
- The URL the browser was previously on (if any) — the browser navigates back to it automatically`;

const STOP_RECORDING_DESCRIPTION = `Stop recording the browser session and save the video.

This tool stops the active video recording, saves the video file, and returns a resource URI for the recorded video.

**Important: Browser state is lost when recording stops.** Stopping a recording closes the recording context and creates a new one. This means:
- Cookies are lost
- localStorage and sessionStorage are cleared
- Any authenticated sessions will be invalidated

The browser automatically navigates back to the URL it was on before the recording stopped.

**Error:** Returns an error if no recording is currently active. Use \`browser_start_recording\` first.

**Returns:**
- A resource_link with the \`file://\` URI to the saved video file (WebM format)
- The video can be accessed later via MCP resources`;

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
          const screenshotResult = await client.screenshot({
            fullPage: validated.fullPage,
          });

          // Get page metadata for the screenshot
          const state = await client.getState();

          // Save to storage
          const storage = await ScreenshotStorageFactory.create();
          const uri = await storage.write(screenshotResult.data, {
            pageUrl: state.currentUrl,
            pageTitle: state.title,
            fullPage: validated.fullPage ?? false,
          });

          const resultHandling = validated.resultHandling ?? 'saveAndReturn';

          // Generate a name from the URI for the resource link
          const fileName = uri.split('/').pop() || 'screenshot.png';

          // Build content array
          const content: Array<{
            type: string;
            text?: string;
            data?: string;
            mimeType?: string;
            uri?: string;
            name?: string;
            description?: string;
          }> = [];

          // Add warning if screenshot was clipped
          if (screenshotResult.wasClipped && screenshotResult.warning) {
            content.push({
              type: 'text',
              text: `Warning: ${screenshotResult.warning}`,
            });
          }

          if (resultHandling === 'saveOnly') {
            // Return only the resource link (with warning if present)
            content.push({
              type: 'resource_link',
              uri,
              name: fileName,
              description: `Screenshot saved to ${uri}`,
              mimeType: 'image/png',
            });
            return { content };
          }

          // Default: saveAndReturn - return both inline image and resource link
          content.push(
            {
              type: 'image',
              data: screenshotResult.data,
              mimeType: 'image/png',
            },
            {
              type: 'resource_link',
              uri,
              name: fileName,
              description: `Screenshot also saved to ${uri}`,
              mimeType: 'image/png',
            }
          );
          return { content };
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
                    proxyEnabled: !!config.proxy,
                    ignoreHttpsErrors: config.ignoreHttpsErrors ?? true,
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
    {
      name: 'browser_start_recording',
      description: START_RECORDING_DESCRIPTION,
      inputSchema: {
        type: 'object' as const,
        properties: {},
      },
      handler: async () => {
        try {
          const currentClient = getClient();

          // If already recording, stop the current recording first (save the video)
          let previousVideoUri: string | undefined;
          if (currentClient.isRecording()) {
            try {
              const stopResult = await currentClient.stopRecording();
              // Save the previous recording
              const videoStorage = await VideoStorageFactory.create();
              previousVideoUri = await videoStorage.write(stopResult.videoPath, {
                pageUrl: stopResult.pageUrl,
                pageTitle: stopResult.pageTitle,
              });
            } catch {
              // Best effort to save previous recording
            }
          }

          // Get the video storage directory for Playwright to write to
          const videoStoragePath = process.env.VIDEO_STORAGE_PATH || '/tmp/playwright-videos';

          const result = await currentClient.startRecording(videoStoragePath);

          const parts: string[] = ['Recording started.'];
          if (result.previousUrl) {
            parts.push(`Browser navigated back to: ${result.previousUrl}`);
          }
          parts.push(
            'Note: Cookies and session storage have been cleared. Log in again if needed.'
          );
          if (previousVideoUri) {
            parts.push(`Previous recording saved to: ${previousVideoUri}`);
          }

          return {
            content: [
              {
                type: 'text',
                text: parts.join('\n'),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error starting recording: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      },
    },
    {
      name: 'browser_stop_recording',
      description: STOP_RECORDING_DESCRIPTION,
      inputSchema: {
        type: 'object' as const,
        properties: {},
      },
      handler: async () => {
        try {
          const currentClient = getClient();

          if (!currentClient.isRecording()) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Error: Not currently recording. Use browser_start_recording to begin a recording first.',
                },
              ],
              isError: true,
            };
          }

          const result = await currentClient.stopRecording();

          // Save the video to storage
          const videoStorage = await VideoStorageFactory.create();
          const uri = await videoStorage.write(result.videoPath, {
            pageUrl: result.pageUrl,
            pageTitle: result.pageTitle,
          });

          const fileName = uri.split('/').pop() || 'recording.webm';

          const content: Array<{
            type: string;
            text?: string;
            uri?: string;
            name?: string;
            description?: string;
            mimeType?: string;
          }> = [];

          content.push({
            type: 'text',
            text: `Recording stopped and saved.\nNote: Cookies and session storage have been cleared. Log in again if needed.`,
          });

          content.push({
            type: 'resource_link',
            uri,
            name: fileName,
            description: result.pageUrl
              ? `Video recording of ${result.pageUrl}`
              : 'Video recording',
            mimeType: 'video/webm',
          });

          return { content };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error stopping recording: ${error instanceof Error ? error.message : String(error)}`,
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
