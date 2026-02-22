/**
 * Agent Orchestrator API Client
 *
 * A client for interacting with the Agent Orchestrator REST API.
 */

import type {
  Session,
  Log,
  SubagentTranscript,
  SessionsResponse,
  SearchSessionsResponse,
  SessionResponse,
  SessionActionResponse,
  LogsResponse,
  LogResponse,
  SubagentTranscriptsResponse,
  SubagentTranscriptResponse,
  CreateSessionRequest,
  UpdateSessionRequest,
  CreateLogRequest,
  UpdateLogRequest,
  CreateSubagentTranscriptRequest,
  UpdateSubagentTranscriptRequest,
  SessionStatus,
  LogLevel,
  SubagentStatus,
  MCPServerInfo,
  MCPServersResponse,
  AgentRootInfo,
  StopConditionInfo,
  ConfigsResponse,
  SendPushNotificationResponse,
  EnqueuedMessage,
  EnqueuedMessagesResponse,
  EnqueuedMessageResponse,
  EnqueuedMessageInterruptResponse,
  EnqueuedMessageStatus,
  Trigger,
  TriggerType,
  TriggerStatus,
  TriggersResponse,
  TriggerResponse,
  TriggerChannelsResponse,
  CreateTriggerRequest,
  UpdateTriggerRequest,
  Notification,
  NotificationsResponse,
  NotificationResponse,
  NotificationBadgeResponse,
  NotificationMarkAllReadResponse,
  NotificationDismissAllReadResponse,
  HealthReport,
  HealthActionResponse,
  CliStatusResponse,
  CliActionResponse,
  ForkSessionResponse,
  RefreshSessionResponse,
  RefreshAllSessionsResponse,
  BulkArchiveResponse,
  TranscriptResponse,
  TranscriptArchiveStatusResponse,
} from '../types.js';

/** Raw agent root shape as returned by the Rails API */
export interface RawAgentRoot {
  name: string;
  display_name: string;
  description: string;
  url: string;
  default_branch?: string;
  subdirectory?: string;
  custom?: boolean;
  default_stop_condition?: string;
  default?: boolean;
  default_mcp_servers?: string[];
}

/**
 * Raw configs response shape as returned by the Rails API.
 * Note: mcp_servers and stop_conditions field names match our TypeScript
 * interfaces directly. Only agent_roots fields diverge from the API naming.
 */
interface RawConfigsResponse {
  mcp_servers: MCPServerInfo[];
  agent_roots: RawAgentRoot[];
  stop_conditions: StopConditionInfo[];
}

/**
 * Maps a raw API agent root to the normalized AgentRootInfo interface.
 * The `custom` and `default` fields from the API are intentionally omitted
 * as they are not needed by MCP clients.
 */
export function mapAgentRoot(raw: RawAgentRoot): AgentRootInfo {
  return {
    name: raw.name,
    title: raw.display_name,
    description: raw.description,
    git_root: raw.url,
    default_branch: raw.default_branch,
    default_subdirectory: raw.subdirectory,
    default_stop_condition: raw.default_stop_condition,
    default_mcp_servers: raw.default_mcp_servers,
  };
}

/**
 * Interface for the Agent Orchestrator API client.
 * Used for dependency injection and testing.
 */
export interface IAgentOrchestratorClient {
  // Sessions
  listSessions(options?: {
    status?: SessionStatus;
    agent_type?: string;
    show_archived?: boolean;
    page?: number;
    per_page?: number;
  }): Promise<SessionsResponse>;

  searchSessions(
    query: string,
    options?: {
      search_contents?: boolean;
      status?: SessionStatus;
      agent_type?: string;
      show_archived?: boolean;
      page?: number;
      per_page?: number;
    }
  ): Promise<SearchSessionsResponse>;

  getSession(id: string | number, includeTranscript?: boolean): Promise<Session>;

  createSession(data: CreateSessionRequest): Promise<Session>;

  updateSession(id: string | number, data: UpdateSessionRequest): Promise<Session>;

  deleteSession(id: string | number): Promise<void>;

  archiveSession(id: string | number): Promise<Session>;

  unarchiveSession(id: string | number): Promise<Session>;

  followUp(id: string | number, prompt: string): Promise<SessionActionResponse>;

  pauseSession(id: string | number): Promise<SessionActionResponse>;

