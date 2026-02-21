import { vi } from 'vitest';
import type { IAgentOrchestratorClient } from '../../shared/src/orchestrator-client/orchestrator-client.js';
import type {
  Session,
  Log,
  SubagentTranscript,
  MCPServerInfo,
  AgentRootInfo,
  StopConditionInfo,
  ConfigsResponse,
  EnqueuedMessage,
  Trigger,
  Notification,
} from '../../shared/src/types.js';

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

const defaultMcpServers: MCPServerInfo[] = [
  {
    name: 'github-development',
    title: 'GitHub Development',
    description: 'Interact with GitHub repositories, issues, and pull requests',
  },
  {
    name: 'slack',
    title: 'Slack',
    description: 'Send and receive messages in Slack workspaces',
  },
];

const defaultAgentRoots: AgentRootInfo[] = [
  {
    name: 'mcp-servers',
    title: 'MCP Servers',
    description: 'PulseMCP MCP servers monorepo',
    git_root: 'https://github.com/pulsemcp/mcp-servers.git',
    default_branch: 'main',
    default_mcp_servers: ['github-development'],
  },
];

const defaultStopConditions: StopConditionInfo[] = [
  {
    id: 'pr_merged',
    name: 'PR Merged',
    description: 'Stop when the pull request is merged',
  },
  {
    id: 'ci_passing',
    name: 'CI Passing',
    description: 'Stop when CI checks pass',
  },
];

const defaultConfigs: ConfigsResponse = {
  mcp_servers: defaultMcpServers,
  agent_roots: defaultAgentRoots,
  stop_conditions: defaultStopConditions,
};

const defaultEnqueuedMessage: EnqueuedMessage = {
  id: 1,
  session_id: 1,
  content: 'Follow up on the PR review',
  stop_condition: null,
  position: 1,
  status: 'pending',
  created_at: '2025-01-15T15:00:00Z',
  updated_at: '2025-01-15T15:00:00Z',
};

const defaultTrigger: Trigger = {
  id: 1,
  name: 'Daily Report',
  trigger_type: 'schedule',
  status: 'enabled',
  agent_root_name: 'mcp-servers',
  prompt_template: 'Generate a daily status report',
  stop_condition: null,
  reuse_session: false,
  mcp_servers: ['github-development'],
  configuration: { interval: 1, unit: 'day' },
  schedule_description: 'Every day at 9:00 AM',
  last_session_id: null,
  last_triggered_at: null,
  last_polled_at: null,
  sessions_created_count: 0,
  created_at: '2025-01-15T14:00:00Z',
  updated_at: '2025-01-15T14:00:00Z',
};

