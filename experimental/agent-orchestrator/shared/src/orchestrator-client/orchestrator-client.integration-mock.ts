/**
 * Integration mock for the Agent Orchestrator API client.
 *
 * Used in integration tests to simulate API responses without hitting real endpoints.
 */

import type { IAgentOrchestratorClient } from './orchestrator-client.js';
import type {
  Session,
  Log,
  SubagentTranscript,
  SessionsResponse,
  SearchSessionsResponse,
  SessionActionResponse,
  LogsResponse,
  SubagentTranscriptsResponse,
  CreateSessionRequest,
  UpdateSessionRequest,
  CreateLogRequest,
  UpdateLogRequest,
  CreateSubagentTranscriptRequest,
  UpdateSubagentTranscriptRequest,
  SessionStatus,
  LogLevel,
  SubagentStatus,
} from '../types.js';

interface MockData {
  sessions?: Session[];
  logs?: Log[];
  subagentTranscripts?: SubagentTranscript[];
}

/**
 * Creates a mock Agent Orchestrator client for integration testing.
 */
export function createIntegrationMockOrchestratorClient(
  initialMockData?: MockData
): IAgentOrchestratorClient & { mockData: MockData } {
  const mockData: MockData = {
    sessions: initialMockData?.sessions || [
      {
        id: 1,
        slug: 'test-session-1',
        title: 'Test Session 1',
        status: 'running',
        agent_type: 'claude_code',
        prompt: 'Test prompt',
        git_root: 'https://github.com/example/repo.git',
        branch: 'main',
        subdirectory: null,
        execution_provider: 'local_filesystem',
        stop_condition: null,
        mcp_servers: ['github-development'],
        config: {},
        metadata: { clone_path: 'repo-main-123' },
        custom_metadata: {},
        session_id: 'abc123',
        job_id: 'job_456',
        running_job_id: null,
        archived_at: null,
        created_at: '2025-01-15T14:30:00Z',
        updated_at: '2025-01-15T14:35:00Z',
      },
    ],
    logs: initialMockData?.logs || [
      {
        id: 1,
        session_id: 1,
        content: 'Agent started',
        level: 'info',
        created_at: '2025-01-15T14:30:00Z',
        updated_at: '2025-01-15T14:30:00Z',
      },
    ],
    subagentTranscripts: initialMockData?.subagentTranscripts || [
      {
        id: 1,
        session_id: 1,
        agent_id: 'agent-abc123',
        tool_use_id: 'tool-xyz789',
        filename: 'transcript_001.jsonl',
        message_count: 15,
        subagent_type: 'explore',
        description: 'Exploring authentication codebase',
        status: 'completed',
        duration_ms: 45000,
        total_tokens: 12500,
        tool_use_count: 8,
        formatted_duration: '45s',
        formatted_tokens: '12.5k',
        display_label: 'Exploring authentication codebase',
        created_at: '2025-01-15T14:31:00Z',
        updated_at: '2025-01-15T14:31:45Z',
      },
    ],
  };

  let sessionIdCounter = mockData.sessions?.length || 1;
  let logIdCounter = mockData.logs?.length || 1;
  let transcriptIdCounter = mockData.subagentTranscripts?.length || 1;

  return {
    mockData,

    async listSessions(options?: {
      status?: SessionStatus;
      agent_type?: string;
      show_archived?: boolean;
      page?: number;
      per_page?: number;
    }): Promise<SessionsResponse> {
      let sessions = [...(mockData.sessions || [])];

      if (options?.status) {
        sessions = sessions.filter((s) => s.status === options.status);
      }
      if (options?.agent_type) {
        sessions = sessions.filter((s) => s.agent_type === options.agent_type);
      }
      if (!options?.show_archived) {
        sessions = sessions.filter((s) => s.status !== 'archived');
      }

      const page = options?.page || 1;
      const perPage = options?.per_page || 25;
      const start = (page - 1) * perPage;
      const paginatedSessions = sessions.slice(start, start + perPage);

      return {
        sessions: paginatedSessions,
        pagination: {
          page,
          per_page: perPage,
          total_count: sessions.length,
          total_pages: Math.ceil(sessions.length / perPage),
        },
      };
    },

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
      let sessions = [...(mockData.sessions || [])];

      // Filter by query (simple contains match on title)
      sessions = sessions.filter((s) => s.title.toLowerCase().includes(query.toLowerCase()));

      if (options?.status) {
        sessions = sessions.filter((s) => s.status === options.status);
      }
      if (!options?.show_archived) {
        sessions = sessions.filter((s) => s.status !== 'archived');
      }

      const page = options?.page || 1;
      const perPage = options?.per_page || 25;
      const start = (page - 1) * perPage;
      const paginatedSessions = sessions.slice(start, start + perPage);

      return {
        query,
        search_contents: options?.search_contents || false,
        sessions: paginatedSessions,
        pagination: {
          page,
          per_page: perPage,
          total_count: sessions.length,
          total_pages: Math.ceil(sessions.length / perPage),
        },
      };
    },

    async getSession(id: string | number, includeTranscript?: boolean): Promise<Session> {
      const session = mockData.sessions?.find((s) => s.id === Number(id) || s.slug === String(id));
      if (!session) {
        throw new Error(`API Error (404): Session not found`);
      }
      const result = { ...session };
      if (includeTranscript) {
        result.transcript = '{"type":"user",...}\n{"type":"assistant",...}';
      }
      return result;
    },

    async createSession(data: CreateSessionRequest): Promise<Session> {
      sessionIdCounter++;
      const session: Session = {
        id: sessionIdCounter,
        slug: data.slug || null,
        title: data.title || 'New Session',
        status: 'waiting',
        agent_type: data.agent_type || 'claude_code',
        prompt: data.prompt || null,
        git_root: data.git_root || null,
        branch: data.branch || 'main',
        subdirectory: data.subdirectory || null,
        execution_provider: data.execution_provider || 'local_filesystem',
        stop_condition: data.stop_condition || null,
        mcp_servers: data.mcp_servers || [],
        config: data.config || {},
        metadata: {},
        custom_metadata: data.custom_metadata || {},
        session_id: null,
        job_id: data.prompt ? `job_${Date.now()}` : null,
        running_job_id: null,
        archived_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockData.sessions?.push(session);
      return session;
    },

    async updateSession(id: string | number, data: UpdateSessionRequest): Promise<Session> {
      const session = mockData.sessions?.find((s) => s.id === Number(id) || s.slug === String(id));
      if (!session) {
        throw new Error(`API Error (404): Session not found`);
      }
      if (data.title !== undefined) session.title = data.title;
      if (data.slug !== undefined) session.slug = data.slug;
      if (data.stop_condition !== undefined) session.stop_condition = data.stop_condition;
      if (data.mcp_servers !== undefined) session.mcp_servers = data.mcp_servers;
      if (data.custom_metadata !== undefined) session.custom_metadata = data.custom_metadata;
      session.updated_at = new Date().toISOString();
      return session;
    },

    async deleteSession(id: string | number): Promise<void> {
      const index = mockData.sessions?.findIndex(
        (s) => s.id === Number(id) || s.slug === String(id)
      );
      if (index === undefined || index === -1) {
        throw new Error(`API Error (404): Session not found`);
      }
      mockData.sessions?.splice(index, 1);
    },

    async archiveSession(id: string | number): Promise<Session> {
      const session = mockData.sessions?.find((s) => s.id === Number(id) || s.slug === String(id));
      if (!session) {
        throw new Error(`API Error (404): Session not found`);
      }
      session.status = 'archived';
      session.archived_at = new Date().toISOString();
      session.updated_at = new Date().toISOString();
      return session;
    },

    async unarchiveSession(id: string | number): Promise<Session> {
      const session = mockData.sessions?.find((s) => s.id === Number(id) || s.slug === String(id));
      if (!session) {
        throw new Error(`API Error (404): Session not found`);
      }
      session.status = 'needs_input';
      session.archived_at = null;
      session.updated_at = new Date().toISOString();
      return session;
    },

    async followUp(id: string | number, prompt: string): Promise<SessionActionResponse> {
      const session = mockData.sessions?.find((s) => s.id === Number(id) || s.slug === String(id));
      if (!session) {
        throw new Error(`API Error (404): Session not found`);
      }
      if (session.status !== 'needs_input') {
        throw new Error(`API Error (422): Session is not in needs_input status`);
      }
      session.prompt = prompt;
      session.status = 'running';
      session.running_job_id = `job_${Date.now()}`;
      session.updated_at = new Date().toISOString();
      return { session, message: 'Follow-up prompt sent' };
    },

    async pauseSession(id: string | number): Promise<SessionActionResponse> {
      const session = mockData.sessions?.find((s) => s.id === Number(id) || s.slug === String(id));
      if (!session) {
        throw new Error(`API Error (404): Session not found`);
      }
      session.status = 'needs_input';
      session.running_job_id = null;
      session.updated_at = new Date().toISOString();
      return { session, message: 'Session paused' };
    },

    async restartSession(id: string | number): Promise<SessionActionResponse> {
      const session = mockData.sessions?.find((s) => s.id === Number(id) || s.slug === String(id));
      if (!session) {
        throw new Error(`API Error (404): Session not found`);
      }
      session.status = 'running';
      session.running_job_id = `job_${Date.now()}`;
      session.updated_at = new Date().toISOString();
      return { session, message: 'Session restarted' };
    },

    async changeMcpServers(id: string | number, mcp_servers: string[]): Promise<Session> {
      const session = mockData.sessions?.find((s) => s.id === Number(id) || s.slug === String(id));
      if (!session) {
        throw new Error(`API Error (404): Session not found`);
      }
      session.mcp_servers = mcp_servers;
      session.updated_at = new Date().toISOString();
      return session;
    },

    async listLogs(
      sessionId: string | number,
      options?: {
        level?: LogLevel;
        page?: number;
        per_page?: number;
      }
    ): Promise<LogsResponse> {
      let logs = (mockData.logs || []).filter((l) => l.session_id === Number(sessionId));

      if (options?.level) {
        logs = logs.filter((l) => l.level === options.level);
      }

      const page = options?.page || 1;
      const perPage = options?.per_page || 25;
      const start = (page - 1) * perPage;
      const paginatedLogs = logs.slice(start, start + perPage);

      return {
        logs: paginatedLogs,
        pagination: {
          page,
          per_page: perPage,
          total_count: logs.length,
          total_pages: Math.ceil(logs.length / perPage),
        },
      };
    },

    async getLog(sessionId: string | number, logId: number): Promise<Log> {
      const log = mockData.logs?.find((l) => l.session_id === Number(sessionId) && l.id === logId);
      if (!log) {
        throw new Error(`API Error (404): Log not found`);
      }
      return log;
    },

    async createLog(sessionId: string | number, data: CreateLogRequest): Promise<Log> {
      logIdCounter++;
      const log: Log = {
        id: logIdCounter,
        session_id: Number(sessionId),
        content: data.content,
        level: data.level,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockData.logs?.push(log);
      return log;
    },

    async updateLog(
      sessionId: string | number,
      logId: number,
      data: UpdateLogRequest
    ): Promise<Log> {
      const log = mockData.logs?.find((l) => l.session_id === Number(sessionId) && l.id === logId);
      if (!log) {
        throw new Error(`API Error (404): Log not found`);
      }
      if (data.content !== undefined) log.content = data.content;
      if (data.level !== undefined) log.level = data.level;
      log.updated_at = new Date().toISOString();
      return log;
    },

    async deleteLog(sessionId: string | number, logId: number): Promise<void> {
      const index = mockData.logs?.findIndex(
        (l) => l.session_id === Number(sessionId) && l.id === logId
      );
      if (index === undefined || index === -1) {
        throw new Error(`API Error (404): Log not found`);
      }
      mockData.logs?.splice(index, 1);
    },

    async listSubagentTranscripts(
      sessionId: string | number,
      options?: {
        status?: SubagentStatus;
        subagent_type?: string;
        page?: number;
        per_page?: number;
      }
    ): Promise<SubagentTranscriptsResponse> {
      let transcripts = (mockData.subagentTranscripts || []).filter(
        (t) => t.session_id === Number(sessionId)
      );

      if (options?.status) {
        transcripts = transcripts.filter((t) => t.status === options.status);
      }
      if (options?.subagent_type) {
        transcripts = transcripts.filter((t) => t.subagent_type === options.subagent_type);
      }

      const page = options?.page || 1;
      const perPage = options?.per_page || 25;
      const start = (page - 1) * perPage;
      const paginatedTranscripts = transcripts.slice(start, start + perPage);

      return {
        subagent_transcripts: paginatedTranscripts,
        pagination: {
          page,
          per_page: perPage,
          total_count: transcripts.length,
          total_pages: Math.ceil(transcripts.length / perPage),
        },
      };
    },

    async getSubagentTranscript(
      sessionId: string | number,
      transcriptId: number,
      includeTranscript?: boolean
    ): Promise<SubagentTranscript> {
      const transcript = mockData.subagentTranscripts?.find(
        (t) => t.session_id === Number(sessionId) && t.id === transcriptId
      );
      if (!transcript) {
        throw new Error(`API Error (404): Subagent transcript not found`);
      }
      const result = { ...transcript };
      if (includeTranscript) {
        result.transcript = '{"type":"user",...}\n{"type":"assistant",...}';
      }
      return result;
    },

    async createSubagentTranscript(
      sessionId: string | number,
      data: CreateSubagentTranscriptRequest
    ): Promise<SubagentTranscript> {
      transcriptIdCounter++;
      const transcript: SubagentTranscript = {
        id: transcriptIdCounter,
        session_id: Number(sessionId),
        agent_id: data.agent_id,
        tool_use_id: data.tool_use_id || null,
        transcript: data.transcript,
        filename: data.filename || null,
        message_count: data.message_count || null,
        subagent_type: data.subagent_type || null,
        description: data.description || null,
        status: data.status || null,
        duration_ms: data.duration_ms || null,
        total_tokens: data.total_tokens || null,
        tool_use_count: data.tool_use_count || null,
        formatted_duration: null,
        formatted_tokens: null,
        display_label: data.description || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockData.subagentTranscripts?.push(transcript);
      return transcript;
    },

    async updateSubagentTranscript(
      sessionId: string | number,
      transcriptId: number,
      data: UpdateSubagentTranscriptRequest
    ): Promise<SubagentTranscript> {
      const transcript = mockData.subagentTranscripts?.find(
        (t) => t.session_id === Number(sessionId) && t.id === transcriptId
      );
      if (!transcript) {
        throw new Error(`API Error (404): Subagent transcript not found`);
      }
      Object.assign(transcript, data);
      transcript.updated_at = new Date().toISOString();
      return transcript;
    },

    async deleteSubagentTranscript(
      sessionId: string | number,
      transcriptId: number
    ): Promise<void> {
      const index = mockData.subagentTranscripts?.findIndex(
        (t) => t.session_id === Number(sessionId) && t.id === transcriptId
      );
      if (index === undefined || index === -1) {
        throw new Error(`API Error (404): Subagent transcript not found`);
      }
      mockData.subagentTranscripts?.splice(index, 1);
    },
  };
}
