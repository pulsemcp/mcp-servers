import { describe, it, expect } from 'vitest';
import { truncateStrings, deepClone } from '../../shared/src/utils/truncation.js';

describe('truncateStrings', () => {
  it('should truncate strings longer than 200 characters', () => {
    const longString = 'a'.repeat(500);
    const result = truncateStrings({ text: longString });

    const text = (result as Record<string, unknown>).text as string;
    expect(text).toContain('... [TRUNCATED');
    // Should start with 200 chars + truncation suffix
    expect(text.startsWith('a'.repeat(200))).toBe(true);
    expect(text.length).toBeLessThan(longString.length);
  });

  it('should not truncate strings shorter than 200 characters', () => {
    const shortString = 'a'.repeat(100);
    const result = truncateStrings({ text: shortString });

    expect((result as Record<string, unknown>).text).toBe(shortString);
  });

  it('should handle nested objects', () => {
    const longString = 'b'.repeat(250);
    const result = truncateStrings({
      server: {
        description: longString,
        name: 'short',
      },
    });

    const server = (result as Record<string, unknown>).server as Record<string, unknown>;
    expect(server.description).toContain('... [TRUNCATED');
    expect(server.name).toBe('short');
  });

  it('should handle arrays', () => {
    const longString = 'c'.repeat(250);
    const result = truncateStrings({
      servers: [{ description: longString }, { description: 'short' }],
    });

    const servers = (result as Record<string, unknown>).servers as Array<Record<string, unknown>>;
    expect(servers[0].description).toContain('... [TRUNCATED');
    expect(servers[1].description).toBe('short');
  });

  it('should expand specified fields', () => {
    const longString = 'd'.repeat(250);
    const result = truncateStrings({ server: { description: longString } }, ['server.description']);

    const server = (result as Record<string, unknown>).server as Record<string, unknown>;
    expect(server.description).toBe(longString);
  });

  it('should expand array fields using [] notation', () => {
    const longString = 'e'.repeat(250);
    const result = truncateStrings(
      {
        servers: [{ server: { description: longString } }, { server: { description: longString } }],
      },
      ['servers[].server.description']
    );

    const servers = (result as Record<string, unknown>).servers as Array<Record<string, unknown>>;
    const server0 = servers[0].server as Record<string, unknown>;
    const server1 = servers[1].server as Record<string, unknown>;
    expect(server0.description).toBe(longString);
    expect(server1.description).toBe(longString);
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
      enabled: true,
    });

    const obj = result as Record<string, unknown>;
    expect(obj.count).toBe(42);
    expect(obj.enabled).toBe(true);
  });

  it('should expand nested fields within expanded paths', () => {
    const longString = 'f'.repeat(250);
    const result = truncateStrings(
      {
        server: {
          packages: [{ readme: longString }],
        },
      },
      ['server.packages[].readme']
    );

    const server = (result as Record<string, unknown>).server as Record<string, unknown>;
    const packages = server.packages as Array<Record<string, unknown>>;
    expect(packages[0].readme).toBe(longString);
  });

  it('should truncate deep objects (depth >= 4) larger than 500 chars', () => {
    // Create a structure where depth 4 has a large object
    // servers[0]._meta['com.pulsemcp/server'] is depth 4
    const largeDeepObject = {
      field1: 'a'.repeat(100),
      field2: 'b'.repeat(100),
      field3: 'c'.repeat(100),
      field4: 'd'.repeat(100),
      field5: 'e'.repeat(100),
      nested: { more: 'data' },
    };

    const result = truncateStrings({
      servers: [
        {
          _meta: {
            'com.pulsemcp/server': largeDeepObject,
          },
        },
      ],
    });

    const servers = (result as Record<string, unknown>).servers as Array<Record<string, unknown>>;
    const meta = servers[0]._meta as Record<string, unknown>;
    const pulseMeta = meta['com.pulsemcp/server'] as string;

    // Should be truncated to a string with the truncation suffix
    expect(typeof pulseMeta).toBe('string');
    expect(pulseMeta).toContain('DEEP OBJECT TRUNCATED');
  });

  it('should not truncate deep objects smaller than 500 chars', () => {
    // Create a small object at depth 4
    const smallDeepObject = {
      field1: 'small',
      field2: 'value',
    };

    const result = truncateStrings({
      servers: [
        {
          _meta: {
            'com.pulsemcp/server': smallDeepObject,
          },
        },
      ],
    });

    const servers = (result as Record<string, unknown>).servers as Array<Record<string, unknown>>;
    const meta = servers[0]._meta as Record<string, unknown>;
    const pulseMeta = meta['com.pulsemcp/server'] as Record<string, unknown>;

    // Should still be an object, not truncated
    expect(typeof pulseMeta).toBe('object');
    expect(pulseMeta.field1).toBe('small');
    expect(pulseMeta.field2).toBe('value');
  });

  it('should not truncate objects at depth < 4 regardless of size', () => {
    // servers[0].server is depth 3, should not be truncated even if large
    const largeObject = {
      field1: 'a'.repeat(600),
      field2: 'b'.repeat(600),
      field3: 'c'.repeat(600),
    };

    const result = truncateStrings({
      servers: [
        {
          server: largeObject,
        },
      ],
    });

    const servers = (result as Record<string, unknown>).servers as Array<Record<string, unknown>>;
    const server = servers[0].server as Record<string, unknown>;

    // Should still be an object (object structure preserved at depth 3)
    // Strings inside at depth 4 (servers[0].server.field1) will be truncated
    expect(typeof server).toBe('object');
    // At depth 4, strings > 200 chars are truncated
    expect(server.field1).toContain('... [TRUNCATED');
    expect(server.field2).toContain('... [TRUNCATED');
  });

  it('should allow expanding deep truncated objects', () => {
    const largeDeepObject = {
      field1: 'a'.repeat(200),
      field2: 'b'.repeat(200),
      field3: 'c'.repeat(200),
    };

    const result = truncateStrings(
      {
        servers: [
          {
            _meta: {
              'com.pulsemcp/server': largeDeepObject,
            },
          },
        ],
      },
      ['servers[]._meta.com.pulsemcp/server']
    );

    const servers = (result as Record<string, unknown>).servers as Array<Record<string, unknown>>;
    const meta = servers[0]._meta as Record<string, unknown>;
    const pulseMeta = meta['com.pulsemcp/server'] as Record<string, unknown>;

    // Should be expanded (object preserved, no deep truncation)
    // Inner strings are also preserved because the whole path is expanded
    expect(typeof pulseMeta).toBe('object');
    expect(pulseMeta.field1).toBe('a'.repeat(200));
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
