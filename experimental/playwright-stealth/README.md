# Playwright Stealth MCP Server

A Model Context Protocol (MCP) server for browser automation using Playwright with optional stealth mode to bypass anti-bot protection.

## Features

- **Simplified API**: Single `browser_execute` tool that exposes the full Playwright API instead of many specialized tools
- **Stealth Mode**: Optional anti-detection measures using `playwright-extra` and `puppeteer-extra-plugin-stealth`
- **Persistent Sessions**: Browser session persists across tool calls for multi-step automation
- **Screenshot Support**: Capture page screenshots for visual verification
- **Code Execution**: Run arbitrary Playwright code with access to the `page` object

## Installation

```bash
npx playwright-stealth-mcp-server
```

Or install globally:

```bash
npm install -g playwright-stealth-mcp-server
```

## Configuration

### Claude Desktop Configuration

Add to your Claude Desktop config file:

**Non-Stealth Mode** (Standard Playwright):

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "playwright-stealth-mcp-server"],
      "env": {
        "STEALTH_MODE": "false"
      }
    }
  }
}
```

**Stealth Mode** (Anti-bot bypass):

```json
{
  "mcpServers": {
    "playwright-stealth": {
      "command": "npx",
      "args": ["-y", "playwright-stealth-mcp-server"],
      "env": {
        "STEALTH_MODE": "true"
      }
    }
  }
}
```

**With Proxy** (e.g., BrightData Residential Proxy):

```json
{
  "mcpServers": {
    "playwright-proxy": {
      "command": "npx",
      "args": ["-y", "playwright-stealth-mcp-server"],
      "env": {
        "STEALTH_MODE": "true",
        "PROXY_URL": "http://brd.superproxy.io:22225",
        "PROXY_USERNAME": "brd-customer-XXXXX-zone-residential",
        "PROXY_PASSWORD": "your-password"
      }
    }
  }
}
```

### Environment Variables

| Variable                  | Description                                                                | Default                       |
| ------------------------- | -------------------------------------------------------------------------- | ----------------------------- |
| `STEALTH_MODE`            | Enable stealth mode with anti-detection measures                           | `false`                       |
| `HEADLESS`                | Run browser in headless mode                                               | `true`                        |
| `TIMEOUT`                 | Default timeout for Playwright actions (click, fill, etc.) in milliseconds | `30000`                       |
| `NAVIGATION_TIMEOUT`      | Default timeout for page navigation (goto, reload, etc.) in milliseconds   | `60000`                       |
| `SCREENSHOT_STORAGE_PATH` | Directory for storing screenshots                                          | `/tmp/playwright-screenshots` |
| `PROXY_URL`               | Proxy server URL (e.g., `http://proxy.example.com:8080`)                   | -                             |
| `PROXY_USERNAME`          | Proxy authentication username                                              | -                             |
| `PROXY_PASSWORD`          | Proxy authentication password                                              | -                             |
| `PROXY_BYPASS`            | Comma-separated list of hosts to bypass proxy                              | -                             |

## Available Tools

### `browser_execute`

Execute Playwright code with access to the `page` object.

**Parameters:**

- `code` (required): JavaScript code to execute. The `page` object is available in scope.
- `timeout` (optional): Execution timeout in milliseconds.

**Example:**

```javascript
await page.goto('https://example.com');
const title = await page.title();
return title;
```

### `browser_screenshot`

Take a screenshot of the current page. Screenshots are saved to filesystem storage and can be accessed later via MCP resources.

**Parameters:**

- `fullPage` (optional): Capture full scrollable page. Default: `false`
- `resultHandling` (optional): How to handle the result:
  - `saveAndReturn` (default): Saves to storage AND returns inline base64 image
  - `saveOnly`: Saves to storage and returns only the resource URI (more efficient for large screenshots)

**Returns:**

- With `saveAndReturn`: Inline base64 PNG image plus a `resource_link` with the file URI
- With `saveOnly`: Only a `resource_link` with the `file://` URI to the saved screenshot

### `browser_get_state`

Get the current browser state including URL, title, and configuration.

### `browser_close`

Close the browser session. A new browser will be launched on the next `browser_execute` call.

## MCP Resources

The server exposes saved screenshots as MCP resources. Clients can use:

- `resources/list`: List all saved screenshots with their URIs and metadata
- `resources/read`: Read a screenshot by its `file://` URI

This allows clients to access previously captured screenshots without needing to take new ones.

## Usage Examples

### Navigate and Extract Data

```javascript
// Navigate to a page
await page.goto('https://news.ycombinator.com');

// Extract headlines
const headlines = await page.$$eval('.titleline > a', (links) =>
  links.slice(0, 5).map((a) => a.textContent)
);

return headlines;
```

### Fill and Submit a Form

```javascript
await page.goto('https://example.com/login');

// Fill credentials
await page.fill('input[name="email"]', 'user@example.com');
await page.fill('input[name="password"]', 'password123');

// Submit form
await page.click('button[type="submit"]');

// Wait for navigation
await page.waitForNavigation();

return await page.title();
```

### Handle Dynamic Content

```javascript
await page.goto('https://spa-example.com');

// Wait for element to appear
await page.waitForSelector('.loaded-content');

// Click to load more
await page.click('.load-more-button');

// Wait for new content
await page.waitForSelector('.new-items');

const items = await page.$$eval('.item', (els) => els.map((el) => el.textContent));
return items;
```

## Security Considerations

**Important:** The `browser_execute` tool executes arbitrary JavaScript code. This design provides full Playwright API access but has security implications:

- Only use this server with trusted input (e.g., from an LLM in a controlled environment)
- The code runs in a Node.js context with access to the `page` object
- Do not expose this server to untrusted users or public networks

This is intentional for maximum flexibility - it allows LLMs to leverage their existing Playwright knowledge. For production use, ensure proper access controls are in place.

## When to Use Stealth Mode

Enable stealth mode (`STEALTH_MODE=true`) when:

- Accessing sites with Cloudflare protection
- Sites that block automation tools
- Pages that detect headless browsers
- OAuth flows that trigger CAPTCHA challenges

Stealth mode includes:

- WebDriver property masking
- Chrome automation flag removal
- User-Agent normalization
- Plugin/mime type spoofing
- Navigator property patching

## When to Use Proxy

Configure proxy settings when:

- Scraping sites that rate-limit by IP address
- Accessing geo-restricted content
- Avoiding IP-based blocks or bans
- Rotating IPs for large-scale data collection

The server supports HTTP/HTTPS proxies with optional authentication, making it compatible with:

- **BrightData** (Residential, Datacenter, ISP proxies)
- **Oxylabs**, **Smartproxy**, and other residential proxy providers
- Self-hosted proxy servers
- Corporate HTTP proxies

**Note:** When proxy is configured, the server performs a health check on startup to verify the proxy connection works. If the health check fails, the server will exit with an error.

## Development

```bash
# Install dependencies
npm run install-all

# Build the project
npm run build

# Run in development mode
npm run dev

# Run tests
npm test

# Run integration tests
npm run test:integration

# Run manual tests (requires Playwright browsers)
npm run test:manual:setup
npm run test:manual
```

## Architecture

This MCP server uses a simplified design inspired by [playwriter](https://github.com/remorses/playwriter):

- Single `browser_execute` tool instead of many specialized tools
- Reduces context window usage for LLMs
- Leverages existing Playwright knowledge in LLM training data
- Full API access without artificial constraints

## License

MIT
