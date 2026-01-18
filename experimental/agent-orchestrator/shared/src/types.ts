/**
 * Agent Orchestrator API Types
 */

// Session statuses
export type SessionStatus = 'waiting' | 'running' | 'needs_input' | 'failed' | 'archived';

// Log levels
export type LogLevel = 'info' | 'error' | 'debug' | 'warning' | 'verbose';

// Subagent statuses
export type SubagentStatus = 'running' | 'completed' | 'failed';

// Pagination response
export interface Pagination {
  page: number;
  per_page: number;
  total_count: number;
  total_pages: number;
}

// Session object
export interface Session {
  id: number;
  slug: string | null;
  title: string;
  status: SessionStatus;
  agent_type: string;
  prompt: string | null;
  git_root: string | null;
  branch: string | null;
  subdirectory: string | null;
  execution_provider: string;
  stop_condition: string | null;
  mcp_servers: string[];
  config: Record<string, unknown>;
  metadata: Record<string, unknown>;
  custom_metadata: Record<string, unknown>;
  session_id: string | null;
  job_id: string | null;
  running_job_id: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  transcript?: string;
}

// Log object
export interface Log {
  id: number;
  session_id: number;
  content: string;
  level: LogLevel;
  created_at: string;
  updated_at: string;
}

// Subagent transcript object
export interface SubagentTranscript {
  id: number;
  session_id: number;
  agent_id: string;
  tool_use_id: string | null;
  transcript?: string;
  filename: string | null;
  message_count: number | null;
  subagent_type: string | null;
  description: string | null;
  status: SubagentStatus | null;
  duration_ms: number | null;
  total_tokens: number | null;
  tool_use_count: number | null;
  formatted_duration: string | null;
  formatted_tokens: string | null;
  display_label: string | null;
  created_at: string;
  updated_at: string;
}

// API responses
export interface SessionsResponse {
  sessions: Session[];
  pagination: Pagination;
}

export interface SearchSessionsResponse {
  query: string;
  search_contents: boolean;
  sessions: Session[];
  pagination: Pagination;
}

export interface SessionResponse {
  session: Session;
}

export interface SessionActionResponse {
  session: Session;
  message?: string;
}

export interface LogsResponse {
  logs: Log[];
  pagination: Pagination;
}

export interface LogResponse {
  log: Log;
}

export interface SubagentTranscriptsResponse {
  subagent_transcripts: SubagentTranscript[];
  pagination: Pagination;
}

export interface SubagentTranscriptResponse {
  subagent_transcript: SubagentTranscript;
}

// API error response
export interface ApiError {
  error: string;
  message?: string;
  messages?: string[];
}

// MCP Server info
export interface MCPServerInfo {
  name: string;
  title: string;
  description: string;
}

// MCP Servers response
export interface MCPServersResponse {
  mcp_servers: MCPServerInfo[];
}

// Agent Root info (preconfigured repository settings)
export interface AgentRootInfo {
  name: string;
  title: string;
  description: string;
  git_root: string;
  default_branch?: string;
  default_subdirectory?: string;
  default_stop_condition?: string;
  default_mcp_servers?: string[];
}

// Stop Condition info (session completion criteria)
export interface StopConditionInfo {
  id: string;
  name: string;
  description: string;
}

// Unified configs response (from GET /api/v1/configs)
export interface ConfigsResponse {
  mcp_servers: MCPServerInfo[];
  agent_roots: AgentRootInfo[];
  stop_conditions: StopConditionInfo[];
}

// Create session request
export interface CreateSessionRequest {
  agent_type?: string;
  prompt?: string;
  git_root?: string;
  branch?: string;
  subdirectory?: string;
  title?: string;
  slug?: string;
  stop_condition?: string;
  execution_provider?: string;
  mcp_servers?: string[];
  config?: Record<string, unknown>;
  custom_metadata?: Record<string, unknown>;
}

// Update session request
export interface UpdateSessionRequest {
  title?: string;
  slug?: string;
  stop_condition?: string;
  mcp_servers?: string[];
  custom_metadata?: Record<string, unknown>;
}

// Create log request
export interface CreateLogRequest {
  content: string;
  level: LogLevel;
}

// Update log request
export interface UpdateLogRequest {
  content?: string;
  level?: LogLevel;
}

// Create subagent transcript request
export interface CreateSubagentTranscriptRequest {
  agent_id: string;
  tool_use_id?: string;
  transcript?: string;
  filename?: string;
  message_count?: number;
  subagent_type?: string;
  description?: string;
  status?: SubagentStatus;
  duration_ms?: number;
  total_tokens?: number;
  tool_use_count?: number;
}

// Update subagent transcript request
export interface UpdateSubagentTranscriptRequest {
  agent_id?: string;
  tool_use_id?: string;
  transcript?: string;
  filename?: string;
  message_count?: number;
  subagent_type?: string;
  description?: string;
  status?: SubagentStatus;
  duration_ms?: number;
  total_tokens?: number;
  tool_use_count?: number;
}
