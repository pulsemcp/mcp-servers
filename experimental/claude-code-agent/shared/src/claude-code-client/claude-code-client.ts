import { ChildProcess, spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AgentState, ServerConfig } from '../types.js';
import { createLogger } from '../logging.js';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';

const exec = promisify(execCallback);

const logger = createLogger('claude-code-client');

// Timeout constants (in milliseconds)
const INIT_TIMEOUT_MS = 30000; // 30 seconds for agent initialization
const DEFAULT_COMMAND_TIMEOUT_MS = 60000; // 60 seconds for general commands
const DEFAULT_CHAT_TIMEOUT_MS = 300000; // 5 minutes for chat operations
const GRACEFUL_SHUTDOWN_DELAY_MS = 5000; // 5 seconds to wait for graceful shutdown

// Max turns constant
const INIT_MAX_TURNS = 1; // Single turn for initialization

export interface IClaudeCodeClient {
  verifyCliTools(): Promise<{
    status: 'success' | 'failed';
    availableTools: string[];
    missingTools: string[];
    errors: string[];
  }>;

  initAgent(systemPrompt: string): Promise<{
    sessionId: string;
    status: 'idle' | 'working';
    stateUri: string;
  }>;

  findServers(taskPrompt: string): Promise<{
    servers: Array<{ name: string; rationale: string }>;
  }>;

  installServers(
    serverNames: string[],
    serverConfigs?: Record<string, { env?: Record<string, string> }>
  ): Promise<{
    installations: Array<{
      serverName: string;
      status: 'success' | 'failed';
      error?: string;
    }>;
    mcpConfigPath: string;
  }>;

  chat(
    prompt: string,
    timeout?: number
  ): Promise<{
    response: string;
    metadata: {
      tokensUsed?: number;
      duration: number;
      timestamp: string;
    };
  }>;

  inspectTranscript(format?: 'markdown' | 'json'): Promise<{
    transcriptUri: string;
    metadata: {
      messageCount: number;
      lastUpdated: string;
    };
  }>;

  stopAgent(force?: boolean): Promise<{
    status: 'stopped' | 'force_killed' | 'failed';
    finalState: AgentState;
  }>;

  getAgentState(): Promise<AgentState | null>;
}

export class ClaudeCodeClient implements IClaudeCodeClient {
  private claudeCodePath: string;
  private trustedServersPath: string;
  private serverConfigsPath: string;
  private serverSecretsPath?: string;
  private agentBaseDir: string;
  private skipPermissions: boolean;
  private availableTools: Map<string, boolean> = new Map();
  private currentAgent: {
    process?: ChildProcess;
    workingDir?: string;
    sessionId?: string;
    state?: AgentState;
  } = {};

  constructor(
    claudeCodePath: string,
    trustedServersPath: string,
    serverConfigsPath: string,
    agentBaseDir: string,
    serverSecretsPath?: string,
    skipPermissions?: boolean
  ) {
    this.claudeCodePath = claudeCodePath;
    this.trustedServersPath = trustedServersPath;
    this.serverConfigsPath = serverConfigsPath;
    this.agentBaseDir = agentBaseDir;
    this.serverSecretsPath = serverSecretsPath;
    this.skipPermissions = skipPermissions ?? true; // Default to true for backward compatibility
  }