  restartSession(id: string | number): Promise<SessionActionResponse>;

  changeMcpServers(id: string | number, mcp_servers: string[]): Promise<Session>;

  // Logs
  listLogs(
    sessionId: string | number,
    options?: {
      level?: LogLevel;
      page?: number;
      per_page?: number;
    }
  ): Promise<LogsResponse>;

  getLog(sessionId: string | number, logId: number): Promise<Log>;

  createLog(sessionId: string | number, data: CreateLogRequest): Promise<Log>;

  updateLog(sessionId: string | number, logId: number, data: UpdateLogRequest): Promise<Log>;

  deleteLog(sessionId: string | number, logId: number): Promise<void>;

  // Subagent Transcripts
  listSubagentTranscripts(
    sessionId: string | number,
    options?: {
      status?: SubagentStatus;
      subagent_type?: string;
      page?: number;
      per_page?: number;
    }
  ): Promise<SubagentTranscriptsResponse>;

  getSubagentTranscript(
    sessionId: string | number,
    transcriptId: number,
    includeTranscript?: boolean
  ): Promise<SubagentTranscript>;

  createSubagentTranscript(
    sessionId: string | number,
    data: CreateSubagentTranscriptRequest
  ): Promise<SubagentTranscript>;

  updateSubagentTranscript(
    sessionId: string | number,
    transcriptId: number,
    data: UpdateSubagentTranscriptRequest
  ): Promise<SubagentTranscript>;

  deleteSubagentTranscript(sessionId: string | number, transcriptId: number): Promise<void>;

  // MCP Servers
  getMcpServers(): Promise<MCPServerInfo[]>;

  // Unified Configs
  getConfigs(): Promise<ConfigsResponse>;

  // Notifications
  sendPushNotification(
    sessionId: string | number,
    message: string
  ): Promise<SendPushNotificationResponse>;

  // Session Extensions
  forkSession(id: string | number, messageIndex: number): Promise<ForkSessionResponse>;
  refreshSession(id: string | number): Promise<RefreshSessionResponse>;
  refreshAllSessions(): Promise<RefreshAllSessionsResponse>;
  updateSessionNotes(id: string | number, notes: string): Promise<Session>;
  toggleFavorite(id: string | number): Promise<Session & { favorited: boolean }>;
  bulkArchiveSessions(sessionIds: number[]): Promise<BulkArchiveResponse>;
  getTranscript(id: string | number, format?: 'text' | 'json'): Promise<TranscriptResponse>;

  // Enqueued Messages
  listEnqueuedMessages(
    sessionId: string | number,
    options?: {
      status?: EnqueuedMessageStatus;
      page?: number;
      per_page?: number;
    }
  ): Promise<EnqueuedMessagesResponse>;
  getEnqueuedMessage(sessionId: string | number, messageId: number): Promise<EnqueuedMessage>;
  createEnqueuedMessage(
    sessionId: string | number,
    data: { content: string; stop_condition?: string }
  ): Promise<EnqueuedMessage>;
  updateEnqueuedMessage(
    sessionId: string | number,
    messageId: number,
    data: { content?: string; stop_condition?: string }
  ): Promise<EnqueuedMessage>;
  deleteEnqueuedMessage(sessionId: string | number, messageId: number): Promise<void>;
  reorderEnqueuedMessage(
    sessionId: string | number,
    messageId: number,
    position: number
  ): Promise<EnqueuedMessage>;
  interruptEnqueuedMessage(
    sessionId: string | number,
    messageId: number
  ): Promise<EnqueuedMessageInterruptResponse>;

  // Triggers
  listTriggers(options?: {
    trigger_type?: TriggerType;
    status?: TriggerStatus;
    page?: number;
    per_page?: number;
  }): Promise<TriggersResponse>;
  getTrigger(id: number): Promise<TriggerResponse>;
  createTrigger(data: CreateTriggerRequest): Promise<Trigger>;
  updateTrigger(id: number, data: UpdateTriggerRequest): Promise<Trigger>;
  deleteTrigger(id: number): Promise<void>;
  toggleTrigger(id: number): Promise<Trigger>;
  getTriggerChannels(): Promise<TriggerChannelsResponse>;

