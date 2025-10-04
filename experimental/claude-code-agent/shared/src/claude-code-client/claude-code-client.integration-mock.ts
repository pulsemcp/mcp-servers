import { IClaudeCodeClient } from './claude-code-client.js';
import { AgentState } from '../types.js';

export class MockClaudeCodeClient implements IClaudeCodeClient {
  private mockState: AgentState | null = null;

  private mockTranscript: Array<{
    role: string;
    content: string;
    timestamp: string;
  }> = [];

  async initAgent(systemPrompt: string) {
    this.mockState = {
      sessionId: 'mock-session-' + Math.random().toString(36).substr(2, 9),
      status: 'idle',
      systemPrompt,
      installedServers: [],
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      workingDirectory: '/tmp/mock-agent',
    };

    // Clear transcript on new agent init
    this.mockTranscript = [];

    return {
      sessionId: this.mockState.sessionId,
      status: 'idle' as const,
      stateUri: 'file:///tmp/mock-agent/state.json',
    };
  }

  async findServers(taskPrompt: string) {
    // Mock server discovery based on keywords
    const servers = [];

    if (
      taskPrompt.toLowerCase().includes('database') ||
      taskPrompt.toLowerCase().includes('postgres')
    ) {
      servers.push({
        name: 'io.github.crystaldba/postgres',
        rationale: 'Database operations detected in task description',
      });
    }

    if (taskPrompt.toLowerCase().includes('ui') || taskPrompt.toLowerCase().includes('browser')) {
      servers.push({
        name: 'com.microsoft/playwright',
        rationale: 'UI automation requirements detected',
      });
    }

    if (taskPrompt.toLowerCase().includes('monitor') || taskPrompt.toLowerCase().includes('log')) {
      servers.push({
        name: 'com.pulsemcp/appsignal',
        rationale: 'Monitoring/logging requirements detected',
      });
    }

    // Always include fetch
    servers.push({
      name: 'com.pulsemcp/fetch',
      rationale: 'General web fetch capabilities',
    });

    return { servers };
  }

  async installServers(
    serverNames: string[],
    _serverConfigs?: Record<string, { env?: Record<string, string> }>
  ) {
    if (!this.mockState) {
      throw new Error('No agent initialized. Call init_agent first.');
    }

    const installations = serverNames.map((name) => ({
      serverName: name,
      status: 'success' as const,
    }));

    this.mockState.installedServers = serverNames;
    this.mockState.lastActiveAt = new Date().toISOString();

    return {
      installations,
      mcpConfigPath: '/tmp/mock-agent/.mcp.json',
    };
  }

  async chat(prompt: string, _timeout?: number) {
    if (!this.mockState) {
      throw new Error('No agent initialized. Call init_agent first.');
    }

    this.mockState.status = 'working';
    this.mockState.lastActiveAt = new Date().toISOString();

    this.mockTranscript.push({
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString(),
    });

    // Simulate processing
    await new Promise((resolve) => setTimeout(resolve, 100));

    const response = `Mock response to: ${prompt}`;

    this.mockTranscript.push({
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString(),
    });

    this.mockState.status = 'idle';

    return {
      response,
      metadata: {
        tokensUsed: 100,
        duration: 100,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async inspectTranscript(format?: 'markdown' | 'json') {
    if (!this.mockState) {
      throw new Error('No agent initialized. Call init_agent first.');
    }

    return {
      transcriptUri: `file:///tmp/mock-agent/transcript.${format || 'markdown'}`,
      metadata: {
        messageCount: this.mockTranscript.length,
        lastUpdated:
          this.mockTranscript[this.mockTranscript.length - 1]?.timestamp ||
          new Date().toISOString(),
      },
    };
  }

  async stopAgent(force?: boolean) {
    if (!this.mockState) {
      throw new Error('No agent initialized. Call init_agent first.');
    }

    this.mockState.status = 'idle';
    const finalState = { ...this.mockState };

    return {
      status: force ? ('force_killed' as const) : ('stopped' as const),
      finalState,
    };
  }

  async getAgentState() {
    return this.mockState;
  }
}
