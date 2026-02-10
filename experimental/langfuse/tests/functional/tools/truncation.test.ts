import { describe, it, expect, beforeEach } from 'vitest';
import { truncateLargeFields, resetFileCounter } from '../../../shared/src/truncation.js';
import { readFileSync, existsSync, unlinkSync } from 'fs';

describe('truncation utility', () => {
  const tmpFiles: string[] = [];

  beforeEach(() => {
    resetFileCounter();
  });

  // Clean up tmp files after each test
  afterEach(() => {
    for (const f of tmpFiles) {
      try {
        if (existsSync(f)) unlinkSync(f);
      } catch {
        // ignore
      }
    }
    tmpFiles.length = 0;
  });

  it('should pass through short strings unchanged', () => {
    const result = truncateLargeFields({ name: 'short string' });
    expect(result).toEqual({ name: 'short string' });
  });

  it('should pass through non-string types unchanged', () => {
    const result = truncateLargeFields({ count: 42, active: true, data: null });
    expect(result).toEqual({ count: 42, active: true, data: null });
  });

  it('should truncate strings longer than 1000 characters', () => {
    const longStr = 'A'.repeat(1500);
    const result = truncateLargeFields({ content: longStr }) as Record<string, string>;
    const truncated = result.content;

    expect(truncated).toContain('TRUNCATED');
    expect(truncated).toContain('/tmp/langfuse_');
    expect(truncated).toContain('1500 chars');
    expect(truncated).toContain('grep');
    // Starts with the preview
    expect(truncated.startsWith('A'.repeat(1000))).toBe(true);

    // Extract tmp path and verify the file was written
    const pathMatch = truncated.match(/\/tmp\/langfuse_\S+\.txt/);
    expect(pathMatch).not.toBeNull();
    if (pathMatch) {
      tmpFiles.push(pathMatch[0]);
      const fileContent = readFileSync(pathMatch[0], 'utf-8');
      expect(fileContent).toBe(longStr);
    }
  });

  it('should handle nested objects', () => {
    const result = truncateLargeFields({
      outer: { inner: 'short' },
    }) as Record<string, Record<string, string>>;

    expect(result.outer.inner).toBe('short');
  });

  it('should handle arrays', () => {
    const result = truncateLargeFields({
      items: ['short', 'also short'],
    }) as Record<string, string[]>;

    expect(result.items).toEqual(['short', 'also short']);
  });

  it('should truncate strings inside nested objects and arrays', () => {
    const longStr = 'B'.repeat(1100);
    const result = truncateLargeFields({
      data: [{ text: longStr }],
    }) as Record<string, Array<Record<string, string>>>;

    const truncated = result.data[0].text;
    expect(truncated).toContain('TRUNCATED');
    expect(truncated).toContain('/tmp/langfuse_');

    const pathMatch = truncated.match(/\/tmp\/langfuse_\S+\.txt/);
    if (pathMatch) tmpFiles.push(pathMatch[0]);
  });
});