  // Notification Management
  listNotifications(options?: {
    status?: string;
    page?: number;
    per_page?: number;
  }): Promise<NotificationsResponse>;
  getNotification(id: number): Promise<Notification>;
  getNotificationBadge(): Promise<NotificationBadgeResponse>;
  markNotificationRead(id: number): Promise<Notification>;
  markAllNotificationsRead(): Promise<NotificationMarkAllReadResponse>;
  dismissNotification(id: number): Promise<void>;
  dismissAllReadNotifications(): Promise<NotificationDismissAllReadResponse>;

  // Health
  getHealth(): Promise<HealthReport>;
  cleanupProcesses(): Promise<HealthActionResponse>;
  retrySessions(sessionIds?: number[]): Promise<HealthActionResponse>;
  archiveOldSessions(days?: number): Promise<HealthActionResponse>;

  // CLIs
  getCliStatus(): Promise<CliStatusResponse>;
  refreshCli(): Promise<CliActionResponse>;
  clearCliCache(): Promise<CliActionResponse>;

  // Transcript Archive
  getTranscriptArchiveStatus(): Promise<TranscriptArchiveStatusResponse>;
  getTranscriptArchiveDownloadUrl(): { url: string; apiKey: string };
}

/** Default timeout for API requests in milliseconds */
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Implementation of the Agent Orchestrator API client.
 */
export class AgentOrchestratorClient implements IAgentOrchestratorClient {
  private baseUrl: string;
  private apiKey: string;
  private timeoutMs: number;

  constructor(baseUrl: string, apiKey: string, timeoutMs: number = DEFAULT_TIMEOUT_MS) {
    // Validate inputs
    if (!baseUrl || baseUrl.trim().length === 0) {
      throw new Error('Base URL cannot be empty');
    }
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error('API key cannot be empty');
    }

