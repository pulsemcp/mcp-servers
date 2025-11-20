import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendMCPImplementationPostingNotification } from '../../shared/src/tools/send-mcp-implementation-posting-notification.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { IPulseMCPAdminClient } from '../../shared/src/server.js';
import type { MCPImplementation, MCPServer, MCPClient } from '../../shared/src/types.js';

describe('sendMCPImplementationPostingNotification', () => {
  let mockServer: Server;
  let mockClient: IPulseMCPAdminClient;
  let tool: ReturnType<typeof sendMCPImplementationPostingNotification>;

  beforeEach(() => {
    mockServer = {} as Server;

    // Create mock client with all required methods
    mockClient = {
      searchMCPImplementations: vi.fn(),
      getMCPServerById: vi.fn(),
      getMCPClientById: vi.fn(),
      sendEmail: vi.fn(),
      // Add other required methods as stubs
      getPosts: vi.fn(),
      getPost: vi.fn(),
      createPost: vi.fn(),
      updatePost: vi.fn(),
      uploadImage: vi.fn(),
      getAuthors: vi.fn(),
      getAuthorBySlug: vi.fn(),
      getAuthorById: vi.fn(),
      getMCPServerBySlug: vi.fn(),
      getMCPClientBySlug: vi.fn(),
      getDraftMCPImplementations: vi.fn(),
      saveMCPImplementation: vi.fn(),
    } as IPulseMCPAdminClient;

    const clientFactory = () => mockClient;
    tool = sendMCPImplementationPostingNotification(mockServer, clientFactory);
  });

  it('should have correct metadata', () => {
    expect(tool.name).toBe('send_mcp_implementation_posting_notification');
    expect(tool.description).toContain('Send an email notification');
    expect(tool.inputSchema.properties).toHaveProperty('implementation_id');
    expect(tool.inputSchema.required).toEqual(['implementation_id']);
  });

  it('should send notification for live server implementation', async () => {
    const mockImplementation: MCPImplementation = {
      id: 123,
      name: 'Test Server',
      type: 'server',
      status: 'live',
      slug: 'test-server',
      mcp_server_id: 456,
      internal_notes: 'Submitted by developer@example.com',
    };

    const mockServer: MCPServer = {
      id: 456,
      slug: 'test-server',
      name: 'Test Server',
    };

    vi.mocked(mockClient.searchMCPImplementations).mockResolvedValue({
      implementations: [mockImplementation],
    });

    vi.mocked(mockClient.getMCPServerById).mockResolvedValue(mockServer);

    vi.mocked(mockClient.sendEmail).mockResolvedValue({
      id: 789,
      campaign_identifier: 'admin-api-email-123456',
      send_timestamp_utc: '2024-01-01T00:00:00Z',
    });

    const result = await tool.handler({
      implementation_id: 123,
    });

    expect(mockClient.searchMCPImplementations).toHaveBeenCalledWith({
      query: 'id:123',
      status: 'all',
      limit: 1,
    });

    expect(mockClient.getMCPServerById).toHaveBeenCalledWith(456);

    expect(mockClient.sendEmail).toHaveBeenCalledWith({
      from_email_address: 'tadas@s.pulsemcp.com',
      from_name: 'Tadas at PulseMCP',
      reply_to_email_address: 'tadas@pulsemcp.com',
      to_email_address: 'developer@example.com',
      subject: 'Thanks for your submission to PulseMCP!',
      content: expect.stringContaining('https://www.pulsemcp.com/servers/test-server'),
    });

    expect(result.content[0].text).toContain('Successfully sent notification email');
    expect(result.content[0].text).toContain('Test Server');
    expect(result.content[0].text).toContain('developer@example.com');
  });

  it('should send notification for live client implementation', async () => {
    const mockImplementation: MCPImplementation = {
      id: 124,
      name: 'Test Client',
      type: 'client',
      status: 'live',
      slug: 'test-client',
      mcp_client_id: 457,
      internal_notes: 'Contact: user@example.org',
    };

    const mockClientEntity: MCPClient = {
      id: 457,
      slug: 'test-client',
      name: 'Test Client',
    };

    vi.mocked(mockClient.searchMCPImplementations).mockResolvedValue({
      implementations: [mockImplementation],
    });

    vi.mocked(mockClient.getMCPClientById).mockResolvedValue(mockClientEntity);

    vi.mocked(mockClient.sendEmail).mockResolvedValue({
      id: 790,
      campaign_identifier: 'admin-api-email-123457',
      send_timestamp_utc: '2024-01-01T00:00:00Z',
    });

    const result = await tool.handler({
      implementation_id: 124,
    });

    expect(mockClient.getMCPClientById).toHaveBeenCalledWith(457);

    expect(mockClient.sendEmail).toHaveBeenCalledWith({
      from_email_address: 'tadas@s.pulsemcp.com',
      from_name: 'Tadas at PulseMCP',
      reply_to_email_address: 'tadas@pulsemcp.com',
      to_email_address: 'user@example.org',
      subject: 'Thanks for your submission to PulseMCP!',
      content: expect.stringContaining('https://www.pulsemcp.com/clients/test-client'),
    });

    expect(result.content[0].text).toContain('Successfully sent notification email');
    expect(result.content[0].text).toContain('Test Client');
    expect(result.content[0].text).toContain('user@example.org');
  });

  it('should allow overriding email parameters', async () => {
    const mockImplementation: MCPImplementation = {
      id: 125,
      name: 'Test Server',
      type: 'server',
      status: 'live',
      slug: 'test-server',
      mcp_server_id: 458,
    };

    const mockServer: MCPServer = {
      id: 458,
      slug: 'test-server-override',
      name: 'Test Server',
    };

    vi.mocked(mockClient.searchMCPImplementations).mockResolvedValue({
      implementations: [mockImplementation],
    });

    vi.mocked(mockClient.getMCPServerById).mockResolvedValue(mockServer);

    vi.mocked(mockClient.sendEmail).mockResolvedValue({
      id: 791,
    });

    await tool.handler({
      implementation_id: 125,
      to_email_address: 'override@example.com',
      from_email_address: 'custom@pulsemcp.com',
      from_name: 'Custom Sender',
      reply_to_email_address: 'reply@pulsemcp.com',
    });

    expect(mockClient.sendEmail).toHaveBeenCalledWith({
      from_email_address: 'custom@pulsemcp.com',
      from_name: 'Custom Sender',
      reply_to_email_address: 'reply@pulsemcp.com',
      to_email_address: 'override@example.com',
      subject: 'Thanks for your submission to PulseMCP!',
      content: expect.stringContaining('https://www.pulsemcp.com/servers/test-server-override'),
    });
  });

  it('should throw error if implementation not found', async () => {
    vi.mocked(mockClient.searchMCPImplementations).mockResolvedValue({
      implementations: [],
    });

    const result = await tool.handler({
      implementation_id: 999,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('MCP implementation with ID 999 not found');
  });

  it('should throw error if implementation is not live', async () => {
    const mockImplementation: MCPImplementation = {
      id: 126,
      name: 'Draft Server',
      type: 'server',
      status: 'draft',
      slug: 'draft-server',
    };

    vi.mocked(mockClient.searchMCPImplementations).mockResolvedValue({
      implementations: [mockImplementation],
    });

    const result = await tool.handler({
      implementation_id: 126,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain(
      'Cannot send notification for implementation with status "draft"'
    );
  });

  it('should throw error if no email address available', async () => {
    const mockImplementation: MCPImplementation = {
      id: 127,
      name: 'No Email Server',
      type: 'server',
      status: 'live',
      slug: 'no-email-server',
      mcp_server_id: 459,
      // No internal_notes with email
    };

    const mockServer: MCPServer = {
      id: 459,
      slug: 'no-email-server',
      name: 'No Email Server',
    };

    vi.mocked(mockClient.searchMCPImplementations).mockResolvedValue({
      implementations: [mockImplementation],
    });

    vi.mocked(mockClient.getMCPServerById).mockResolvedValue(mockServer);

    const result = await tool.handler({
      implementation_id: 127,
      // No to_email_address override
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('No recipient email address found');
  });

  it('should throw error if no server or client slug available', async () => {
    const mockImplementation: MCPImplementation = {
      id: 128,
      name: 'No Slug Server',
      type: 'server',
      status: 'live',
      slug: 'no-slug-server',
      mcp_server_id: 460,
      internal_notes: 'test@example.com',
    };

    // Server exists but has no slug
    vi.mocked(mockClient.searchMCPImplementations).mockResolvedValue({
      implementations: [mockImplementation],
    });

    vi.mocked(mockClient.getMCPServerById).mockResolvedValue(null);

    const result = await tool.handler({
      implementation_id: 128,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain(
      'Cannot send notification: Implementation has no associated MCP server or client'
    );
  });

  it('should handle email sending errors gracefully', async () => {
    const mockImplementation: MCPImplementation = {
      id: 129,
      name: 'Error Server',
      type: 'server',
      status: 'live',
      slug: 'error-server',
      mcp_server_id: 461,
      internal_notes: 'error@example.com',
    };

    const mockServer: MCPServer = {
      id: 461,
      slug: 'error-server',
      name: 'Error Server',
    };

    vi.mocked(mockClient.searchMCPImplementations).mockResolvedValue({
      implementations: [mockImplementation],
    });

    vi.mocked(mockClient.getMCPServerById).mockResolvedValue(mockServer);

    vi.mocked(mockClient.sendEmail).mockRejectedValue(new Error('Email service unavailable'));

    const result = await tool.handler({
      implementation_id: 129,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain(
      'Error sending MCP implementation notification: Email service unavailable'
    );
  });
});
