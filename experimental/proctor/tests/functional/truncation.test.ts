import { describe, it, expect } from 'vitest';
import { truncateStrings, deepClone } from '../../shared/src/utils/truncation.js';

describe('truncateStrings', () => {
  it('should truncate strings longer than 200 characters', () => {
    const longString = 'a'.repeat(500);
    const result = truncateStrings({ text: longString });

    const text = (result as Record<string, unknown>).text as string;
    expect(text).toBe('[TRUNCATED - use expand_fields: ["text"] to see full content]');
  });

  it('should include specific path in truncation message', () => {
    const longString = 'a'.repeat(500);
    const result = truncateStrings({ result: { description: longString } });

    const resultObj = (result as Record<string, unknown>).result as Record<string, unknown>;
    const desc = resultObj.description as string;
    expect(desc).toBe(
      '[TRUNCATED - use expand_fields: ["result.description"] to see full content]'
    );
  });

  it('should use wildcard notation for array paths in truncation message', () => {
    const longString = 'a'.repeat(500);
    const result = truncateStrings({
      tools: [{ description: longString }],
    });

    const tools = (result as Record<string, unknown>).tools as Array<Record<string, unknown>>;
    const desc = tools[0].description as string;
    expect(desc).toBe(
      '[TRUNCATED - use expand_fields: ["tools[].description"] to see full content]'
    );
  });

  it('should not truncate strings shorter than 200 characters', () => {
    const shortString = 'a'.repeat(100);
    const result = truncateStrings({ text: shortString });

    expect((result as Record<string, unknown>).text).toBe(shortString);
  });

  it('should handle nested objects', () => {
    const longString = 'b'.repeat(250);
    const result = truncateStrings({
      result: {
        description: longString,
        name: 'short',
      },
    });

    const resultObj = (result as Record<string, unknown>).result as Record<string, unknown>;
    expect(resultObj.description).toBe(
      '[TRUNCATED - use expand_fields: ["result.description"] to see full content]'
    );
    expect(resultObj.name).toBe('short');
  });

  it('should handle arrays', () => {
    const longString = 'c'.repeat(250);
    const result = truncateStrings({
      tools: [{ description: longString }, { description: 'short' }],
    });

    const tools = (result as Record<string, unknown>).tools as Array<Record<string, unknown>>;
    expect(tools[0].description).toBe(
      '[TRUNCATED - use expand_fields: ["tools[].description"] to see full content]'
    );
    expect(tools[1].description).toBe('short');
  });

  it('should expand specified fields', () => {
    const longString = 'd'.repeat(250);
    const result = truncateStrings({ result: { description: longString } }, ['result.description']);

    const resultObj = (result as Record<string, unknown>).result as Record<string, unknown>;
    expect(resultObj.description).toBe(longString);
  });

  it('should expand array fields using [] notation', () => {
    const longString = 'e'.repeat(250);
    const result = truncateStrings(
      {
        tools: [{ inputSchema: longString }, { inputSchema: longString }],
      },
      ['tools[].inputSchema']
    );

    const tools = (result as Record<string, unknown>).tools as Array<Record<string, unknown>>;
    expect(tools[0].inputSchema).toBe(longString);
    expect(tools[1].inputSchema).toBe(longString);
  });

  it('should handle null and undefined values', () => {
    const result = truncateStrings({
      nullField: null,
      undefinedField: undefined,
      validField: 'test',
    });

    const obj = result as Record<string, unknown>;
    expect(obj.nullField).toBeNull();
    expect(obj.undefinedField).toBeUndefined();
    expect(obj.validField).toBe('test');
  });

  it('should handle numbers and booleans', () => {
    const result = truncateStrings({
      count: 42,
      passed: true,
    });

    const obj = result as Record<string, unknown>;
    expect(obj.count).toBe(42);
    expect(obj.passed).toBe(true);
  });

  it('should truncate deep objects (depth >= 6) larger than 500 chars', () => {
    const largeDeepObject = {
      field1: 'a'.repeat(100),
      field2: 'b'.repeat(100),
      field3: 'c'.repeat(100),
      field4: 'd'.repeat(100),
      field5: 'e'.repeat(100),
      nested: { more: 'data' },
    };

    const result = truncateStrings({
      results: [
        {
          tools: {
            meta: {
              version: {
                details: largeDeepObject,
              },
            },
          },
        },
      ],
    });

    const results = (result as Record<string, unknown>).results as Array<Record<string, unknown>>;
    const tools = results[0].tools as Record<string, unknown>;
    const meta = tools.meta as Record<string, unknown>;
    const version = meta.version as Record<string, unknown>;
    const details = version.details as string;

    expect(details).toBe(
      '[DEEP OBJECT TRUNCATED - use expand_fields: ["results[].tools.meta.version.details"] to see full content]'
    );
  });

  it('should allow expanding deep truncated objects', () => {
    const largeDeepObject = {
      field1: 'a'.repeat(200),
      field2: 'b'.repeat(200),
      field3: 'c'.repeat(200),
    };

    const result = truncateStrings(
      {
        results: [
          {
            tools: {
              meta: {
                version: {
                  details: largeDeepObject,
                },
              },
            },
          },
        ],
      },
      ['results[].tools.meta.version.details']
    );

    const results = (result as Record<string, unknown>).results as Array<Record<string, unknown>>;
    const tools = results[0].tools as Record<string, unknown>;
    const meta = tools.meta as Record<string, unknown>;
    const version = meta.version as Record<string, unknown>;
    const details = version.details as Record<string, unknown>;

    expect(typeof details).toBe('object');
    expect(details.field1).toBe('a'.repeat(200));
  });
});

describe('deepClone', () => {
  it('should create a deep copy of an object', () => {
    const original = {
      a: 1,
      b: { c: 2 },
      d: [1, 2, 3],
    };

    const cloned = deepClone(original);

    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned.b).not.toBe(original.b);
    expect(cloned.d).not.toBe(original.d);
  });
});
