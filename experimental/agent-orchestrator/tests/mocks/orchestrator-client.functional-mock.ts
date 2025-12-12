import { vi } from 'vitest';
import type { IAgentOrchestratorClient } from '../../shared/src/orchestrator-client/orchestrator-client.js';
import type { Session, Log, SubagentTranscript } from '../../shared/src/types.js';

const defaultSession: Session = {
  id: 1,
  slug: 'test-session',
  title: 'Test Session',
  status: 'running',
  agent_type: 'claude_code',
  prompt: 'Test prompt',
  git_root: 'https://github.com/test/repo.git',
  branch: 'main',
  subdirectory: null,
  execution_provider: 'local_filesystem',
  stop_condition: null,
  mcp_servers: [],
  config: {},
  metadata: {},
  custom_metadata: {},
  session_id: null,
  job_id: 'job_123',
  running_job_id: null,
  archived_at: null,
  created_at: '2025-01-15T14:30:00Z',
  updated_at: '2025-01-15T14:35:00Z',
};

const defaultLog: Log = {
  id: 1,
  session_id: 1,
  content: 'Test log message',
  level: 'info',
  created_at: '2025-01-15T14:30:00Z',
  updated_at: '2025-01-15T14:30:00Z',
};

const defaultTranscript: SubagentTranscript = {
  id: 1,
  session_id: 1,
  agent_id: 'agent-abc123',
  tool_use_id: 'tool-xyz789',
  filename: 'transcript_001.jsonl',
  message_count: 15,
  subagent_type: 'explore',
  description: 'Test subagent',
  status: 'completed',
  duration_ms: 45000,
  total_tokens: 12500,
  tool_use_count: 8,
  formatted_duration: '45s',
  formatted_tokens: '12.5k',
  display_label: 'Test subagent',
  created_at: '2025-01-15T14:31:00Z',
  updated_at: '2025-01-15T14:31:45Z',
};

export function createMockOrchestratorClient(): IAgentOrchestratorClient {
  return {
    listSessions: vi.fn().mockResolvedValue({
      sessions: [defaultSession],
      pagination: { page: 1, per_page: 25, total_count: 1, total_pages: 1 },
    }),

    searchSessions: vi.fn().mockResolvedValue({
      query: 'test',
      search_contents: false,
      sessions: [defaultSession],
      pagination: { page: 1, per_page: 25, total_count: 1, total_pages: 1 },
    }),

    getSession: vi.fn().mockResolvedValue(defaultSession),

    createSession: vi.fn().mockResolvedValue({
      ...defaultSession,
      id: 2,
      status: 'waiting',
    }),

    updateSession: vi.fn().mockResolvedValue({
      ...defaultSession,
      title: 'Updated Session',
    }),

    deleteSession: vi.fn().mockResolvedValue(undefined),

    archiveSession: vi.fn().mockResolvedValue({
      ...defaultSession,
      status: 'archived',
      archived_at: '2025-01-15T15:00:00Z',
    }),

    unarchiveSession: vi.fn().mockResolvedValue({
      ...defaultSession,
      status: 'needs_input',
      archived_at: null,
    }),

    followUp: vi.fn().mockResolvedValue({
      session: { ...defaultSession, status: 'running' },
      message: 'Follow-up prompt sent',
    }),

    pauseSession: vi.fn().mockResolvedValue({
      session: { ...defaultSession, status: 'needs_input' },
      message: 'Session paused',
    }),

    restartSession: vi.fn().mockResolvedValue({
      session: { ...defaultSession, status: 'running' },
      message: 'Session restarted',
    }),

    listLogs: vi.fn().mockResolvedValue({
      logs: [defaultLog],
      pagination: { page: 1, per_page: 25, total_count: 1, total_pages: 1 },
    }),

    getLog: vi.fn().mockResolvedValue(defaultLog),

    createLog: vi.fn().mockResolvedValue({
      ...defaultLog,
      id: 2,
      content: 'New log message',
    }),

    updateLog: vi.fn().mockResolvedValue({
      ...defaultLog,
      content: 'Updated log message',
    }),

    deleteLog: vi.fn().mockResolvedValue(undefined),

    listSubagentTranscripts: vi.fn().mockResolvedValue({
      subagent_transcripts: [defaultTranscript],
      pagination: { page: 1, per_page: 25, total_count: 1, total_pages: 1 },
    }),

    getSubagentTranscript: vi.fn().mockResolvedValue(defaultTranscript),

    createSubagentTranscript: vi.fn().mockResolvedValue({
      ...defaultTranscript,
      id: 2,
    }),

    updateSubagentTranscript: vi.fn().mockResolvedValue({
      ...defaultTranscript,
      status: 'completed',
    }),

    deleteSubagentTranscript: vi.fn().mockResolvedValue(undefined),
  };
}
