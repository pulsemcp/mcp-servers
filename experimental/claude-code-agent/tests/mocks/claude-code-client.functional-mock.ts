import { IClaudeCodeClient } from '../../shared/src/claude-code-client/claude-code-client.js';
import { AgentState } from '../../shared/src/types.js';

export class FunctionalMockClaudeCodeClient implements IClaudeCodeClient {
  private mockState: AgentState | null = null;
  private mockTranscript: Array<{ role: string; content: string; timestamp: string }> = [];
  private mockServerConfigs: Array<{ name: string; description?: string }> = [];

  constructor(mockServerConfigs?: Array<{ name: string; description?: string }>) {
    if (mockServerConfigs) {
      this.mockServerConfigs = mockServerConfigs;
    }
  }

  async verifyCliTools() {
    // Mock successful CLI tool verification
    return {
      status: 'success' as const,
      availableTools: ['npx', 'uvx', 'uv', 'docker', 'node', 'claude'],
      missingTools: [],
      errors: [],
    };
  }

  async initAgent(systemPrompt: string) {
    // Simulate the non-interactive mode behavior
    console.log('[Mock] Simulating claude -p "Agent initialized" with system prompt');

    this.mockState = {
      sessionId: 'test-session-' + Date.now(),
      status: 'idle' as const,
      systemPrompt,
      installedServers: [],
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      workingDirectory: '/tmp/test-agent',
    };

    return {
      sessionId: this.mockState.sessionId,
      status: this.mockState.status,
      stateUri: 'file:///tmp/test-agent/state.json',
    };
  }

  async findServers(taskPrompt: string) {
    const servers = [];

    // Mock logic for server discovery
    if (taskPrompt.toLowerCase().includes('database')) {
      servers.push({
        name: 'io.github.crystaldba/postgres',
        rationale: 'Database operations detected',
      });
    }

    if (taskPrompt.toLowerCase().includes('monitor') || taskPrompt.toLowerCase().includes('log')) {
      servers.push({
        name: 'com.pulsemcp/appsignal',
        rationale: 'Monitoring requirements detected',
      });
    }

    // Always add fetch
    servers.push({
      name: 'com.pulsemcp/fetch',
      rationale: 'General web capabilities',
    });

    return { servers };
  }

  async installServers(
    serverNames: string[],
    _serverConfigs?: Record<string, { env?: Record<string, string> }>
  ) {
    if (!this.mockState) {
      throw new Error('No agent initialized');
    }

    const installations = serverNames.map((name) => ({
      serverName: name,
      status: 'success' as const,
    }));

    this.mockState.installedServers = serverNames;

    return {
      installations,
      mcpConfigPath: '/tmp/test-agent/.mcp.json',
    };
  }

  async chat(prompt: string, _timeout?: number) {
    if (!this.mockState) {
      throw new Error('No agent initialized');
    }

    // Simulate non-interactive mode with --continue -p flag
    console.log(`[Mock] Simulating claude --continue -p "${prompt.substring(0, 50)}..."`);

    this.mockState.status = 'working';

    // Simulate some processing
    await new Promise((resolve) => setTimeout(resolve, 10));

    this.mockState.status = 'idle';

    const response = `Mock response to: ${prompt}`;

    this.mockTranscript.push({
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString(),
    });

    this.mockTranscript.push({
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString(),
    });

    return {
      response,
      metadata: {
        tokensUsed: 50,
        duration: 100,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async inspectTranscript(format?: 'markdown' | 'json') {
    return {
      transcriptUri: `file:///tmp/test-agent/transcript.${format || 'markdown'}`,
      metadata: {
        messageCount: this.mockTranscript.length,
        lastUpdated: new Date().toISOString(),
      },
    };
  }

  async stopAgent(force?: boolean) {
    if (!this.mockState) {
      throw new Error('No agent initialized');
    }

    const finalState = { ...this.mockState };
    this.mockState = null;

    return {
      status: force ? ('force_killed' as const) : ('stopped' as const),
      finalState,
    };
  }

  async getAgentState() {
    return this.mockState;
  }
}
