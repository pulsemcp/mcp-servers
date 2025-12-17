# PulseMCP's MCP Servers

We build reliable servers thoughtfully designed for MCP Client-powered workflows.

## Design principles

You can have confidence that any Pulse-branded MCP server was built with these north stars in mind:

1. **Purpose-built**. LLM-powered MCP clients offer uniquely new user interaction patterns that necessitate a different layer of abstraction than the REST API's from a pre-AI era. We thoughtfully scope drawing lines like building a new server, versus incorporating a new feature in another server. Or deciding where one slew of REST API endpoints might be better packaged as a single Tool call. And more.
2. **Easy set up**. Many MCP servers die before ever getting a chance to be used. We offer guides and a frustration-free experience to get going with our MCP servers inside your favorite MCP clients.
3. **Time savings**. By minimizing the number of tool chain steps or conversational turns you need to accomplish a task, our MCP servers will save you (and your agents) time waiting for a task to be completed.
4. **Inference cost savings**. By minimizing the number of tokens you need to consume to a accomplish a task, our MCP servers will save you on your LLM inference bills.
5. **Reliability**. You should have confidence that you can deploy our servers in a production application serving mass market consumers or business clients.
6. **Future-proof**. We sit on the bleeding edge of the MCP specification, working to push the ecosystem forward. As such, you can be sure that if you commit to baking our server into your workflow, it will self-improve over time to take advantage of the latest and greatest MCP features.

## Servers Available

### Productionized Servers

These are PulseMCP-branded servers that we intend to maintain indefinitely as our own offerings.

| Name                                             | Description                          | Local Status | Remote Status | Target Audience                                                                                        | Notes                                                                                                  |
| ------------------------------------------------ | ------------------------------------ | ------------ | ------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| [pulse-fetch](./productionized/pulse-fetch/)     | Pull internet resources into context | 0.3.0        | Not Started   | Agent-building frameworks (e.g. fast-agent, Mastra, PydanticAI) and MCP clients without built-in fetch | Supports Firecrawl and BrightData integrations; HTML noise stripping; Resource caching; LLM extraction |
| [cloud-storage](./productionized/cloud-storage/) | Cloud storage integration (GCS, S3)  | 0.1.0        | Not Started   | Developers needing to store/retrieve files from cloud storage                                          | Supports GCS; Local file path references to preserve context window; Future S3 support planned         |

### Experimental Servers

These are high-quality servers that we may discontinue if the official provider creates and maintains a better MCP server.

| Name                                                     | Description                                                        | Local Status | Remote Status | Target Audience                                       | Notes                                                                |
| -------------------------------------------------------- | ------------------------------------------------------------------ | ------------ | ------------- | ----------------------------------------------------- | -------------------------------------------------------------------- |
| [agent-orchestrator](./experimental/agent-orchestrator/) | Agent parallelization system for agentic coding and ops            | 0.1.1        | Not Started   | PulseMCP team for agent orchestration                 | Requires AGENT_ORCHESTRATOR_BASE_URL and API_KEY; Internal use only  |
| [appsignal](./experimental/appsignal/)                   | AppSignal application performance monitoring and error tracking    | 0.5.0        | Not Started   | Developers using AppSignal for application monitoring | Requires AppSignal API key; NOT officially affiliated with AppSignal |
| [claude-code-agent](./experimental/claude-code-agent/)   | Claude Code Agent MCP Server for managing Claude Code CLI sessions | 0.0.6        | Not Started   | Developers building AI-powered automation workflows   | Requires Claude Code CLI installed locally                           |
| [twist](./experimental/twist/)                           | Twist team messaging and collaboration platform integration        | 0.2.0        | Not Started   | Teams using Twist for asynchronous communication      | Requires Twist API bearer token and workspace ID                     |
| [pulsemcp-cms-admin](./experimental/pulsemcp-cms-admin/) | Internal API for managing PulseMCP newsletter content              | 0.3.3        | Not Started   | PulseMCP team for content management                  | Requires PULSEMCP_ADMIN_API_KEY; Internal use only                   |
| [hatchbox](./experimental/hatchbox/)                     | Hatchbox Rails hosting platform management                         | 0.1.0        | Not Started   | Rails developers using Hatchbox for hosting           | Requires Hatchbox API key and deploy key                             |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).
