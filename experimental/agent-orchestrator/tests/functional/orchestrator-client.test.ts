import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentOrchestratorClient } from '../../shared/src/orchestrator-client/orchestrator-client.js';

describe('AgentOrchestratorClient', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockFetchResponse(data: unknown, status = 200) {
    fetchSpy.mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
    });
  }

  describe('createSession', () => {
    it('should remap skills to catalog_skills in the API request body', async () => {
      const client = new AgentOrchestratorClient('https://ao.example.com', 'test-key');
      const mockSession = {
        session: {
          id: 1,
          title: 'Test',
          status: 'waiting',
          agent_type: 'claude_code',
          mcp_servers: [],
          catalog_skills: ['skill-a', 'skill-b'],
        },
      };
      mockFetchResponse(mockSession);

      await client.createSession({
        title: 'Test',
        prompt: 'Do something',
        skills: ['skill-a', 'skill-b'],
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [, requestInit] = fetchSpy.mock.calls[0];
      const body = JSON.parse(requestInit.body);
      expect(body).toHaveProperty('catalog_skills', ['skill-a', 'skill-b']);
      expect(body).not.toHaveProperty('skills');
    });

    it('should not include catalog_skills when skills is not provided', async () => {
      const client = new AgentOrchestratorClient('https://ao.example.com', 'test-key');
      const mockSession = {
        session: {
          id: 1,
          title: 'Test',
          status: 'waiting',
          agent_type: 'claude_code',
          mcp_servers: [],
        },
      };
      mockFetchResponse(mockSession);

      await client.createSession({
        title: 'Test',
        prompt: 'Do something',
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [, requestInit] = fetchSpy.mock.calls[0];
      const body = JSON.parse(requestInit.body);
      expect(body).not.toHaveProperty('catalog_skills');
      expect(body).not.toHaveProperty('skills');
    });

    it('should remap empty skills array to empty catalog_skills', async () => {
      const client = new AgentOrchestratorClient('https://ao.example.com', 'test-key');
      const mockSession = {
        session: {
          id: 1,
          title: 'Test',
          status: 'waiting',
          agent_type: 'claude_code',
          mcp_servers: [],
          catalog_skills: [],
        },
      };
      mockFetchResponse(mockSession);

      await client.createSession({
        title: 'Test',
        prompt: 'Do something',
        skills: [],
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [, requestInit] = fetchSpy.mock.calls[0];
      const body = JSON.parse(requestInit.body);
      expect(body).toHaveProperty('catalog_skills', []);
      expect(body).not.toHaveProperty('skills');
    });

    it('should remap plugins to catalog_plugins in the API request body', async () => {
      const client = new AgentOrchestratorClient('https://ao.example.com', 'test-key');
      const mockSession = {
        session: {
          id: 1,
          title: 'Test',
          status: 'waiting',
          agent_type: 'claude_code',
          mcp_servers: [],
          catalog_plugins: ['plugin-a', 'plugin-b'],
        },
      };
      mockFetchResponse(mockSession);

      await client.createSession({
        title: 'Test',
        prompt: 'Do something',
        plugins: ['plugin-a', 'plugin-b'],
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [, requestInit] = fetchSpy.mock.calls[0];
      const body = JSON.parse(requestInit.body);
      expect(body).toHaveProperty('catalog_plugins', ['plugin-a', 'plugin-b']);
      expect(body).not.toHaveProperty('plugins');
    });

    it('should not include catalog_plugins when plugins is not provided', async () => {
      const client = new AgentOrchestratorClient('https://ao.example.com', 'test-key');
      const mockSession = {
        session: {
          id: 1,
          title: 'Test',
          status: 'waiting',
          agent_type: 'claude_code',
          mcp_servers: [],
        },
      };
      mockFetchResponse(mockSession);

      await client.createSession({
        title: 'Test',
        prompt: 'Do something',
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [, requestInit] = fetchSpy.mock.calls[0];
      const body = JSON.parse(requestInit.body);
      expect(body).not.toHaveProperty('catalog_plugins');
      expect(body).not.toHaveProperty('plugins');
    });

    it('should remap empty plugins array to empty catalog_plugins', async () => {
      const client = new AgentOrchestratorClient('https://ao.example.com', 'test-key');
      const mockSession = {
        session: {
          id: 1,
          title: 'Test',
          status: 'waiting',
          agent_type: 'claude_code',
          mcp_servers: [],
          catalog_plugins: [],
        },
      };
      mockFetchResponse(mockSession);

      await client.createSession({
        title: 'Test',
        prompt: 'Do something',
        plugins: [],
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [, requestInit] = fetchSpy.mock.calls[0];
      const body = JSON.parse(requestInit.body);
      expect(body).toHaveProperty('catalog_plugins', []);
      expect(body).not.toHaveProperty('plugins');
    });

    it('should preserve other fields alongside the skills and plugins remapping', async () => {
      const client = new AgentOrchestratorClient('https://ao.example.com', 'test-key');
      const mockSession = {
        session: {
          id: 1,
          title: 'Full Session',
          status: 'waiting',
          agent_type: 'claude_code',
          mcp_servers: ['github'],
          catalog_skills: ['deploy'],
          catalog_plugins: ['my-plugin'],
        },
      };
      mockFetchResponse(mockSession);

      await client.createSession({
        title: 'Full Session',
        prompt: 'Deploy the app',
        git_root: 'https://github.com/test/repo.git',
        branch: 'main',
        mcp_servers: ['github'],
        skills: ['deploy'],
        plugins: ['my-plugin'],
        config: { key: 'value' },
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [, requestInit] = fetchSpy.mock.calls[0];
      const body = JSON.parse(requestInit.body);
      expect(body).toEqual({
        title: 'Full Session',
        prompt: 'Deploy the app',
        git_root: 'https://github.com/test/repo.git',
        branch: 'main',
        mcp_servers: ['github'],
        catalog_skills: ['deploy'],
        catalog_plugins: ['my-plugin'],
        config: { key: 'value' },
      });
    });
  });
});