    // Remove trailing slash if present
    this.baseUrl = baseUrl.trim().replace(/\/$/, '');
    this.apiKey = apiKey.trim();
    this.timeoutMs = timeoutMs;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}/api/v1${path}`);

    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    const headers: Record<string, string> = {
      'X-API-Key': this.apiKey,
      'Content-Type': 'application/json',
    };

    // Set up timeout with AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    const options: RequestInit = {
      method,
      headers,
      signal: controller.signal,
    };

    if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    let response: Response;
    try {
      response = await fetch(url.toString(), options);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage: string;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorText;
      } catch {
        errorMessage = errorText;
      }
      throw new Error(`API Error (${response.status}): ${errorMessage}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as T;
  }

  // Sessions
  async listSessions(options?: {
    status?: SessionStatus;
    agent_type?: string;
    show_archived?: boolean;
    page?: number;
    per_page?: number;
  }): Promise<SessionsResponse> {
    return this.request<SessionsResponse>('GET', '/sessions', undefined, options);
  }

  async searchSessions(
    query: string,
    options?: {
      search_contents?: boolean;
      status?: SessionStatus;
      agent_type?: string;
      show_archived?: boolean;
      page?: number;
      per_page?: number;
    }
  ): Promise<SearchSessionsResponse> {
    return this.request<SearchSessionsResponse>('GET', '/sessions/search', undefined, {
      q: query,
      ...options,
    });
  }

  async getSession(id: string | number, includeTranscript?: boolean): Promise<Session> {
    const response = await this.request<SessionResponse>('GET', `/sessions/${id}`, undefined, {
      include_transcript: includeTranscript,
    });
    return response.session;
  }

  async createSession(data: CreateSessionRequest): Promise<Session> {
    const response = await this.request<SessionResponse>('POST', '/sessions', data);
    return response.session;
  }

  async updateSession(id: string | number, data: UpdateSessionRequest): Promise<Session> {
    const response = await this.request<SessionResponse>('PATCH', `/sessions/${id}`, data);
    return response.session;
  }

  async deleteSession(id: string | number): Promise<void> {
    await this.request<void>('DELETE', `/sessions/${id}`);
  }

  async archiveSession(id: string | number): Promise<Session> {
    const response = await this.request<SessionResponse>('POST', `/sessions/${id}/archive`);
    return response.session;
  }

  async unarchiveSession(id: string | number): Promise<Session> {
    const response = await this.request<SessionResponse>('POST', `/sessions/${id}/unarchive`);
    return response.session;
  }

  async followUp(id: string | number, prompt: string): Promise<SessionActionResponse> {
    return this.request<SessionActionResponse>('POST', `/sessions/${id}/follow_up`, { prompt });
  }

  async pauseSession(id: string | number): Promise<SessionActionResponse> {
    return this.request<SessionActionResponse>('POST', `/sessions/${id}/pause`);
  }

  async restartSession(id: string | number): Promise<SessionActionResponse> {
    return this.request<SessionActionResponse>('POST', `/sessions/${id}/restart`);
  }

  async changeMcpServers(id: string | number, mcp_servers: string[]): Promise<Session> {
    const response = await this.request<SessionResponse>('PATCH', `/sessions/${id}`, {
      mcp_servers,
    });
    return response.session;
  }

  // Logs
  async listLogs(
    sessionId: string | number,
    options?: {
      level?: LogLevel;
      page?: number;
      per_page?: number;
    }
  ): Promise<LogsResponse> {
    return this.request<LogsResponse>('GET', `/sessions/${sessionId}/logs`, undefined, options);
  }

  async getLog(sessionId: string | number, logId: number): Promise<Log> {
    const response = await this.request<LogResponse>('GET', `/sessions/${sessionId}/logs/${logId}`);
    return response.log;
  }

  async createLog(sessionId: string | number, data: CreateLogRequest): Promise<Log> {
    const response = await this.request<LogResponse>('POST', `/sessions/${sessionId}/logs`, data);
    return response.log;
  }

  async updateLog(sessionId: string | number, logId: number, data: UpdateLogRequest): Promise<Log> {
    const response = await this.request<LogResponse>(
      'PATCH',
      `/sessions/${sessionId}/logs/${logId}`,
      data
    );
    return response.log;
  }

  async deleteLog(sessionId: string | number, logId: number): Promise<void> {
    await this.request<void>('DELETE', `/sessions/${sessionId}/logs/${logId}`);
  }

  // Subagent Transcripts
  async listSubagentTranscripts(
    sessionId: string | number,
    options?: {
      status?: SubagentStatus;
      subagent_type?: string;
      page?: number;
      per_page?: number;
    }
  ): Promise<SubagentTranscriptsResponse> {
    return this.request<SubagentTranscriptsResponse>(
      'GET',
      `/sessions/${sessionId}/subagent_transcripts`,
      undefined,
      options
    );
  }

  async getSubagentTranscript(
    sessionId: string | number,
    transcriptId: number,
    includeTranscript?: boolean
  ): Promise<SubagentTranscript> {
    const response = await this.request<SubagentTranscriptResponse>(
      'GET',
      `/sessions/${sessionId}/subagent_transcripts/${transcriptId}`,
      undefined,
      { include_transcript: includeTranscript }
    );
    return response.subagent_transcript;
  }

  async createSubagentTranscript(
    sessionId: string | number,
    data: CreateSubagentTranscriptRequest
  ): Promise<SubagentTranscript> {
    const response = await this.request<SubagentTranscriptResponse>(
      'POST',
      `/sessions/${sessionId}/subagent_transcripts`,
      data
    );
    return response.subagent_transcript;
  }

  async updateSubagentTranscript(
    sessionId: string | number,
    transcriptId: number,
    data: UpdateSubagentTranscriptRequest
  ): Promise<SubagentTranscript> {
    const response = await this.request<SubagentTranscriptResponse>(
      'PATCH',
      `/sessions/${sessionId}/subagent_transcripts/${transcriptId}`,
      data
    );
    return response.subagent_transcript;
  }

  async deleteSubagentTranscript(sessionId: string | number, transcriptId: number): Promise<void> {
    await this.request<void>(
      'DELETE',
      `/sessions/${sessionId}/subagent_transcripts/${transcriptId}`
    );
  }

  // MCP Servers
  async getMcpServers(): Promise<MCPServerInfo[]> {
    const response = await this.request<MCPServersResponse>('GET', '/mcp_servers');
    return response.mcp_servers;
  }

  // Unified Configs
  async getConfigs(): Promise<ConfigsResponse> {
    const raw = await this.request<RawConfigsResponse>('GET', '/configs');
    return {
      mcp_servers: raw.mcp_servers,
      agent_roots: raw.agent_roots.map(mapAgentRoot),
      stop_conditions: raw.stop_conditions,
    };
  }

  // Notifications
  async sendPushNotification(
    sessionId: string | number,
    message: string
  ): Promise<SendPushNotificationResponse> {
    return this.request<SendPushNotificationResponse>('POST', '/notifications/push', {
      session_id: sessionId,
      message,
    });
  }

  // Session Extensions
  async forkSession(id: string | number, messageIndex: number): Promise<ForkSessionResponse> {
    return this.request<ForkSessionResponse>('POST', `/sessions/${id}/fork`, {
      message_index: messageIndex,
    });
  }

  async refreshSession(id: string | number): Promise<RefreshSessionResponse> {
    return this.request<RefreshSessionResponse>('POST', `/sessions/${id}/refresh`);
  }

  async refreshAllSessions(): Promise<RefreshAllSessionsResponse> {
    return this.request<RefreshAllSessionsResponse>('POST', '/sessions/refresh_all');
  }

  async updateSessionNotes(id: string | number, notes: string): Promise<Session> {
    const response = await this.request<SessionResponse>('PATCH', `/sessions/${id}/notes`, {
      session_notes: notes,
    });
    return response.session;
  }

  async toggleFavorite(id: string | number): Promise<Session & { favorited: boolean }> {
    return this.request<Session & { favorited: boolean }>(
      'POST',
      `/sessions/${id}/toggle_favorite`
    );
  }

  async bulkArchiveSessions(sessionIds: number[]): Promise<BulkArchiveResponse> {
    return this.request<BulkArchiveResponse>('POST', '/sessions/bulk_archive', {
      session_ids: sessionIds,
    });
  }

  async getTranscript(
    id: string | number,
    format: 'text' | 'json' = 'json'
  ): Promise<TranscriptResponse> {
    return this.request<TranscriptResponse>('GET', `/sessions/${id}/transcript`, undefined, {
      format,
    });
  }

  // Enqueued Messages
  async listEnqueuedMessages(
    sessionId: string | number,
    options?: {
      status?: EnqueuedMessageStatus;
      page?: number;
      per_page?: number;
    }
  ): Promise<EnqueuedMessagesResponse> {
    return this.request<EnqueuedMessagesResponse>(
      'GET',
      `/sessions/${sessionId}/enqueued_messages`,
      undefined,
      options
    );
  }

  async getEnqueuedMessage(
    sessionId: string | number,
    messageId: number
  ): Promise<EnqueuedMessage> {
    const response = await this.request<EnqueuedMessageResponse>(
      'GET',
      `/sessions/${sessionId}/enqueued_messages/${messageId}`
    );
    return response.enqueued_message;
  }

  async createEnqueuedMessage(
    sessionId: string | number,
    data: { content: string; stop_condition?: string }
  ): Promise<EnqueuedMessage> {
    const response = await this.request<EnqueuedMessageResponse>(
      'POST',
      `/sessions/${sessionId}/enqueued_messages`,
      data
    );
    return response.enqueued_message;
  }

  async updateEnqueuedMessage(
    sessionId: string | number,
    messageId: number,
    data: { content?: string; stop_condition?: string }
  ): Promise<EnqueuedMessage> {
    const response = await this.request<EnqueuedMessageResponse>(
      'PATCH',
      `/sessions/${sessionId}/enqueued_messages/${messageId}`,
      data
    );
    return response.enqueued_message;
  }

  async deleteEnqueuedMessage(sessionId: string | number, messageId: number): Promise<void> {
    await this.request<void>('DELETE', `/sessions/${sessionId}/enqueued_messages/${messageId}`);
  }

  async reorderEnqueuedMessage(
    sessionId: string | number,
    messageId: number,
    position: number
  ): Promise<EnqueuedMessage> {
    const response = await this.request<EnqueuedMessageResponse>(
      'PATCH',
      `/sessions/${sessionId}/enqueued_messages/${messageId}/reorder`,
      { position }
    );
    return response.enqueued_message;
  }

  async interruptEnqueuedMessage(
    sessionId: string | number,
    messageId: number
  ): Promise<EnqueuedMessageInterruptResponse> {
    return this.request<EnqueuedMessageInterruptResponse>(
      'POST',
      `/sessions/${sessionId}/enqueued_messages/${messageId}/interrupt`
    );
  }

  // Triggers
  async listTriggers(options?: {
    trigger_type?: TriggerType;
    status?: TriggerStatus;
    page?: number;
    per_page?: number;
  }): Promise<TriggersResponse> {
    return this.request<TriggersResponse>('GET', '/triggers', undefined, options);
  }

  async getTrigger(id: number): Promise<TriggerResponse> {
    return this.request<TriggerResponse>('GET', `/triggers/${id}`);
  }

  async createTrigger(data: CreateTriggerRequest): Promise<Trigger> {
    const response = await this.request<TriggerResponse>('POST', '/triggers', data);
    return response.trigger;
  }

  async updateTrigger(id: number, data: UpdateTriggerRequest): Promise<Trigger> {
    const response = await this.request<TriggerResponse>('PATCH', `/triggers/${id}`, data);
    return response.trigger;
  }

  async deleteTrigger(id: number): Promise<void> {
    await this.request<void>('DELETE', `/triggers/${id}`);
  }

  async toggleTrigger(id: number): Promise<Trigger> {
    const response = await this.request<TriggerResponse>('POST', `/triggers/${id}/toggle`);
    return response.trigger;
  }

  async getTriggerChannels(): Promise<TriggerChannelsResponse> {
    return this.request<TriggerChannelsResponse>('GET', '/triggers/channels');
  }

  // Notification Management
  async listNotifications(options?: {
    status?: string;
    page?: number;
    per_page?: number;
  }): Promise<NotificationsResponse> {
    return this.request<NotificationsResponse>('GET', '/notifications', undefined, options);
  }

  async getNotification(id: number): Promise<Notification> {
    const response = await this.request<NotificationResponse>('GET', `/notifications/${id}`);
    return response.notification;
  }

  async getNotificationBadge(): Promise<NotificationBadgeResponse> {
    return this.request<NotificationBadgeResponse>('GET', '/notifications/badge');
  }

  async markNotificationRead(id: number): Promise<Notification> {
    const response = await this.request<NotificationResponse>(
      'PATCH',
      `/notifications/${id}/mark_read`
    );
    return response.notification;
  }

  async markAllNotificationsRead(): Promise<NotificationMarkAllReadResponse> {
    return this.request<NotificationMarkAllReadResponse>('PATCH', '/notifications/mark_all_read');
  }

  async dismissNotification(id: number): Promise<void> {
    await this.request<void>('DELETE', `/notifications/${id}`);
  }

  async dismissAllReadNotifications(): Promise<NotificationDismissAllReadResponse> {
    return this.request<NotificationDismissAllReadResponse>(
      'DELETE',
      '/notifications/dismiss_all_read'
    );
  }

  // Health
  async getHealth(): Promise<HealthReport> {
    return this.request<HealthReport>('GET', '/health');
  }

  async cleanupProcesses(): Promise<HealthActionResponse> {
    return this.request<HealthActionResponse>('POST', '/health/cleanup_processes');
  }

  async retrySessions(sessionIds?: number[]): Promise<HealthActionResponse> {
    return this.request<HealthActionResponse>(
      'POST',
      '/health/retry_sessions',
      sessionIds ? { session_ids: sessionIds } : undefined
    );
  }

  async archiveOldSessions(days?: number): Promise<HealthActionResponse> {
    return this.request<HealthActionResponse>(
      'POST',
      '/health/archive_old',
      days ? { days } : undefined
    );
  }

  // CLIs
  async getCliStatus(): Promise<CliStatusResponse> {
    return this.request<CliStatusResponse>('GET', '/clis/status');
  }

  async refreshCli(): Promise<CliActionResponse> {
    return this.request<CliActionResponse>('POST', '/clis/refresh');
  }

  async clearCliCache(): Promise<CliActionResponse> {
    return this.request<CliActionResponse>('POST', '/clis/clear_cache');
  }

  // Transcript Archive
  async getTranscriptArchiveStatus(): Promise<TranscriptArchiveStatusResponse> {
    return this.request<TranscriptArchiveStatusResponse>('GET', '/transcript_archive/status');
  }

  getTranscriptArchiveDownloadUrl(): { url: string; apiKey: string } {
    return {
      url: `${this.baseUrl}/api/v1/transcript_archive/download`,
      apiKey: this.apiKey,
    };
  }
}
