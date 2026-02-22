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

// Push notification response (from POST /api/v1/notifications/push)
export interface SendPushNotificationResponse {
  success: boolean;
  message: string;
  session_id: number;
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

// =============================================================================
// Enqueued Messages
// =============================================================================

export type EnqueuedMessageStatus = 'pending' | 'processing' | 'sent';

export interface EnqueuedMessage {
  id: number;
  session_id: number;
  content: string;
  stop_condition: string | null;
  position: number;
  status: EnqueuedMessageStatus;
  created_at: string;
  updated_at: string;
}

export interface EnqueuedMessagesResponse {
  enqueued_messages: EnqueuedMessage[];
  pagination: Pagination;
}

export interface EnqueuedMessageResponse {
  enqueued_message: EnqueuedMessage;
}

export interface EnqueuedMessageInterruptResponse {
  session: Session;
  message: string;
}

// =============================================================================
// Triggers
// =============================================================================

export type TriggerType = 'slack' | 'schedule';
export type TriggerStatus = 'enabled' | 'disabled';

export interface Trigger {
  id: number;
  name: string;
  trigger_type: TriggerType;
  status: TriggerStatus;
  agent_root_name: string;
  prompt_template: string;
  stop_condition: string | null;
  reuse_session: boolean;
  mcp_servers: string[];
  configuration: Record<string, unknown>;
  schedule_description: string | null;
  last_session_id: number | null;
  last_triggered_at: string | null;
  last_polled_at: string | null;
  sessions_created_count: number;
  created_at: string;
  updated_at: string;
}

export interface TriggersResponse {
  triggers: Trigger[];
  pagination: Pagination;
}

export interface TriggerResponse {
  trigger: Trigger;
  recent_sessions?: Session[];
}

export interface TriggerChannelsResponse {
  channels: Array<{
    id: string;
    name: string;
    is_private: boolean;
    num_members: number;
  }>;
}

export interface CreateTriggerRequest {
  name: string;
  trigger_type: TriggerType;
  agent_root_name: string;
  prompt_template: string;
  status?: TriggerStatus;
  stop_condition?: string;
  reuse_session?: boolean;
  mcp_servers?: string[];
  configuration?: Record<string, unknown>;
}

export interface UpdateTriggerRequest {
  name?: string;
  trigger_type?: TriggerType;
  agent_root_name?: string;
  prompt_template?: string;
  status?: TriggerStatus;
  stop_condition?: string;
  reuse_session?: boolean;
  mcp_servers?: string[];
  configuration?: Record<string, unknown>;
}

// =============================================================================
// Notifications
// =============================================================================

export interface Notification {
  id: number;
  session_id: number;
  notification_type: string;
  read: boolean;
  stale: boolean;
  created_at: string;
  updated_at: string;
  session?: {
    id: number;
    slug: string | null;
    title: string;
    status: string;
  };
}

export interface NotificationsResponse {
  notifications: Notification[];
  pagination: Pagination;
}

export interface NotificationResponse {
  notification: Notification;
}

export interface NotificationBadgeResponse {
  pending_count: number;
}

export interface NotificationMarkAllReadResponse {
  marked_count: number;
  pending_count: number;
}

export interface NotificationDismissAllReadResponse {
  dismissed_count: number;
  pending_count: number;
}

// =============================================================================
// Health
// =============================================================================

export interface HealthReport {
  health_report: Record<string, unknown>;
  timestamp: string;
  rails_env: string;
  ruby_version: string;
}

export interface HealthActionResponse {
  [key: string]: unknown;
}

// =============================================================================
// CLIs
// =============================================================================

export interface CliStatusResponse {
  cli_status: Record<string, unknown>;
  unauthenticated_count: number;
}

export interface CliActionResponse {
  queued: boolean;
  message: string;
  [key: string]: unknown;
}

// =============================================================================
// Session Extensions
// =============================================================================

export interface ForkSessionResponse {
  session: Session;
  message: string;
}

export interface RefreshSessionResponse {
  session: Session;
  message: string;
}

export interface RefreshAllSessionsResponse {
  message: string;
  refreshed: number;
  restarted: number;
  continued: number;
  errors: number;
}

export interface BulkArchiveResponse {
  archived_count: number;
  errors: Array<{ id: number; error: string }>;
}

export interface TranscriptResponse {
  transcript_text: string;
}

// =============================================================================
// Transcript Archive
// =============================================================================

export interface TranscriptArchiveStatusResponse {
  generated_at: string;
  session_count: number;
  file_size_bytes: number;
}
