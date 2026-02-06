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
      process.env.DYNAMODB_ENABLED_TOOLS = 'dynamodb_get_item,dynamodb_query';
      const config = parseToolFilterConfig();
      expect(config.enabledTools).toEqual(['dynamodb_get_item', 'dynamodb_query']);
    });

    it('should filter invalid tool names', () => {
      process.env.DYNAMODB_ENABLED_TOOLS = 'dynamodb_get_item,invalid_tool,dynamodb_scan';
      const config = parseToolFilterConfig();
      expect(config.enabledTools).toEqual(['dynamodb_get_item', 'dynamodb_scan']);
    });

    it('should parse disabled tools blacklist', () => {
      process.env.DYNAMODB_DISABLED_TOOLS = 'dynamodb_delete_table,dynamodb_create_table';
      const config = parseToolFilterConfig();
      expect(config.disabledTools).toEqual(['dynamodb_delete_table', 'dynamodb_create_table']);
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
