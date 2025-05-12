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
- `fetch` is not actively maintained, so any bugs or edge cases are unlikely to be addressed, and any support will be slow.
- `fetch` has no mechanisms for bypassing anti-scraping technology, meaning your attempts to fetch may randomly fail.
- `Pulse Fetch` caches responses as Resources, allowing you easily inspect and re-use Tool call outcomes.
- `Pulse Fetch` has more descriptive Tool design and descriptions that will more reliably trigger and complete your desired task.

Most other alternatives fall short on one or more of the following vectors:
- They are not purpose-built for pulling a specific internet resource into context. They might be a multi-page crawler, or have search-engine-like capabilities, or be tied to the full REST API surface of some service provider. Incorporating those into a workflow where you just need simple fetch capabilities will confuse an LLM and deteriorate its reliability.
- They do not make maximal use of MCP concepts like Resources and Prompts.

## Features

TODO

### Tools

TODO

### Prompts

TODO

### Resources

TODO