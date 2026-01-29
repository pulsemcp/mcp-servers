import { describe, it, expect, vi } from 'vitest';
import { createUnofficialMirror } from '../../shared/src/tools/create-unofficial-mirror.js';
import { updateUnofficialMirror } from '../../shared/src/tools/update-unofficial-mirror.js';
import type { UnofficialMirror } from '../../shared/src/types.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

/**
 * Tests for the server_json parameter in create_unofficial_mirror and update_unofficial_mirror tools.
 * The server_json parameter accepts server.json content directly and automatically wraps it
 * in the required { "server": ... } envelope.
 */

describe('Unofficial Mirror Tools - server_json parameter', () => {
  const mockServer = {} as Server;

  // Mock UnofficialMirror response
  const mockMirrorResponse: UnofficialMirror = {
    id: 123,
    name: 'test-mirror',
    version: '1.0.0',
    jsonb_data: { server: { name: 'test' } },
    created_at: '2026-01-28T00:00:00Z',
    updated_at: '2026-01-28T00:00:00Z',
  };

  describe('create_unofficial_mirror', () => {
    it('should wrap server_json in { "server": ... } envelope', async () => {
      const createMirrorMock = vi.fn().mockResolvedValue(mockMirrorResponse);
      const mockClient = {
        createUnofficialMirror: createMirrorMock,
      };

      const tool = createUnofficialMirror(mockServer, () => mockClient as never);
      await tool.handler({
        name: 'test-mirror',
        version: '1.0.0',
        server_json: {
          $schema: 'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json',
          name: 'Test Server',
          title: 'Test',
        },
      });

      // Verify the jsonb_data was wrapped in { server: ... } envelope
      expect(createMirrorMock).toHaveBeenCalledWith({
        name: 'test-mirror',
        version: '1.0.0',
        jsonb_data: {
          server: {
            $schema: 'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json',
            name: 'Test Server',
            title: 'Test',
          },
        },
        mcp_server_id: undefined,
        previous_name: undefined,
        next_name: undefined,
      });
    });

    it('should fail validation when server_json is not provided', async () => {
      const createMirrorMock = vi.fn().mockResolvedValue(mockMirrorResponse);
      const mockClient = {
        createUnofficialMirror: createMirrorMock,
      };

      const tool = createUnofficialMirror(mockServer, () => mockClient as never);

      // Zod validation throws before the handler's try/catch
      await expect(
        tool.handler({
          name: 'test-mirror',
          version: '1.0.0',
          // server_json not provided
        })
      ).rejects.toThrow();
    });

    it('should parse server_json from JSON string', async () => {
      const createMirrorMock = vi.fn().mockResolvedValue(mockMirrorResponse);
      const mockClient = {
        createUnofficialMirror: createMirrorMock,
      };

      const tool = createUnofficialMirror(mockServer, () => mockClient as never);
      await tool.handler({
        name: 'test-mirror',
        version: '1.0.0',
        server_json: '{"name": "JSON string input"}',
      });

      // Verify the JSON string was parsed and wrapped
      expect(createMirrorMock).toHaveBeenCalledWith(
        expect.objectContaining({
          jsonb_data: {
            server: { name: 'JSON string input' },
          },
        })
      );
    });

    it('should pass through optional fields', async () => {
      const createMirrorMock = vi.fn().mockResolvedValue(mockMirrorResponse);
      const mockClient = {
        createUnofficialMirror: createMirrorMock,
      };

      const tool = createUnofficialMirror(mockServer, () => mockClient as never);
      await tool.handler({
        name: 'test-mirror',
        version: '1.0.0',
        server_json: { name: 'Test' },
        mcp_server_id: 456,
        previous_name: 'old-name',
        next_name: 'new-name',
      });

      expect(createMirrorMock).toHaveBeenCalledWith({
        name: 'test-mirror',
        version: '1.0.0',
        jsonb_data: { server: { name: 'Test' } },
        mcp_server_id: 456,
        previous_name: 'old-name',
        next_name: 'new-name',
      });
    });
  });

  describe('update_unofficial_mirror', () => {
    it('should wrap server_json in { "server": ... } envelope', async () => {
      const updateMirrorMock = vi.fn().mockResolvedValue(mockMirrorResponse);
      const mockClient = {
        updateUnofficialMirror: updateMirrorMock,
      };

      const tool = updateUnofficialMirror(mockServer, () => mockClient as never);
      await tool.handler({
        id: 123,
        server_json: {
          name: 'Updated Server',
          version: '2.0.0',
        },
      });

      // Verify the jsonb_data was wrapped in { server: ... } envelope
      expect(updateMirrorMock).toHaveBeenCalledWith(123, {
        jsonb_data: {
          server: {
            name: 'Updated Server',
            version: '2.0.0',
          },
        },
      });
    });

    it('should allow updates without server_json (other fields only)', async () => {
      const updateMirrorMock = vi.fn().mockResolvedValue({
        ...mockMirrorResponse,
        version: '2.0.0',
      });
      const mockClient = {
        updateUnofficialMirror: updateMirrorMock,
      };

      const tool = updateUnofficialMirror(mockServer, () => mockClient as never);
      const result = await tool.handler({
        id: 123,
        version: '2.0.0',
      });

      // Should succeed (update other fields without touching server_json)
      expect(result.isError).toBeFalsy();
      expect(updateMirrorMock).toHaveBeenCalledWith(123, {
        version: '2.0.0',
      });
    });

    it('should parse server_json from JSON string', async () => {
      const updateMirrorMock = vi.fn().mockResolvedValue(mockMirrorResponse);
      const mockClient = {
        updateUnofficialMirror: updateMirrorMock,
      };

      const tool = updateUnofficialMirror(mockServer, () => mockClient as never);
      await tool.handler({
        id: 123,
        server_json: '{"name": "JSON string input"}',
      });

      // Verify the JSON string was parsed and wrapped
      expect(updateMirrorMock).toHaveBeenCalledWith(
        123,
        expect.objectContaining({
          jsonb_data: {
            server: { name: 'JSON string input' },
          },
        })
      );
    });

    it('should return error when no fields provided for update', async () => {
      const updateMirrorMock = vi.fn().mockResolvedValue(mockMirrorResponse);
      const mockClient = {
        updateUnofficialMirror: updateMirrorMock,
      };

      const tool = updateUnofficialMirror(mockServer, () => mockClient as never);
      const result = await tool.handler({
        id: 123,
        // No update fields provided
      });

      expect(result.content[0].text).toContain('No changes provided');
      expect(updateMirrorMock).not.toHaveBeenCalled();
    });
  });
});
