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
}
