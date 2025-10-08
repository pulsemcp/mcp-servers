import { ChildProcess, spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AgentState, ServerConfig, TranscriptEntry } from '../types.js';
import { createLogger } from '../logging.js';

const logger = createLogger('claude-code-client');

// Timeout constants (in milliseconds)
const INIT_TIMEOUT_MS = 30000; // 30 seconds for agent initialization
const DEFAULT_COMMAND_TIMEOUT_MS = 60000; // 60 seconds for general commands
const DEFAULT_CHAT_TIMEOUT_MS = 300000; // 5 minutes for chat operations
const GRACEFUL_SHUTDOWN_DELAY_MS = 5000; // 5 seconds to wait for graceful shutdown

// Max turns constant
const INIT_MAX_TURNS = 1; // Single turn for initialization

export interface IClaudeCodeClient {
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
      await fs.writeFile(join(workingDir, '.mcp.json'), JSON.stringify({ servers: {} }, null, 2));

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

      // Create empty transcript
      const transcriptFile = join(workingDir, 'transcript.json');
      await fs.writeFile(transcriptFile, JSON.stringify([], null, 2));

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
        servers: Record<string, { command: string; args: string[]; env: Record<string, string> }>;
      } = { servers: {} };

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

        // For now, assume npm packages
        const npmPackage = serverConfig.packages.find((p: { type: string }) => p.type === 'npm');
        if (npmPackage) {
          // Merge with custom configs and secrets
          const env = {
            ...npmPackage.env,
            ...(serverConfigs?.[serverName]?.env || {}),
            ...(secrets[serverName] || {}),
          };

          mcpConfig.servers[serverName] = {
            command: npmPackage.command,
            args: npmPackage.args || [],
            env,
          };

          installations.push({
            serverName,
            status: 'success',
          });
        } else {
          installations.push({
            serverName,
            status: 'failed',
            error: 'No npm package found for server',
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

      // Update transcript
      await this.appendToTranscript({
        role: 'user',
        content: prompt,
        timestamp: new Date(startTime).toISOString(),
      });

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

      await this.appendToTranscript({
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
        metadata: { tokensUsed },
      });

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

  async inspectTranscript(format: 'markdown' | 'json' = 'markdown'): Promise<{
    transcriptUri: string;
    metadata: {
      messageCount: number;
      lastUpdated: string;
    };
  }> {
    try {
      if (!this.currentAgent.workingDir) {
        throw new Error('No agent initialized');
      }

      const transcriptPath = join(this.currentAgent.workingDir, 'transcript.json');
      const transcript: TranscriptEntry[] = JSON.parse(await fs.readFile(transcriptPath, 'utf-8'));

      const outputPath = join(
        this.currentAgent.workingDir,
        format === 'markdown' ? 'transcript.md' : 'transcript.json'
      );

      if (format === 'markdown') {
        const markdown = transcript
          .map((entry) => {
            let content = `## ${entry.role.charAt(0).toUpperCase() + entry.role.slice(1)} - ${entry.timestamp}\n\n${entry.content}`;

            if (entry.metadata?.toolCalls) {
              content += '\n\n### Tool Calls:\n';
              entry.metadata.toolCalls.forEach((call) => {
                content += `- **${call.name}**: ${JSON.stringify(call.arguments)}\n`;
              });
            }

            return content;
          })
          .join('\n\n---\n\n');

        await fs.writeFile(outputPath, markdown);
      } else {
        await fs.writeFile(outputPath, JSON.stringify(transcript, null, 2));
      }

      return {
        transcriptUri: `file://${outputPath}`,
        metadata: {
          messageCount: transcript.length,
          lastUpdated: transcript[transcript.length - 1]?.timestamp || new Date().toISOString(),
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

  private async appendToTranscript(entry: TranscriptEntry): Promise<void> {
    if (!this.currentAgent.workingDir) {
      return;
    }

    const transcriptFile = join(this.currentAgent.workingDir, 'transcript.json');

    try {
      const transcript: TranscriptEntry[] = JSON.parse(await fs.readFile(transcriptFile, 'utf-8'));
      transcript.push(entry);
      await fs.writeFile(transcriptFile, JSON.stringify(transcript, null, 2));
    } catch {
      // Create new transcript if it doesn't exist
      await fs.writeFile(transcriptFile, JSON.stringify([entry], null, 2));
    }
  }
}
