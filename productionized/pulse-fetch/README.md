# Pulse Fetch

Purpose: Pull a specific resource from the open internet into context.

Target audience: Agent-building frameworks (e.g. `fast-agent`, `Mastra`, `PydanticAI`, `Agno`, `OpenAI Agents SDK`) and other MCP clients that do not come with built-in "fetch" capabilities.

## Highlights

- Strips out HTML noise from results so as to minimize token usage during MCP Tool calls
- Optionally saves each result as an MCP Resource so results are effectively cached
- Offers MCP Prompts so end-users don't have to type "use the Pulse fetch server to..."
- Option to configure Firecrawl API key to reliably work around anti-bot technology
- Option to configure Oxylabs API key to fallback to when Firecrawl fails

## Getting Started

[Pulse Fetch (Local)](local/README.md) - Go here if you want to run the code locally without relying on an external hosted service.

[Pulse Fetch (Remote)](remote/README.md) - Go here if you want a no-fuss hosted solution you can plug into with a simple URL.

## Why use this server vs. all the other "fetch"-like servers out there?

If our [Design Principles](../README.md#design-principles) resonate with you, you should consider using our server.

The [official reference implementation of `fetch`](https://www.pulsemcp.com/servers/modelcontextprotocol-fetch) is the closest option to an alternative. However:

- `fetch` has no mechanisms for bypassing anti-scraping technology, meaning your attempts to fetch may randomly fail. This is the most significant trade-off: we integrate with third party services to give you a realiable experience. The reference `fetch` server will never do this.
- `fetch` is maintained by volunteers, so bugs or edge cases are less likely to be addressed, and any support will be slow.
- `Pulse Fetch` caches responses as Resources, allowing you easily inspect and re-use Tool call outcomes.
- `Pulse Fetch` has more descriptive Tool design and descriptions that will more reliably trigger and complete your desired task.

Most other alternatives fall short on one or more of the following vectors:

- They are not purpose-built for pulling a specific internet resource into context. They might be a multi-page crawler, or have search-engine-like capabilities, or be tied to the full REST API surface of some service provider. Incorporating those into a workflow where you just need simple fetch capabilities will confuse an LLM and deteriorate its reliability.
- They do not make maximal use of MCP concepts like Resources and Prompts.

## Features

### Tools

#### scrape

Scrape a single webpage with advanced options for content extraction. Supports various formats including markdown, HTML, and screenshots.

Extracts and transforms webpage content into clean, LLM-optimized Markdown. Returns article title, main content, excerpt, byline and site name. Uses Mozilla's Readability algorithm to remove ads, navigation, footers and non-essential elements while preserving the core content structure.

Extract structured data from a website.

Argument ideas:

- `format`: 'markdown', 'html', 'rawHtml', 'links', 'extract'
- 'extract' requires the `extract` parameter below
- `onlyMainContent`: Only return the main content of the page. Ignored if `extract` is set.
- `waitFor`: Time in milliseconds to wait for dynamic content to load
- `timeout`: Maximum time in milliseconds to wait for the page to load
- `extract`: Configuration for structured data extraction
  - `schema`: Schema for structured data extraction
  - `systemPrompt`: System prompt for LLM extraction
  - `prompt`: User prompt for LLM extraction
- `removeBase64Images`: Remove base64 encoded images from output. Default true.
- `maxChars`: Maximum number of characters to return. Default 25k tokens (100k characters). Response includes note it was truncated if it is truncated.
- `startIndex`: On return output starting at this character index, useful if a previous fetch was truncated and more context is required.
- `saveResource`: Save the result as an MCP Resource. Useful for e.g. large response that need to be paginated into context. Defaults to yes.

#### scrape_with_web_unblocker

Scrape url using Oxylabs Web Unblocker. This tool manages the unblocking process to extract public data even from the most difficult websites.

### Prompts

TODO

### Resources

TODO

## Roadmap

- [ ] Screenshot support
  - [ ] Allow format of `screenshot` and `screenshot-full-page` in `scrape` tool

### Other ideas

`scrape` parameters:

- `includeHtmlTags`: HTML tags to include in the output
- `excludeHtmlTags`: HTML tags to exclude from the output (e.g. noisy ones)
- `customUserAgent`: Optional custom User-Agent string to use for requests
- `ignoreRobotsTxt`: Whether to ignore robots.txt restrictions
- `proxyUrl`: Optional proxy URL to use for requests
- `headers`: Optional headers to include in the request
- `followLinks`: Whether to follow related links on the page (probably need to allow for a Sampling-powered augmentation here)

Can execute custom actions like clicking or scrolling before scraping.

Image fetching:

- imageStartIndex (default: 0): Starting position for image collection
- raw (default: false): Return raw content instead of processed markdown
- imageMaxCount (default: 3): Maximum number of images to process per request
- imageMaxHeight (default: 4000): Maximum height of merged image
- imageMaxWidth (default: 1000): Maximum width of merged image
- imageQuality (default: 80): JPEG quality (1-100)
- enableFetchImages (default: false): Enable fetching and processing of images.

Maintain a `learnings` resource or config file so that the tool can learn from each call and improve its approach.
