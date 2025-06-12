# PulseMCP's MCP Servers

We build reliable servers thoughtfully designed for MCP Client-powered workflows.

## Design principles

You can have confidence that any Pulse-branded MCP server was built with these ideas in mind:

1. **Purpose-built**. LLM-powered MCP clients offer uniquely new user interaction patterns that necessitate a different layer of abstraction than the REST API's from a pre-AI era. We thoughtfully scope drawing lines like building a new server, versus incorporating a new feature in another server. Or deciding where one slew of REST API endpoints might be better packaged as a single Tool call. And more.
2. **Easy set up**. Many MCP servers die before ever getting a chance to be used. We offer guides and a frustration-free experience to get going with our MCP servers inside your favorite MCP clients.
3. **Time savings**. By minimizing the number of tool chain steps or conversational turns you need to accomplish a task, our MCP servers will save you (and your agents) time waiting for a task to be completed.
4. **Inference cost savings**. By minimizing the number of tokens you need to consume to a accomplish a task, our MCP servers will save you on your LLM inference bills.
5. **Reliability**. You should have confidence that you can deploy our servers in a production application serving mass market consumers or business clients.
6. **Future-proof**. We sit on the bleeding edge of the MCP specification, working to push the ecosystem forward. As such, you can be sure that if you commit to baking our server into your workflow, it will self-improve over time to take advantage of the latest and greatest MCP features.

## Repository Structure

- **`productionized/`**: Production-ready MCP servers (see [productionized/README.md](./productionized/README.md) for status)
  - `pulse-fetch/`: Pull internet resources into context
- **`experimental/`**: MCP servers in active development
- **`mcp-server-template/`**: Template for creating new MCP servers
- **`mcp-json-profiles/`**: JSON profiles for MCP configuration

## Servers available

### Production Servers

#### Pulse Fetch

Purpose: Pull a specific resource from the open internet into context.

Target audience: Agent-building frameworks (e.g. `fast-agent`, `Mastra`, `PydanticAI`, `Agno`, `OpenAI Agents SDK`) and other MCP clients that do not come with built-in "fetch" capabilities.

Highlights:

- Strips out HTML noise from results so as to minimize token usage during MCP Tool calls
- Optionally saves each result as an MCP Resource so results are effectively cached
- Offers MCP Prompts so end-users don't have to type "use the Pulse fetch server to..."
- Option to configure Firecrawl API key to reliably work around anti-bot technology
- Option to configure Oxylabs API key to fallback to when Firecrawl fails

### Experimental Servers

See the [experimental/](./experimental/) directory for servers currently in development.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).
