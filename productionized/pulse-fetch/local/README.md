# Pulse Fetch MCP Server

> **Note**: This package is part of the [MCP Servers](https://github.com/pulsemcp/mcp-servers) monorepo. For the latest updates and full source code, visit the [Pulse Fetch MCP Server directory](https://github.com/pulsemcp/mcp-servers/tree/main/productionized/pulse-fetch).

Haven't heard about MCP yet? The easiest way to keep up-to-date is to read our [weekly newsletter at PulseMCP](https://www.pulsemcp.com/).

---

This is an MCP ([Model Context Protocol](https://modelcontextprotocol.io/)) Server that pulls specific resources from the open internet into context, designed for agent-building frameworks and MCP clients that lack built-in fetch capabilities.

Pulse Fetch is purpose-built for extracting clean, structured content from web pages while minimizing token usage and providing reliable access to protected content through advanced anti-bot bypassing capabilities.

This project is built and maintained by [PulseMCP](https://www.pulsemcp.com/).

# Table of Contents

- [Highlights](#highlights)
- [Capabilities](#capabilities)
- [Usage Tips](#usage-tips)
- [Examples](#examples)
- [Setup](#setup)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Claude Desktop](#claude-desktop)
    - [Local Setup](#local-setup)
    - [Remote Setup](#remote-setup)
- [Development](#development)

# Highlights

**Clean content extraction**: Strips out HTML noise using Mozilla's Readability algorithm to minimize token usage during MCP Tool calls.

**Resource caching**: Optionally saves results as MCP Resources for effective caching and easy inspection of Tool call outcomes.

**Anti-bot bypass**: Integrates with Firecrawl and BrightData APIs to reliably work around anti-scraping technology.

**LLM-optimized**: Offers MCP Prompts and descriptive Tool design for better LLM interaction reliability.

**Flexible formats**: Supports multiple output formats including clean markdown, HTML, screenshots, and structured data extraction.

# Capabilities

This server is built and tested on macOS with Claude Desktop. It should work with other MCP clients as well.

| Tool Name | Description                                                                                   |
| --------- | --------------------------------------------------------------------------------------------- |
| `scrape`  | Scrape a single webpage with advanced content extraction options and multiple output formats. |

# Usage Tips

- The `scrape` tool handles all web content extraction needs and automatically bypasses anti-bot protection when necessary
- Set `saveResource: true` to cache results as MCP Resources for easy re-use and inspection
- Use `onlyMainContent: true` to extract just the article content and minimize token usage
- Configure `waitFor` parameter for JavaScript-heavy sites that need time to load dynamic content
- Use `maxChars` and `startIndex` parameters to handle large content that exceeds token limits
- Format options include `markdown` (default), `html`, `rawHtml`, `links`, and `extract` for structured data

# Examples

## Basic Web Content Extraction

```
User: "Get the main content from this article: https://example.com/article"
Assistant: I'll extract the content from that article for you.

[Uses scrape tool with onlyMainContent: true]

I've extracted the main article content. The article is titled "Example Article Title" and contains approximately 2,500 words discussing...
```

## Extracting Structured Data

```
User: "Extract the product information from this e-commerce page: https://shop.example.com/product/123"
Assistant: I'll extract the structured product data from that page.

[Uses scrape tool with format: 'extract' and appropriate schema]

I've extracted the product information:
- Product Name: Example Product
- Price: $99.99
- Rating: 4.5/5 stars
- Description: High-quality example product...
```

## Handling Protected Content

```
User: "This page is blocking me with CAPTCHA. Can you get the content from https://protected.example.com/data"
Assistant: I'll extract the content from that protected page for you.

[Uses scrape tool with automatic anti-bot bypass]

I successfully bypassed the protection and extracted the content from the page using BrightData's Web Unlocker capabilities.
```

# Why Choose Pulse Fetch?

If our [Design Principles](../README.md#design-principles) resonate with you, you should consider using our server.

The [official reference implementation of `fetch`](https://www.pulsemcp.com/servers/modelcontextprotocol-fetch) is the closest alternative. However:

- `fetch` has no mechanisms for bypassing anti-scraping technology, meaning attempts may randomly fail. We integrate with third-party services for reliable access.
- `fetch` is maintained by volunteers, so bugs or edge cases are less likely to be addressed quickly.
- `Pulse Fetch` caches responses as Resources, allowing easy inspection and re-use of Tool call outcomes.
- `Pulse Fetch` has more descriptive Tool design that more reliably triggers and completes desired tasks.

Most other alternatives fall short on one or more vectors:

- They are not purpose-built for pulling specific internet resources into context
- They may be multi-page crawlers, search engines, or tied to full REST APIs that confuse LLMs
- They do not make maximal use of MCP concepts like Resources and Prompts

# Setup

## Prerequisites

- Node.js (recommended: use the version specified in package.json)
- Claude Desktop application (for local setup)
- Optional: Firecrawl API key for enhanced scraping capabilities
- Optional: BrightData bearer token for web unlocking features

## Environment Variables

| Environment Variable      | Description                                               | Required | Default Value | Example               |
| ------------------------- | --------------------------------------------------------- | -------- | ------------- | --------------------- |
| `FIRECRAWL_API_KEY`       | API key for Firecrawl service to bypass anti-bot measures | No       | N/A           | `fc-abc123...`        |
| `BRIGHTDATA_BEARER_TOKEN` | Bearer token for BrightData Web Unlocker service          | No       | N/A           | `Bearer bd_abc123...` |

## Claude Desktop

### Local Setup

You'll need Node.js installed on your machine to run the local version.

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add this configuration to your Claude Desktop config file:

```json
{
  "mcpServers": {
    "pulse-fetch": {
      "command": "npx",
      "args": ["-y", "@pulsemcp/pulse-fetch"],
      "env": {
        "FIRECRAWL_API_KEY": "your-firecrawl-api-key",
        "BRIGHTDATA_BEARER_TOKEN": "your-brightdata-bearer-token"
      }
    }
  }
}
```

To set up the local version:

1. Clone or download the repository
2. Navigate to the local directory: `cd pulse-fetch/local`
3. Install dependencies: `npm install`
4. Build the project: `npm run build`
5. Update your Claude Desktop config with the correct path
6. Restart Claude Desktop

### Remote Setup

For a hosted solution, refer to [Pulse Fetch (Remote)](remote/README.md).

# Development

## Project Structure

```
pulse-fetch/
├── local/                 # Local server implementation
│   ├── src/
│   │   └── index.ts      # Main entry point
│   ├── build/            # Compiled output
│   └── package.json
├── shared/               # Shared business logic
│   ├── src/
│   │   ├── tools.ts      # Tool implementations
│   │   ├── resources.ts  # Resource implementations
│   │   └── types.ts      # Shared types
│   └── package.json
└── remote/               # Remote server (planned)
    └── README.md
```

## Running in Development Mode

```bash
# Build shared module first
cd shared
npm install
npm run build

# Run local server in development
cd ../local
npm install
npm run dev
```

## Testing

This project includes comprehensive testing capabilities:

```bash
# Install all dependencies
npm run install-all

# Run tests (if implemented)
npm test

# Run linting
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

## Linting and Formatting

The project uses ESLint and Prettier for code quality and consistency:

```bash
# Check for linting issues
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format all code
npm run format

# Check if code is properly formatted
npm run format:check
```

## Tools Reference

### scrape

Scrape a single webpage with advanced options for content extraction.

**Parameters:**

- `url` (string, required): URL to scrape
- `format` (string): Output format - 'markdown', 'html', 'rawHtml', 'links', 'extract'
- `onlyMainContent` (boolean): Extract only main content, removing navigation and ads
- `waitFor` (number): Milliseconds to wait for dynamic content to load
- `timeout` (number): Maximum time to wait for page load
- `extract` (object): Configuration for structured data extraction
  - `schema`: JSON schema for structured data
  - `systemPrompt`: System prompt for LLM extraction
  - `prompt`: User prompt for LLM extraction
- `removeBase64Images` (boolean): Remove base64 images from output (default: true)
- `maxChars` (number): Maximum characters to return (default: 100k)
- `startIndex` (number): Character index to start output from
- `saveResource` (boolean): Save result as MCP Resource (default: true)

## Roadmap & Future Ideas

### Planned Features

- [ ] Screenshot support
  - [ ] Allow format of `screenshot` and `screenshot-full-page` in `scrape` tool

### Future Enhancements

**Enhanced scraping parameters:**

- `includeHtmlTags`: HTML tags to include in output
- `excludeHtmlTags`: HTML tags to exclude from output
- `customUserAgent`: Custom User-Agent string
- `ignoreRobotsTxt`: Whether to ignore robots.txt restrictions
- `proxyUrl`: Optional proxy URL
- `headers`: Custom headers for requests
- `followLinks`: Follow related links on the page

**Interactive capabilities:**

- Execute custom actions like clicking or scrolling before scraping

**Image processing:**

- `imageStartIndex`: Starting position for image collection
- `raw`: Return raw content instead of processed markdown
- `imageMaxCount`: Maximum images to process per request
- `imageMaxHeight/Width`: Image dimension limits
- `imageQuality`: JPEG quality (1-100)
- `enableFetchImages`: Enable image fetching and processing

**Learning system:**

- Maintain a `learnings` resource to improve scraping approaches over time

## License

MIT
