import { z } from 'zod';

// Agent state schema
export const AgentStateSchema = z.object({
  sessionId: z.string(),
  status: z.enum(['idle', 'working']),
  systemPrompt: z.string(),
  installedServers: z.array(z.string()),
  createdAt: z.string(),
  lastActiveAt: z.string(),
  workingDirectory: z.string(),
});

export type AgentState = z.infer<typeof AgentStateSchema>;

// Server info from servers.json
export const ServerConfigSchema = z.object({
  name: z.string(),
  description: z.string(),
  version: z.string(),
  repository: z
    .object({
      url: z.string(),
      source: z.enum(['github', 'gitlab', 'other']).optional(),
    })
    .optional(),
  packages: z.array(
    z.object({
      type: z.enum(['npm', 'python', 'binary']),
      name: z.string(),
      command: z.string(),
      args: z.array(z.string()).optional(),
      env: z.record(z.string()).optional(),
    })
  ),
});

export type ServerConfig = z.infer<typeof ServerConfigSchema>;

// Conversation transcript entry
export const TranscriptEntrySchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.string(),
  metadata: z
    .object({
      toolCalls: z
        .array(
          z.object({
            name: z.string(),
            arguments: z.any(),
            result: z.any(),
          })
        )
        .optional(),
      tokensUsed: z.number().optional(),
    })
    .optional(),
});

export type TranscriptEntry = z.infer<typeof TranscriptEntrySchema>;

// Tool schemas
export const InitAgentSchema = z.object({
  system_prompt: z.string().describe('Custom system prompt for the subagent'),
});

export const FindServersSchema = z.object({
  task_prompt: z.string().describe('Description of the task to accomplish'),
});

export const InstallServersSchema = z.object({
  server_names: z
    .array(z.string())
    .describe('Names of servers to install (from find_servers output)'),
  server_configs: z
    .record(z.any())
    .optional()
    .describe('Optional: custom configurations for servers'),
});

export const ChatSchema = z.object({
  prompt: z.string().describe('Message/task to send to the subagent'),
  timeout: z
    .number()
    .optional()
    .default(300000)
    .describe('Optional: timeout in milliseconds (default: 300000)'),
});

export const InspectTranscriptSchema = z.object({
  format: z
    .enum(['markdown', 'json'])
    .optional()
    .default('markdown')
    .describe('Optional: transcript format (default: markdown)'),
});

export const StopAgentSchema = z.object({
  force: z
    .boolean()
    .optional()
    .default(false)
    .describe('Optional: force kill if graceful shutdown fails (default: false)'),
});

export const GetServerCapabilitiesSchema = z.object({
  server_names: z.array(z.string()).describe('Names of servers to query'),
});

// Response types
export interface InitAgentResponse {
  sessionId: string;
  status: 'idle' | 'working';
  stateUri: string;
}

export interface FindServersResponse {
  servers: Array<{
    name: string;
    rationale: string;
  }>;
}

export interface InstallServersResponse {
  installations: Array<{
    serverName: string;
    status: 'success' | 'failed';
    error?: string;
  }>;
  mcpConfigPath: string;
}

export interface ChatResponse {
  response: string;
  metadata: {
    tokensUsed?: number;
    duration: number;
    timestamp: string;
  };
}

export interface InspectTranscriptResponse {
  transcriptUri: string;
  metadata: {
    messageCount: number;
    lastUpdated: string;
  };
}

export interface StopAgentResponse {
  status: 'stopped' | 'force_killed' | 'failed';
  finalState: AgentState;
}

export interface ServerCapability {
  tools?: string[];
  resources?: string[];
  prompts?: string[];
}

export interface GetServerCapabilitiesResponse {
  servers: Array<{
    name: string;
    description: string;
    capabilities: ServerCapability;
  }>;
}