const defaultNotification: Notification = {
  id: 1,
  session_id: 1,
  notification_type: 'session_needs_input',
  read: false,
  stale: false,
  created_at: '2025-01-15T15:00:00Z',
  updated_at: '2025-01-15T15:00:00Z',
  session: {
    id: 1,
    slug: 'test-session',
    title: 'Test Session',
    status: 'needs_input',
  },
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

    changeMcpServers: vi.fn().mockResolvedValue({
      ...defaultSession,
      mcp_servers: ['server1', 'server2'],
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

    getMcpServers: vi.fn().mockResolvedValue(defaultMcpServers),

    getConfigs: vi.fn().mockResolvedValue(defaultConfigs),

    sendPushNotification: vi.fn().mockResolvedValue({
      success: true,
      message: 'Push notification queued',
      session_id: 1,
    }),

    // Session Extensions
    forkSession: vi.fn().mockResolvedValue({
      session: { ...defaultSession, id: 3, title: 'Forked: Test Session' },
      message: 'Session forked successfully',
    }),

    refreshSession: vi.fn().mockResolvedValue({
      session: { ...defaultSession },
      message: 'Session refreshed',
    }),

    refreshAllSessions: vi.fn().mockResolvedValue({
      message: 'All sessions refreshed',
      refreshed: 5,
      restarted: 1,
      continued: 0,
      errors: 0,
    }),

    updateSessionNotes: vi.fn().mockResolvedValue({
      ...defaultSession,
    }),

    toggleFavorite: vi.fn().mockResolvedValue({
      ...defaultSession,
      favorited: true,
    }),

    bulkArchiveSessions: vi.fn().mockResolvedValue({
      archived_count: 3,
      errors: [],
    }),

    getTranscript: vi.fn().mockResolvedValue({
      transcript_text: 'User: Hello\nAssistant: Hi there!',
    }),

    // Enqueued Messages
    listEnqueuedMessages: vi.fn().mockResolvedValue({
      enqueued_messages: [defaultEnqueuedMessage],
      pagination: { page: 1, per_page: 25, total_count: 1, total_pages: 1 },
    }),

    getEnqueuedMessage: vi.fn().mockResolvedValue(defaultEnqueuedMessage),

    createEnqueuedMessage: vi.fn().mockResolvedValue({
      ...defaultEnqueuedMessage,
      id: 2,
      content: 'New message',
    }),

    updateEnqueuedMessage: vi.fn().mockResolvedValue({
      ...defaultEnqueuedMessage,
      content: 'Updated message',
    }),

    deleteEnqueuedMessage: vi.fn().mockResolvedValue(undefined),

    reorderEnqueuedMessage: vi.fn().mockResolvedValue({
      ...defaultEnqueuedMessage,
      position: 3,
    }),

    interruptEnqueuedMessage: vi.fn().mockResolvedValue({
      session: { ...defaultSession, status: 'running' },
      message: 'Message sent as interrupt',
    }),

    // Triggers
    listTriggers: vi.fn().mockResolvedValue({
      triggers: [defaultTrigger],
      pagination: { page: 1, per_page: 25, total_count: 1, total_pages: 1 },
    }),

    getTrigger: vi.fn().mockResolvedValue({
      trigger: defaultTrigger,
      recent_sessions: [],
    }),

    createTrigger: vi.fn().mockResolvedValue({
      ...defaultTrigger,
      id: 2,
      name: 'New Trigger',
    }),

    updateTrigger: vi.fn().mockResolvedValue({
      ...defaultTrigger,
      name: 'Updated Trigger',
    }),

    deleteTrigger: vi.fn().mockResolvedValue(undefined),

    toggleTrigger: vi.fn().mockResolvedValue({
      ...defaultTrigger,
      status: 'disabled',
    }),

    getTriggerChannels: vi.fn().mockResolvedValue({
      channels: [
        { id: 'C123', name: 'general', is_private: false, num_members: 50 },
        { id: 'C456', name: 'dev-team', is_private: true, num_members: 10 },
      ],
    }),

    // Notification Management
    listNotifications: vi.fn().mockResolvedValue({
      notifications: [defaultNotification],
      pagination: { page: 1, per_page: 25, total_count: 1, total_pages: 1 },
    }),

    getNotification: vi.fn().mockResolvedValue(defaultNotification),

    getNotificationBadge: vi.fn().mockResolvedValue({
      pending_count: 3,
    }),

    markNotificationRead: vi.fn().mockResolvedValue({
      ...defaultNotification,
      read: true,
    }),

    markAllNotificationsRead: vi.fn().mockResolvedValue({
      marked_count: 3,
      pending_count: 0,
    }),

    dismissNotification: vi.fn().mockResolvedValue(undefined),

    dismissAllReadNotifications: vi.fn().mockResolvedValue({
      dismissed_count: 2,
      pending_count: 1,
    }),

    // Health
    getHealth: vi.fn().mockResolvedValue({
      health_report: {
        sessions: { running: 5, waiting: 2, failed: 1 },
        jobs: { queued: 3, active: 2 },
      },
      timestamp: '2025-01-15T15:00:00Z',
      rails_env: 'production',
      ruby_version: '3.3.0',
    }),

    cleanupProcesses: vi.fn().mockResolvedValue({
      cleaned: 2,
      message: 'Cleaned up 2 orphaned processes',
    }),

    retrySessions: vi.fn().mockResolvedValue({
      retried: 3,
      message: 'Retried 3 failed sessions',
    }),

    archiveOldSessions: vi.fn().mockResolvedValue({
      archived: 10,
      message: 'Archived 10 old sessions',
    }),

    // CLIs
    getCliStatus: vi.fn().mockResolvedValue({
      cli_status: { claude_code: 'installed', npm: 'installed' },
      unauthenticated_count: 0,
    }),

    refreshCli: vi.fn().mockResolvedValue({
      queued: true,
      message: 'CLI refresh queued',
    }),

    clearCliCache: vi.fn().mockResolvedValue({
      queued: true,
      message: 'CLI cache clear queued',
    }),
  };
}
