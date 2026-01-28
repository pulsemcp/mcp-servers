import { describe, it, expect, vi } from 'vitest';
import { createUnofficialMirror } from '../../shared/src/tools/create-unofficial-mirror.js';
import { updateUnofficialMirror } from '../../shared/src/tools/update-unofficial-mirror.js';
import type { UnofficialMirror } from '../../shared/src/types.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

/**
 * Tests for the server_json parameter in create_unofficial_mirror and update_unofficial_mirror tools.
 * The server_json parameter provides a more ergonomic way to save server.json content by
 * automatically wrapping it in the required { "server": ... } envelope.
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

    it('should pass jsonb_data through unchanged (no wrapping)', async () => {
      const createMirrorMock = vi.fn().mockResolvedValue(mockMirrorResponse);
      const mockClient = {
        createUnofficialMirror: createMirrorMock,
      };

      const tool = createUnofficialMirror(mockServer, () => mockClient as never);
      await tool.handler({
        name: 'test-mirror',
        version: '1.0.0',
        jsonb_data: {
          server: { name: 'Already wrapped' },
          extra_field: 'some value',
        },
      });

      // Verify jsonb_data was passed through unchanged
      expect(createMirrorMock).toHaveBeenCalledWith({
        name: 'test-mirror',
        version: '1.0.0',
        jsonb_data: {
          server: { name: 'Already wrapped' },
          extra_field: 'some value',
        },
        mcp_server_id: undefined,
        previous_name: undefined,
        next_name: undefined,
      });
    });

    it('should prefer server_json over jsonb_data when both provided', async () => {
      const createMirrorMock = vi.fn().mockResolvedValue(mockMirrorResponse);
      const mockClient = {
        createUnofficialMirror: createMirrorMock,
      };

      const tool = createUnofficialMirror(mockServer, () => mockClient as never);
      await tool.handler({
        name: 'test-mirror',
        version: '1.0.0',
        server_json: { name: 'From server_json' },
        jsonb_data: { server: { name: 'From jsonb_data' } },
      });

      // Verify server_json took precedence
      expect(createMirrorMock).toHaveBeenCalledWith(
        expect.objectContaining({
          jsonb_data: {
            server: { name: 'From server_json' },
          },
        })
      );
    });

    it('should fail validation when neither server_json nor jsonb_data is provided', async () => {
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
          // Neither server_json nor jsonb_data provided
        })
      ).rejects.toThrow('server_json or jsonb_data');
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

    it('should pass jsonb_data through unchanged (no wrapping)', async () => {
      const updateMirrorMock = vi.fn().mockResolvedValue(mockMirrorResponse);
      const mockClient = {
        updateUnofficialMirror: updateMirrorMock,
      };

      const tool = updateUnofficialMirror(mockServer, () => mockClient as never);
      await tool.handler({
        id: 123,
        jsonb_data: {
          server: { name: 'Already wrapped' },
          custom: 'data',
        },
      });

      // Verify jsonb_data was passed through unchanged
      expect(updateMirrorMock).toHaveBeenCalledWith(123, {
        jsonb_data: {
          server: { name: 'Already wrapped' },
          custom: 'data',
        },
      });
    });

    it('should prefer server_json over jsonb_data when both provided', async () => {
      const updateMirrorMock = vi.fn().mockResolvedValue(mockMirrorResponse);
      const mockClient = {
        updateUnofficialMirror: updateMirrorMock,
      };

      const tool = updateUnofficialMirror(mockServer, () => mockClient as never);
      await tool.handler({
        id: 123,
        server_json: { name: 'From server_json' },
        jsonb_data: { server: { name: 'From jsonb_data' } },
      });

      // Verify server_json took precedence
      expect(updateMirrorMock).toHaveBeenCalledWith(
        123,
        expect.objectContaining({
          jsonb_data: {
            server: { name: 'From server_json' },
          },
        })
      );
    });

    it('should allow updates without server_json or jsonb_data (other fields only)', async () => {
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

      // Should succeed (update other fields without touching jsonb_data)
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
  });
});