  /**
   * Verifies that required CLI tools are available.
   * Should be called at startup to ensure all necessary tools are installed.
   */
  async verifyCliTools(): Promise<{
    status: 'success' | 'failed';
    availableTools: string[];
    missingTools: string[];
    errors: string[];
  }> {
    const tools = [
      { name: 'npx', command: 'npx --version' },
      { name: 'uvx', command: '/Users/admin/.local/bin/uvx --version' },
      { name: 'uv', command: '/Users/admin/.local/bin/uv --version' },
      { name: 'docker', command: 'docker --version' },
      { name: 'node', command: 'node --version' },
      { name: 'claude', command: this.claudeCodePath + ' --version' },
    ];

    const availableTools: string[] = [];
    const missingTools: string[] = [];
    const errors: string[] = [];

    for (const tool of tools) {
      try {
        await exec(tool.command);
        this.availableTools.set(tool.name, true);
        availableTools.push(tool.name);
        logger.debug(`✓ ${tool.name} is available`);
      } catch (error) {
        this.availableTools.set(tool.name, false);
        missingTools.push(tool.name);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${tool.name}: ${errorMessage}`);
        logger.warn(`✗ ${tool.name} is not available: ${errorMessage}`);
      }
    }

    const status = missingTools.length === 0 ? 'success' : 'failed';

    if (status === 'failed') {
      logger.error('Some CLI tools are missing. This may limit server installation capabilities.');
    } else {
      logger.info('All CLI tools verified successfully.');
    }

    return {
      status,
      availableTools,
      missingTools,
      errors,
    };
  }

  async initAgent(systemPrompt: string): Promise<{
    sessionId: string;
    status: 'idle' | 'working';
    stateUri: string;
  }> {
    try {
      // Clean up any existing agent
      if (this.currentAgent.process) {
        await this.stopAgent();
      }

      // Create agent directory
      const agentId = uuidv4();
      const workingDir = join(this.agentBaseDir, agentId);
      await fs.mkdir(workingDir, { recursive: true });

      // Create .claude directory structure
      const claudeDir = join(workingDir, '.claude');
      await fs.mkdir(claudeDir, { recursive: true });

      // Create settings.json
      const settings = {
        enableAllProjectMcpServers: true,
        hooks: {},
        permissions: {
          deny: ['WebFetch'],
        },
      };
      await fs.writeFile(join(claudeDir, 'settings.json'), JSON.stringify(settings, null, 2));

      // Create empty .mcp.json to start
      await fs.writeFile(
        join(workingDir, '.mcp.json'),
        JSON.stringify({ mcpServers: {} }, null, 2)
      );

      // Start Claude Code in non-interactive mode with -p flag
      const initMessage = 'Agent initialized successfully. Ready to assist.';
      const args = [
        '-p',
        initMessage, // -p flag must come early for non-interactive mode
      ];

      if (this.skipPermissions) {
        args.push('--dangerously-skip-permissions');
      }

      args.push(
        '--output-format',
        'json',
        '--append-system-prompt',
        systemPrompt,
        '--max-turns',
        INIT_MAX_TURNS.toString()
      );

      logger.debug('Spawning Claude process:', {
        command: this.claudeCodePath,
        args,
        cwd: workingDir,
      });

      const initProcess = spawn(this.claudeCodePath, args, {
        cwd: workingDir,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Close stdin immediately since we're not sending any input
      initProcess.stdin.end();

      let output = '';
      let errorOutput = '';
      let sessionId = '';

      initProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        logger.debug('Claude stdout:', chunk);
      });

      initProcess.stderr.on('data', (data) => {
        const chunk = data.toString();
        errorOutput += chunk;
        logger.error('Claude stderr:', chunk);
      });

      await new Promise<void>((resolve, reject) => {
        // Set a timeout
        const timeout = setTimeout(() => {
          initProcess.kill();
          reject(
            new Error(
              `Claude Code init timed out after ${INIT_TIMEOUT_MS}ms. stdout: ${output}, stderr: ${errorOutput}`
            )
          );
        }, INIT_TIMEOUT_MS);

        initProcess.on('exit', (code) => {
          clearTimeout(timeout);
          if (code === 0) {
            try {
              const jsonOutput = JSON.parse(output);
              // Claude returns session_id (with underscore)
              sessionId = jsonOutput.session_id || jsonOutput.sessionId || agentId;
              logger.debug('Claude init successful, session:', sessionId);
              resolve();
            } catch {
              // Fallback to agent ID if we can't parse
              logger.warn('Could not parse Claude output as JSON, using fallback ID:', output);
              sessionId = agentId;
              resolve();
            }
          } else {
            reject(new Error(`Claude Code init failed with code ${code}. stderr: ${errorOutput}`));
          }
        });

        initProcess.on('error', (err) => {
          clearTimeout(timeout);
          logger.error('Failed to spawn Claude process:', err);
          reject(err);
        });
      });

      // Create initial state
      const state: AgentState = {
        sessionId,
        status: 'idle',
        systemPrompt,
        installedServers: [],
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        workingDirectory: workingDir,
      };

      const stateFile = join(workingDir, 'state.json');
      await fs.writeFile(stateFile, JSON.stringify(state, null, 2));

      // Note: No longer creating manual transcript files since Claude Code
      // automatically tracks conversations in ~/.claude/projects/

      this.currentAgent = {
        workingDir,
        sessionId,
        state,
      };

      logger.debug(`Agent initialized with session ID: ${sessionId}`);

      return {
        sessionId,
        status: 'idle',
        stateUri: `file://${stateFile}`,
      };
    } catch (error) {
      logger.error('Failed to initialize agent:', error);
      throw new Error(
        `Failed to initialize agent: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async findServers(taskPrompt: string): Promise<{
    servers: Array<{ name: string; rationale: string }>;
  }> {
    try {
      // Read trusted servers file
      const serversContent = await fs.readFile(this.trustedServersPath, 'utf-8');

      // Use Claude Code to analyze which servers are relevant
      const prompt = `Based on this task: "${taskPrompt}"

And these available servers:
${serversContent}

Which servers would be relevant for this task? Return a JSON array of server names with rationales.
Format: [{"name": "server.name", "rationale": "why this server is needed"}]`;

      // Use session context if agent is initialized, otherwise run standalone
      const args = this.currentAgent.sessionId
        ? ['--resume', this.currentAgent.sessionId, '--output-format', 'json', '-p', prompt]
        : ['--output-format', 'json', '-p', prompt];

      const result = await this.runClaudeCodeCommand(args);

      try {
        const claudeResponse = JSON.parse(result);

        // Extract the actual result from Claude's response format
        let serversArray: Array<{ name: string; rationale: string }> = [];

        if (claudeResponse.result) {
          // Claude wraps JSON in markdown, so extract it
          const resultText = claudeResponse.result.toString();
          const jsonMatch = resultText.match(/```json\s*(.*?)\s*```/s);

          if (jsonMatch) {
            serversArray = JSON.parse(jsonMatch[1]);
          } else {
            // Try parsing the result directly
            serversArray = JSON.parse(resultText);
          }
        } else if (Array.isArray(claudeResponse)) {
          // Direct array response
          serversArray = claudeResponse;
        }

        return { servers: serversArray };
      } catch (parseError) {
        // Fallback parsing if response isn't perfect JSON
        logger.warn('Could not parse JSON response, attempting fallback parsing:', parseError);
        logger.debug('Raw result was:', result);
        return { servers: [] };
      }
    } catch (error) {
      logger.error('Failed to find servers:', error);
      throw new Error(
        `Failed to find servers: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async installServers(
    serverNames: string[],
    serverConfigs?: Record<string, { env?: Record<string, string> }>
  ): Promise<{
    installations: Array<{
      serverName: string;
      status: 'success' | 'failed';
      error?: string;
    }>;
    mcpConfigPath: string;
  }> {
    try {
      if (!this.currentAgent.workingDir) {
        throw new Error('No agent initialized');
      }

      const installations: Array<{
        serverName: string;
        status: 'success' | 'failed';
        error?: string;
      }> = [];

      // Read server configurations
      const allServersConfig = JSON.parse(await fs.readFile(this.serverConfigsPath, 'utf-8'));

      // Read secrets if available
      let secrets: Record<string, Record<string, string>> = {};
      if (this.serverSecretsPath) {
        try {
          secrets = JSON.parse(await fs.readFile(this.serverSecretsPath, 'utf-8'));
        } catch {
          logger.warn('Could not read secrets file');
        }
      }

      // Build MCP configuration
      const mcpConfig: {
        mcpServers: Record<string, unknown>;
      } = { mcpServers: {} };

      for (const serverName of serverNames) {
        const serverConfig = allServersConfig.find((s: ServerConfig) => s.name === serverName);

        if (!serverConfig) {
          installations.push({
            serverName,
            status: 'failed',
            error: 'Server configuration not found',
          });
          continue;
        }

        try {
          // Find the best package for this server
          const packageConfig = this.selectBestPackage(serverConfig.packages);

          if (!packageConfig) {
            installations.push({
              serverName,
              status: 'failed',
              error: 'No supported package configuration found',
            });
            continue;
          }

          // Convert package config to MCP format
          const mcpServerConfig = this.convertToMcpConfig(
            packageConfig,
            serverConfigs?.[serverName]?.env || {},
            secrets[serverName] || {}
          );

          mcpConfig.mcpServers[serverName] = mcpServerConfig;

          installations.push({
            serverName,
            status: 'success',
          });
        } catch (error) {
          installations.push({
            serverName,
            status: 'failed',
            error: `Configuration error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          });
        }
      }

      // Write MCP configuration
      const mcpConfigPath = join(this.currentAgent.workingDir, '.mcp.json');
      await fs.writeFile(mcpConfigPath, JSON.stringify(mcpConfig, null, 2));

      // Update agent state
      if (this.currentAgent.state) {
        this.currentAgent.state.installedServers = serverNames.filter((name) =>
          installations.find((i) => i.serverName === name && i.status === 'success')
        );
        await this.saveAgentState();
      }

      logger.debug(
        `Installed ${installations.filter((i) => i.status === 'success').length} servers`
      );

      return {
        installations,
        mcpConfigPath,
      };
    } catch (error) {
      logger.error('Failed to install servers:', error);
      throw new Error(
        `Failed to install servers: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async chat(
    prompt: string,
    timeout = DEFAULT_CHAT_TIMEOUT_MS
  ): Promise<{
    response: string;
    metadata: {
      tokensUsed?: number;
      duration: number;
      timestamp: string;
    };
  }> {
    try {
      if (!this.currentAgent.workingDir || !this.currentAgent.sessionId) {
        throw new Error('No agent initialized');
      }

      const startTime = Date.now();

      // Update agent status
      if (this.currentAgent.state) {
        this.currentAgent.state.status = 'working';
        this.currentAgent.state.lastActiveAt = new Date().toISOString();
        await this.saveAgentState();
      }

      // Run chat with --resume flag to continue the specific session
      const result = await this.runClaudeCodeCommand(
        ['--resume', this.currentAgent.sessionId, '--output-format', 'json', '-p', prompt],
        timeout
      );

      const duration = Date.now() - startTime;

      // Note: Claude Code automatically tracks all conversation interactions,
      // so we don't need to manually maintain transcript files anymore

      let response = result;
      let tokensUsed: number | undefined;

      try {
        const jsonOutput = JSON.parse(result);
        // Extract the actual result from Claude's response format
        response = jsonOutput.result || jsonOutput.content || jsonOutput.message || result;
        tokensUsed = jsonOutput.usage?.output_tokens || jsonOutput.tokensUsed;
      } catch {
        // Use raw output if not JSON
      }

      // Update agent status back to idle
      if (this.currentAgent.state) {
        this.currentAgent.state.status = 'idle';
        await this.saveAgentState();
      }

      return {
        response,
        metadata: {
          tokensUsed,
          duration,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      // Update agent status back to idle on error
      if (this.currentAgent.state) {
        this.currentAgent.state.status = 'idle';
        await this.saveAgentState();
      }

      logger.error('Chat failed:', error);
      throw new Error(`Chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Reads Claude Code's native session transcript from the .claude/projects directory
   */
  private async readNativeTranscript(sessionId: string): Promise<unknown[]> {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    if (!homeDir) {
      throw new Error('Could not determine home directory for Claude Code session files');
    }

    // Generate the project directory name based on current working directory
    const cwd = process.cwd();
    const projectDirName = cwd.replace(/[^a-zA-Z0-9]/g, '-').replace(/^-+|-+$/g, '');
    const sessionFilePath = join(
      homeDir,
      '.claude',
      'projects',
      projectDirName,
      `${sessionId}.jsonl`
    );

    try {
      const content = await fs.readFile(sessionFilePath, 'utf-8');
      const lines = content
        .trim()
        .split('\n')
        .filter((line) => line.trim());
      return lines.map((line) => JSON.parse(line));
    } catch {
      // Fallback: try to find the session file in any project directory
      const projectsDir = join(homeDir, '.claude', 'projects');
      try {
        const projects = await fs.readdir(projectsDir);
        for (const project of projects) {
          const sessionFile = join(projectsDir, project, `${sessionId}.jsonl`);
          try {
            const content = await fs.readFile(sessionFile, 'utf-8');
            const lines = content
              .trim()
              .split('\n')
              .filter((line) => line.trim());
            return lines.map((line) => JSON.parse(line));
          } catch {
            // Continue searching
          }
        }
      } catch {
        // Projects directory doesn't exist or isn't accessible
      }

      throw new Error(`Could not find Claude Code session file for session ID: ${sessionId}`);
    }
  }

  /**
   * Converts Claude Code's native transcript format to markdown
   */
  private convertTranscriptToMarkdown(nativeTranscript: unknown[]): string {
    const relevantEntries = nativeTranscript.filter(
      (
        entry: unknown
      ): entry is {
        type: string;
        timestamp?: string;
        content?: string;
        message?: {
          content?: unknown;
          usage?: {
            input_tokens?: number;
            output_tokens?: number;
            cache_read_input_tokens?: number;
          };
        };
      } =>
        typeof entry === 'object' &&
        entry !== null &&
        'type' in entry &&
        ((entry as { type: string }).type === 'user' ||
          (entry as { type: string }).type === 'assistant')
    );

    return relevantEntries
      .map((entry) => {
        const role = entry.type === 'user' ? 'User' : 'Assistant';
        const timestamp = entry.timestamp || new Date().toISOString();

        let content = `## ${role} - ${timestamp}\n\n`;

        if (entry.type === 'user') {
          content += entry.message?.content || entry.content || '';
        } else if (entry.type === 'assistant') {
          const message = entry.message;
          if (message?.content) {
            if (Array.isArray(message.content)) {
              // Handle structured content (tool calls, text blocks)
              message.content.forEach((block: unknown) => {
                const typedBlock = block as {
                  type?: string;
                  text?: string;
                  name?: string;
                  input?: unknown;
                };
                if (typedBlock.type === 'text') {
                  content += (typedBlock.text || '') + '\n\n';
                } else if (typedBlock.type === 'tool_use') {
                  content += `### Tool Call: ${typedBlock.name || 'Unknown'}\n\n`;
                  content += `**Arguments:**\n\`\`\`json\n${JSON.stringify(typedBlock.input || {}, null, 2)}\n\`\`\`\n\n`;
                }
              });
            } else {
              content += message.content;
            }
          }

          // Add usage information if available
          if (message?.usage) {
            content += '\n\n### Usage Statistics\n';
            content += `- Input tokens: ${message.usage.input_tokens || 0}\n`;
            content += `- Output tokens: ${message.usage.output_tokens || 0}\n`;
            if (message.usage.cache_read_input_tokens) {
              content += `- Cache read tokens: ${message.usage.cache_read_input_tokens}\n`;
            }
          }
        }

        return content.trim();
      })
      .join('\n\n---\n\n');
  }

  async inspectTranscript(format: 'markdown' | 'json' = 'markdown'): Promise<{
    transcriptUri: string;
    metadata: {
      messageCount: number;
      lastUpdated: string;
    };
  }> {
    try {
      if (!this.currentAgent.sessionId || !this.currentAgent.workingDir) {
        throw new Error('No agent initialized');
      }

      let nativeTranscript: unknown[] = [];

      try {
        // Try to read Claude Code's native session transcript
        nativeTranscript = await this.readNativeTranscript(this.currentAgent.sessionId);
      } catch (error) {
        logger.warn('Could not read native Claude Code transcript, using empty transcript:', error);
        // Use empty transcript if Claude Code session file is not available
        // This can happen in test environments or if the session hasn't been persisted yet
        nativeTranscript = [];
      }

      const outputPath = join(
        this.currentAgent.workingDir,
        format === 'markdown' ? 'transcript.md' : 'transcript.json'
      );

      if (format === 'markdown') {
        const markdown =
          nativeTranscript.length > 0
            ? this.convertTranscriptToMarkdown(nativeTranscript)
            : '# Conversation Transcript\n\nNo conversation data available yet.';
        await fs.writeFile(outputPath, markdown);
      } else {
        await fs.writeFile(outputPath, JSON.stringify(nativeTranscript, null, 2));
      }

      return {
        transcriptUri: `file://${outputPath}`,
        metadata: {
          messageCount: nativeTranscript.length,
          lastUpdated:
            nativeTranscript.length > 0
              ? (nativeTranscript[nativeTranscript.length - 1] as { timestamp?: string })
                  ?.timestamp || new Date().toISOString()
              : new Date().toISOString(),
        },
      };
    } catch (error) {
      logger.error('Failed to inspect transcript:', error);
      throw new Error(
        `Failed to inspect transcript: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async stopAgent(force = false): Promise<{
    status: 'stopped' | 'force_killed' | 'failed';
    finalState: AgentState;
  }> {
    try {
      if (!this.currentAgent.state) {
        throw new Error('No agent initialized');
      }

      const finalState = { ...this.currentAgent.state };
      let status: 'stopped' | 'force_killed' | 'failed' = 'stopped';

      if (this.currentAgent.process) {
        if (force) {
          this.currentAgent.process.kill('SIGKILL');
          status = 'force_killed';
        } else {
          this.currentAgent.process.kill('SIGTERM');

          // Wait for graceful shutdown
          await new Promise((resolve) => setTimeout(resolve, GRACEFUL_SHUTDOWN_DELAY_MS));

          if (this.currentAgent.process && !this.currentAgent.process.killed) {
            this.currentAgent.process.kill('SIGKILL');
            status = 'force_killed';
          }
        }
      }

      // Clear current agent
      this.currentAgent = {};

      return {
        status,
        finalState,
      };
    } catch (error) {
      logger.error('Failed to stop agent', error);
      return {
        status: 'failed',
        finalState: this.currentAgent.state || ({} as AgentState),
      };
    }
  }

  async getAgentState(): Promise<AgentState | null> {
    return this.currentAgent.state || null;
  }

  private async runClaudeCodeCommand(
    args: string[],
    timeout = DEFAULT_COMMAND_TIMEOUT_MS
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const commandArgs = this.skipPermissions ? ['--dangerously-skip-permissions', ...args] : args;

      const process = spawn(this.claudeCodePath, commandArgs, {
        cwd: this.currentAgent.workingDir || this.agentBaseDir,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Close stdin immediately since we're not sending any input
      process.stdin.end();

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const timeoutId = setTimeout(() => {
        process.kill();
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);

      process.on('exit', (code) => {
        clearTimeout(timeoutId);
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (err) => {
        clearTimeout(timeoutId);
        reject(err);
      });
    });
  }

  private async saveAgentState(): Promise<void> {
    if (!this.currentAgent.workingDir || !this.currentAgent.state) {
      return;
    }

    const stateFile = join(this.currentAgent.workingDir, 'state.json');
    await fs.writeFile(stateFile, JSON.stringify(this.currentAgent.state, null, 2));
  }

  /**
   * Selects the best package configuration from available packages.
   * Prioritizes based on user-specified precedence: remote first, then npx, uvx, docker.
   */
  private selectBestPackage(packages: unknown[]): unknown | null {
    // Priority order for server types (as specified by user)
    const priority = [
      // Remote servers (highest precedence)
      'http', // HTTP servers (streamable)
      'sse', // Server-Sent Events
      // Local package managers (second priority)
      'npm', // npm packages via npx
      'github', // GitHub repositories via npx
      // Python packages (third priority)
      'python', // Python packages via uvx/uv
      // Docker containers (fourth priority)
      'docker', // Docker containers
      // Local filesystem and git (lowest priority)
      'filesystem', // Local filesystem paths
      'git', // Git repositories
      // Legacy types
      'binary', // Binary executables
    ];

    for (const preferredType of priority) {
      // Check new schema format first
      const newFormatPackage = packages.find(
        (p: unknown): p is { registryType: string; transport: unknown } =>
          typeof p === 'object' &&
          p !== null &&
          'registryType' in p &&
          'transport' in p &&
          (p as { registryType: string }).registryType === preferredType
      );
      if (newFormatPackage) {
        return newFormatPackage;
      }

      // Check old schema format
      const oldFormatPackage = packages.find(
        (p: unknown): p is { type: string } =>
          typeof p === 'object' &&
          p !== null &&
          'type' in p &&
          (p as { type: string }).type === preferredType
      );
      if (oldFormatPackage) {
        return oldFormatPackage;
      }
    }

    return null;
  }

  /**
   * Converts a package configuration to Claude Code MCP .mcp.json format.
   * Supports both old schema (servers.json) and new schema (server.json) formats.
   */
  private convertToMcpConfig(
    packageConfig: unknown,
    customEnv: Record<string, string>,
    secrets: Record<string, string>
  ): unknown {
    const config = packageConfig as { registryType?: string; transport?: unknown; type?: string };

    // Handle new schema format (server.json)
    if (config.registryType && config.transport) {
      return this.convertNewSchemaToMcp(packageConfig, customEnv, secrets);
    }

    // Handle old schema format (servers.json)
    if (config.type) {
      return this.convertOldSchemaToMcp(packageConfig, customEnv, secrets);
    }

    throw new Error('Unsupported package configuration format');
  }

  /**
   * Converts new schema (server.json) format to MCP configuration.
   */
  private convertNewSchemaToMcp(
    packageConfig: unknown,
    customEnv: Record<string, string>,
    secrets: Record<string, string>
  ): unknown {
    const {
      registryType,
      identifier,
      transport,
      runtimeHint,
      runtimeArguments,
      environmentVariables,
    } = packageConfig as {
      registryType: string;
      identifier: string;
      transport: { type: string; url?: string; headers?: Record<string, string> };
      runtimeHint?: string;
      runtimeArguments?: Array<{ type: string; value: string; name?: string }>;
      environmentVariables?: Array<{ name: string; default?: string }>;
    };

    // Merge environment variables
    const env = { ...customEnv, ...secrets };

    // Add default environment variables from package config
    if (environmentVariables) {
      for (const envVar of environmentVariables) {
        if (envVar.default && !env[envVar.name]) {
          env[envVar.name] = envVar.default;
        }
      }
    }

    switch (transport.type) {
      case 'stdio':
        return this.createStdioConfig(registryType, identifier, runtimeHint, runtimeArguments, env);

      case 'http':
        if (!transport.url) {
          throw new Error('HTTP transport requires URL');
        }
        return {
          type: 'http',
          url: transport.url,
          headers: { ...transport.headers, ...env },
        };

      case 'sse':
        if (!transport.url) {
          throw new Error('SSE transport requires URL');
        }
        return {
          type: 'sse',
          url: transport.url,
          headers: { ...transport.headers, ...env },
        };

      default:
        throw new Error(`Unsupported transport type: ${transport.type}`);
    }
  }

  /**
   * Converts old schema (servers.json) format to MCP configuration.
   * Supports all modern MCP server types including remote, stdio, docker, etc.
   */
  private convertOldSchemaToMcp(
    packageConfig: unknown,
    customEnv: Record<string, string>,
    secrets: Record<string, string>
  ): unknown {
    const config = packageConfig as {
      type?: string;
      command?: string;
      args?: string[];
      env?: Record<string, string>;
      url?: string;
      headers?: Record<string, string>;
    };

    // Merge environment variables
    const env = {
      ...config.env,
      ...customEnv,
      ...secrets,
    };

    // Handle remote server types first (highest precedence)
    if (config.type === 'http') {
      if (!config.url) {
        throw new Error('HTTP server configuration requires URL');
      }
      return {
        type: 'http',
        url: config.url,
        headers: { ...config.headers, ...env },
      };
    }

    if (config.type === 'sse') {
      if (!config.url) {
        throw new Error('SSE server configuration requires URL');
      }
      return {
        type: 'sse',
        url: config.url,
        headers: { ...config.headers, ...env },
      };
    }

    // Handle stdio transport types
    if (!config.command) {
      throw new Error('Stdio server configuration requires command');
    }

    // Intelligent command selection based on available tools
    let finalCommand = config.command;
    const finalArgs = config.args || [];

    // If command is a known tool name, use the best available version
    if (config.command === 'npx' && !this.availableTools.get('npx')) {
      throw new Error('npx is required but not available');
    }
    if (config.command === 'uvx') {
      finalCommand = this.selectBestTool(['/Users/admin/.local/bin/uvx', 'uvx']) || config.command;
    }
    if (config.command === 'uv') {
      finalCommand = this.selectBestTool(['/Users/admin/.local/bin/uv', 'uv']) || config.command;
    }
    if (config.command === 'docker' && !this.availableTools.get('docker')) {
      throw new Error('Docker is required but not available');
    }

    return {
      command: finalCommand,
      args: finalArgs,
      env,
    };
  }

  /**
   * Creates stdio configuration for various registry types.
   * Uses intelligent tool selection based on availability and precedence.
   */
  private createStdioConfig(
    registryType: string,
    identifier: string,
    runtimeHint?: string,
    runtimeArguments?: Array<{ type: string; value: string; name?: string }>,
    env: Record<string, string> = {}
  ): unknown {
    const args: string[] = [];

    // Add runtime arguments
    if (runtimeArguments) {
      for (const arg of runtimeArguments) {
        if (arg.type === 'positional') {
          args.push(arg.value);
        } else if (arg.type === 'named' && arg.name) {
          args.push(`--${arg.name}=${arg.value}`);
        }
      }
    }

    switch (registryType) {
      case 'npm': {
        // npm packages via npx (preferred) or fallback to runtime hint
        const command = runtimeHint || this.selectBestTool(['npx', 'node']) || 'npx';
        return {
          command,
          args: [...args, identifier],
          env,
        };
      }

      case 'python': {
        // Python packages - priority: uvx, uv, then fallback
        const command =
          this.selectBestTool(['/Users/admin/.local/bin/uvx', '/Users/admin/.local/bin/uv']) ||
          runtimeHint ||
          'python';
        if (command.includes('uvx')) {
          return {
            command,
            args: [...args, identifier],
            env,
          };
        } else if (command.includes('uv')) {
          return {
            command,
            args: ['run', ...args, identifier],
            env,
          };
        } else {
          // Fallback to pip install + run
          return {
            command,
            args: ['-m', 'pip', 'install', identifier, '&&', 'python', '-m', identifier, ...args],
            env,
          };
        }
      }

      case 'docker': {
        // Docker containers
        if (!this.availableTools.get('docker')) {
          throw new Error('Docker is not available but required for this server type');
        }
        return {
          command: 'docker',
          args: [
            'run',
            '--rm',
            '-i',
            ...Object.entries(env).flatMap(([k, v]) => ['-e', `${k}=${v}`]),
            identifier,
            ...args,
          ],
          env,
        };
      }

      case 'github':
        // GitHub repositories via npx
        return {
          command: this.selectBestTool(['npx']) || 'npx',
          args: [...args, identifier],
          env,
        };

      case 'git':
        // Git repositories - clone and run
        throw new Error('Git registry type not yet implemented - requires git clone logic');

      case 'filesystem':
        // Local filesystem paths
        return {
          command: identifier, // Direct path to executable
          args,
          env,
        };

      default:
        throw new Error(`Unsupported registry type for stdio transport: ${registryType}`);
    }
  }

  /**
   * Selects the best available tool from a list of preferences.
   */
  private selectBestTool(preferences: string[]): string | null {
    for (const tool of preferences) {
      const toolName = tool.split('/').pop() || tool; // Extract tool name from path
      if (this.availableTools.get(toolName) || this.availableTools.get(tool)) {
        return tool;
      }
    }
    return null;
  }
}
