import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { parseToolFilterConfig } from '../../shared/src/tools.js';

describe('Tool Filtering', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset env vars before each test
    process.env = { ...originalEnv };
    delete process.env.DYNAMODB_ENABLED_TOOL_GROUPS;
    delete process.env.DYNAMODB_ENABLED_TOOLS;
    delete process.env.DYNAMODB_DISABLED_TOOLS;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('parseToolFilterConfig', () => {
    it('should return empty config when no env vars are set', () => {
      const config = parseToolFilterConfig();
      expect(config.enabledToolGroups).toBeUndefined();
      expect(config.enabledTools).toBeUndefined();
      expect(config.disabledTools).toBeUndefined();
    });

    it('should parse enabled tool groups', () => {
      process.env.DYNAMODB_ENABLED_TOOL_GROUPS = 'readonly,readwrite';
      const config = parseToolFilterConfig();
      expect(config.enabledToolGroups).toEqual(['readonly', 'readwrite']);
    });

    it('should filter invalid tool groups', () => {
      process.env.DYNAMODB_ENABLED_TOOL_GROUPS = 'readonly,invalid,admin';
      const config = parseToolFilterConfig();
      expect(config.enabledToolGroups).toEqual(['readonly', 'admin']);
    });

    it('should parse enabled tools whitelist', () => {
      process.env.DYNAMODB_ENABLED_TOOLS = 'get_item,query_items';
      const config = parseToolFilterConfig();
      expect(config.enabledTools).toEqual(['get_item', 'query_items']);
    });

    it('should filter invalid tool names', () => {
      process.env.DYNAMODB_ENABLED_TOOLS = 'get_item,invalid_tool,scan_table';
      const config = parseToolFilterConfig();
      expect(config.enabledTools).toEqual(['get_item', 'scan_table']);
    });

    it('should parse disabled tools blacklist', () => {
      process.env.DYNAMODB_DISABLED_TOOLS = 'delete_table,create_table';
      const config = parseToolFilterConfig();
      expect(config.disabledTools).toEqual(['delete_table', 'create_table']);
    });

    it('should handle whitespace in tool lists', () => {
      process.env.DYNAMODB_ENABLED_TOOL_GROUPS = ' readonly , readwrite ';
      const config = parseToolFilterConfig();
      expect(config.enabledToolGroups).toEqual(['readonly', 'readwrite']);
    });

    it('should handle case insensitivity', () => {
      process.env.DYNAMODB_ENABLED_TOOL_GROUPS = 'READONLY,ReadWrite';
      const config = parseToolFilterConfig();
      expect(config.enabledToolGroups).toEqual(['readonly', 'readwrite']);
    });
  });
});
