import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FilesystemStrategyConfigClient } from '../../shared/src/strategy-config/filesystem-client.js';
import type { StrategyConfigEntry } from '../../shared/src/strategy-config/types.js';
import { promises as fs } from 'fs';

// Mock fs
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  },
}));

describe('FilesystemStrategyConfigClient', () => {
  let client: FilesystemStrategyConfigClient;
  const mockReadFile = vi.mocked(fs.readFile);
  const mockWriteFile = vi.mocked(fs.writeFile);
  const mockMkdir = vi.mocked(fs.mkdir);

  beforeEach(() => {
    vi.clearAllMocks();
    client = new FilesystemStrategyConfigClient({
      configPath: '/test/config.md',
    });
  });

  describe('loadConfig', () => {
    it('should return empty array when file does not exist', async () => {
      mockReadFile.mockRejectedValue({ code: 'ENOENT' });

      const result = await client.loadConfig();

      expect(result).toEqual([]);
    });

    it('should parse markdown table correctly', async () => {
      const markdownContent = `# Scraping Strategy Configuration

| prefix | default_strategy | notes |
|--------|------------------|-------|
| example.com | firecrawl | Works well |
| reddit.com/r/ | brightdata | Needs anti-bot |
| github.com | native | Simple pages |
`;

      mockReadFile.mockResolvedValue(markdownContent);

      const result = await client.loadConfig();

      expect(result).toEqual([
        { prefix: 'example.com', default_strategy: 'firecrawl', notes: 'Works well' },
        { prefix: 'reddit.com/r/', default_strategy: 'brightdata', notes: 'Needs anti-bot' },
        { prefix: 'github.com', default_strategy: 'native', notes: 'Simple pages' },
      ]);
    });

    it('should handle malformed table gracefully', async () => {
      const markdownContent = `# Config
| prefix | default_strategy | notes |
|--------|------------------|-------|
| invalid.com | invalid_strategy | Should be ignored |
| valid.com | native | Should be included |
`;

      mockReadFile.mockResolvedValue(markdownContent);

      const result = await client.loadConfig();

      expect(result).toEqual([
        { prefix: 'valid.com', default_strategy: 'native', notes: 'Should be included' },
      ]);
    });
  });

  describe('saveConfig', () => {
    it('should generate correct markdown table', async () => {
      const config: StrategyConfigEntry[] = [
        { prefix: 'example.com', default_strategy: 'firecrawl', notes: 'Works well' },
        { prefix: 'github.com', default_strategy: 'native' },
      ];

      await client.saveConfig(config);

      expect(mockMkdir).toHaveBeenCalledWith('/test', { recursive: true });
      expect(mockWriteFile).toHaveBeenCalledWith(
        '/test/config.md',
        expect.stringContaining('| example.com | firecrawl | Works well |'),
        'utf-8'
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        '/test/config.md',
        expect.stringContaining('| github.com | native |  |'),
        'utf-8'
      );
    });
  });

  describe('getStrategyForUrl', () => {
    beforeEach(() => {
      const markdownContent = `# Config
| prefix | default_strategy | notes |
|--------|------------------|-------|
| reddit.com/r/ | brightdata | Specific path |
| reddit.com | firecrawl | General domain |
| github.com | native | Simple domain |
| example.com | firecrawl | Another domain |
`;

      mockReadFile.mockResolvedValue(markdownContent);
    });

    it('should match longest prefix first', async () => {
      const strategy = await client.getStrategyForUrl('https://reddit.com/r/programming');
      expect(strategy).toBe('brightdata');
    });

    it('should match domain when path prefix does not match', async () => {
      const strategy = await client.getStrategyForUrl('https://reddit.com/user/test');
      expect(strategy).toBe('firecrawl');
    });

    it('should match exact domain', async () => {
      const strategy = await client.getStrategyForUrl('https://github.com/user/repo');
      expect(strategy).toBe('native');
    });

    it('should handle www prefix', async () => {
      const strategy = await client.getStrategyForUrl('https://www.example.com/page');
      expect(strategy).toBe('firecrawl');
    });

    it('should return null for unknown domain', async () => {
      const strategy = await client.getStrategyForUrl('https://unknown.com/page');
      expect(strategy).toBeNull();
    });

    it('should handle invalid URLs', async () => {
      const strategy = await client.getStrategyForUrl('not-a-url');
      expect(strategy).toBeNull();
    });
  });

  describe('upsertEntry', () => {
    beforeEach(() => {
      const markdownContent = `# Config
| prefix | default_strategy | notes |
|--------|------------------|-------|
| example.com | native | Old strategy |
| github.com | native | Existing |
`;
      mockReadFile.mockResolvedValue(markdownContent);
    });

    it('should update existing entry', async () => {
      const newEntry: StrategyConfigEntry = {
        prefix: 'example.com',
        default_strategy: 'firecrawl',
        notes: 'Updated strategy',
      };

      await client.upsertEntry(newEntry);

      expect(mockWriteFile).toHaveBeenCalledWith(
        '/test/config.md',
        expect.stringContaining('| example.com | firecrawl | Updated strategy |'),
        'utf-8'
      );
    });

    it('should add new entry', async () => {
      const newEntry: StrategyConfigEntry = {
        prefix: 'new.com',
        default_strategy: 'brightdata',
        notes: 'New entry',
      };

      await client.upsertEntry(newEntry);

      expect(mockWriteFile).toHaveBeenCalledWith(
        '/test/config.md',
        expect.stringContaining('| new.com | brightdata | New entry |'),
        'utf-8'
      );
    });

    it('should sort entries by prefix length (longest first)', async () => {
      const newEntry: StrategyConfigEntry = {
        prefix: 'example.com/very/long/path',
        default_strategy: 'brightdata',
        notes: 'Long path',
      };

      await client.upsertEntry(newEntry);

      const writeCall = mockWriteFile.mock.calls[0];
      const content = writeCall[1] as string;
      const lines = content.split('\n');

      // Find the data rows (skip header and separator)
      const dataRows = lines.filter(
        (line) => line.startsWith('|') && !line.includes('prefix') && !line.includes('---')
      );

      // The longest prefix should come first
      expect(dataRows[0]).toContain('example.com/very/long/path');
    });
  });
});
