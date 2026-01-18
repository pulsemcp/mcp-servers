# Playwright Stealth MCP Server

A Model Context Protocol (MCP) server for browser automation using Playwright with optional stealth mode to bypass anti-bot protection.

## Features

- **Simplified API**: Single `browser_execute` tool that exposes the full Playwright API instead of many specialized tools
- **Stealth Mode**: Optional anti-detection measures using `playwright-extra` and `puppeteer-extra-plugin-stealth`
- **Persistent Sessions**: Browser session persists across tool calls for multi-step automation
- **Screenshot Support**: Capture page screenshots for visual verification
- **Code Execution**: Run arbitrary Playwright code with access to the `page` object
- **Full Permissions**: All browser permissions (notifications, geolocation, camera, etc.) granted by default for testing web apps

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

| Variable                  | Description                                                                       | Default                       |
| ------------------------- | --------------------------------------------------------------------------------- | ----------------------------- |
| `STEALTH_MODE`            | Enable stealth mode with anti-detection measures                                  | `false`                       |
| `STEALTH_USER_AGENT`      | Custom User-Agent string (stealth mode only)                                      | Browser default               |
| `STEALTH_MASK_LINUX`      | Mask Linux in User-Agent as Windows; set to `false` to avoid fingerprint mismatch | `true`                        |
| `STEALTH_LOCALE`          | Custom locale for Accept-Language header (stealth mode only)                      | `en-US,en`                    |
| `HEADLESS`                | Run browser in headless mode                                                      | `true`                        |
| `TIMEOUT`                 | Default timeout for Playwright actions (click, fill, etc.) in milliseconds        | `30000`                       |
| `NAVIGATION_TIMEOUT`      | Default timeout for page navigation (goto, reload, etc.) in milliseconds          | `60000`                       |
| `SCREENSHOT_STORAGE_PATH` | Directory for storing screenshots                                                 | `/tmp/playwright-screenshots` |
| `PROXY_URL`               | Proxy server URL (e.g., `http://proxy.example.com:8080`)                          | -                             |
| `PROXY_USERNAME`          | Proxy authentication username                                                     | -                             |
| `PROXY_PASSWORD`          | Proxy authentication password                                                     | -                             |
| `PROXY_BYPASS`            | Comma-separated list of hosts to bypass proxy                                     | -                             |
| `BROWSER_PERMISSIONS`     | Comma-separated list of browser permissions to grant (see below)                  | All permissions               |
| `IGNORE_HTTPS_ERRORS`     | Ignore HTTPS certificate errors (set to `false` for stricter security)            | `true`                        |

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

### Fingerprint Configuration

When running in Docker/Linux environments, bot detection systems may identify a fingerprint mismatch between the User-Agent header and other browser signals like `navigator.platform`. Use these environment variables to configure consistent fingerprints:

**Example: macOS Fingerprint (for Docker/Linux)**

```json
{
  "mcpServers": {
    "playwright-stealth": {
      "command": "npx",
      "args": ["-y", "playwright-stealth-mcp-server"],
      "env": {
        "STEALTH_MODE": "true",
        "STEALTH_USER_AGENT": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "STEALTH_MASK_LINUX": "false"
      }
    }
  }
}
```

**Why this matters:**

- By default, stealth mode masks Linux as Windows in the User-Agent header only
- However, `navigator.platform` still reports the actual OS (e.g., "Linux x86_64")
- This mismatch between User-Agent and platform triggers bot detection
- Setting `STEALTH_MASK_LINUX=false` disables this masking, allowing the real platform to show
- Combined with a custom `STEALTH_USER_AGENT`, you can present a consistent fingerprint

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

## HTTPS Certificate Errors

By default, the server ignores HTTPS certificate errors (`IGNORE_HTTPS_ERRORS=true`). This is convenient for common automation scenarios:

- **Docker environments** where SSL certificates may not match hostnames
- **Corporate networks** with MITM proxies that re-sign certificates
- **Self-signed certificates** in development or staging environments
- **Residential proxies** that perform HTTPS inspection

To enable strict certificate validation, set `IGNORE_HTTPS_ERRORS=false`:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "playwright-stealth-mcp-server"],
      "env": {
        "IGNORE_HTTPS_ERRORS": "false"
      }
    }
  }
}
```

**Security Note:** For production environments where certificate validation is important, set `IGNORE_HTTPS_ERRORS=false` to protect against man-in-the-middle attacks.

## Browser Permissions

By default, the server grants **all** browser permissions to the browser context. This enables testing of features that require permissions such as:

- **Web Push Notifications** (`notifications`)
- **Geolocation** (`geolocation`)
- **Camera/Microphone** (`camera`, `microphone`)
- **Clipboard** (`clipboard-read`, `clipboard-write`)
- **MIDI devices** (`midi`, `midi-sysex`)
- **Sensors** (`accelerometer`, `gyroscope`, `magnetometer`, `ambient-light-sensor`)
- **Other** (`background-sync`, `local-fonts`, `payment-handler`, `storage-access`)

### Constraining Permissions

If you need to restrict permissions (e.g., for security testing or to simulate a user who denies permissions), use the `BROWSER_PERMISSIONS` environment variable:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "playwright-stealth-mcp-server"],
      "env": {
        "BROWSER_PERMISSIONS": "notifications,clipboard-read,clipboard-write"
      }
    }
  }
}
```

This will grant only the specified permissions. All other permission requests will be denied.

**Note:** Invalid permission names are silently ignored with a warning in the server logs. If a permission is not recognized, it will be skipped.

**Browser Compatibility:** Permission support varies by browser. This server uses Chromium by default, where all listed permissions are supported. If using Firefox or WebKit, some permissions may not work.

### Testing Web Push Notifications

With the default configuration (all permissions granted), you can test web push notifications:

```javascript
// Check if notifications are supported and granted
const permission = await page.evaluate(() => Notification.permission);
console.log('Notification permission:', permission); // Should be "granted"

// Request notification permission (will auto-grant)
await page.evaluate(async () => {
  const result = await Notification.requestPermission();
  console.log('Permission result:', result);
});

// Create a test notification
await page.evaluate(() => {
  new Notification('Test Notification', {
    body: 'This is a test notification from Playwright',
  });
});
```

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
