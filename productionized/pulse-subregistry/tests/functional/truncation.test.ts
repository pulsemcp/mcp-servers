import { describe, it, expect } from 'vitest';
import { truncateStrings, deepClone } from '../../shared/src/utils/truncation.js';

describe('truncateStrings', () => {
  it('should truncate strings longer than 200 characters', () => {
    const longString = 'a'.repeat(500);
    const result = truncateStrings({ text: longString });

    const text = (result as Record<string, unknown>).text as string;
    // Should be replaced with truncation message (no original content)
    expect(text).toBe('[TRUNCATED - use expand_fields: ["text"] to see full content]');
  });

  it('should include specific path in truncation message', () => {
    const longString = 'a'.repeat(500);
    const result = truncateStrings({ server: { description: longString } });

    const server = (result as Record<string, unknown>).server as Record<string, unknown>;
    const desc = server.description as string;
    expect(desc).toBe(
      '[TRUNCATED - use expand_fields: ["server.description"] to see full content]'
    );
  });

  it('should use wildcard notation for array paths in truncation message', () => {
    const longString = 'a'.repeat(500);
    const result = truncateStrings({
      servers: [{ description: longString }],
    });

    const servers = (result as Record<string, unknown>).servers as Array<Record<string, unknown>>;
    const desc = servers[0].description as string;
    expect(desc).toBe(
      '[TRUNCATED - use expand_fields: ["servers[].description"] to see full content]'
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
      server: {
        description: longString,
        name: 'short',
      },
    });

    const server = (result as Record<string, unknown>).server as Record<string, unknown>;
    expect(server.description).toBe(
      '[TRUNCATED - use expand_fields: ["server.description"] to see full content]'
    );
    expect(server.name).toBe('short');
  });

  it('should handle arrays', () => {
    const longString = 'c'.repeat(250);
    const result = truncateStrings({
      servers: [{ description: longString }, { description: 'short' }],
    });

    const servers = (result as Record<string, unknown>).servers as Array<Record<string, unknown>>;
    expect(servers[0].description).toBe(
      '[TRUNCATED - use expand_fields: ["servers[].description"] to see full content]'
    );
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

  it('should truncate deep objects (depth >= 6) larger than 500 chars', () => {
    // Depth 6 example: servers[0].server.meta.version.details = 1+1+1+1+1+1 = 6
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
          server: {
            meta: {
              version: {
                details: largeDeepObject,
              },
            },
          },
        },
      ],
    });

    const servers = (result as Record<string, unknown>).servers as Array<Record<string, unknown>>;
    const server = servers[0].server as Record<string, unknown>;
    const meta = server.meta as Record<string, unknown>;
    const version = meta.version as Record<string, unknown>;
    const details = version.details as string;

    // Should be replaced with truncation message (keeps JSON valid)
    expect(details).toBe(
      '[DEEP OBJECT TRUNCATED - use expand_fields: ["servers[].server.meta.version.details"] to see full content]'
    );
  });

  it('should not truncate objects at depth 5 (only truncate at depth >= 6)', () => {
    // Depth 5 example: servers[0].server.meta.tools = 1+1+1+1+1 = 5
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
          server: {
            meta: {
              tools: largeDeepObject,
            },
          },
        },
      ],
    });

    const servers = (result as Record<string, unknown>).servers as Array<Record<string, unknown>>;
    const server = servers[0].server as Record<string, unknown>;
    const meta = server.meta as Record<string, unknown>;
    const tools = meta.tools as Record<string, unknown>;

    // Should still be an object at depth 5
    expect(typeof tools).toBe('object');
    expect(tools.field1).toBe('a'.repeat(100));
    expect(tools.field2).toBe('b'.repeat(100));
  });

  it('should not truncate deep objects smaller than 500 chars', () => {
    // Create a small object at depth 6: servers[0].server.meta.version.details = 6
    const smallDeepObject = {
      field1: 'small',
      field2: 'value',
    };

    const result = truncateStrings({
      servers: [
        {
          server: {
            meta: {
              version: {
                details: smallDeepObject,
              },
            },
          },
        },
      ],
    });

    const servers = (result as Record<string, unknown>).servers as Array<Record<string, unknown>>;
    const server = servers[0].server as Record<string, unknown>;
    const meta = server.meta as Record<string, unknown>;
    const version = meta.version as Record<string, unknown>;
    const details = version.details as Record<string, unknown>;

    // Should still be an object, not truncated (small object)
    expect(typeof details).toBe('object');
    expect(details.field1).toBe('small');
    expect(details.field2).toBe('value');
  });

  it('should not truncate objects at depth < 6 regardless of size', () => {
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
    // At depth 4, strings > 200 chars are replaced with truncation message
    expect(server.field1).toBe(
      '[TRUNCATED - use expand_fields: ["servers[].server.field1"] to see full content]'
    );
    expect(server.field2).toBe(
      '[TRUNCATED - use expand_fields: ["servers[].server.field2"] to see full content]'
    );
  });

  it('should allow expanding deep truncated objects', () => {
    // Large object at depth 6: servers[0].server.meta.version.details
    const largeDeepObject = {
      field1: 'a'.repeat(200),
      field2: 'b'.repeat(200),
      field3: 'c'.repeat(200),
    };

    const result = truncateStrings(
      {
        servers: [
          {
            server: {
              meta: {
                version: {
                  details: largeDeepObject,
                },
              },
            },
          },
        ],
      },
      ['servers[].server.meta.version.details']
    );

    const servers = (result as Record<string, unknown>).servers as Array<Record<string, unknown>>;
    const server = servers[0].server as Record<string, unknown>;
    const meta = server.meta as Record<string, unknown>;
    const version = meta.version as Record<string, unknown>;
    const details = version.details as Record<string, unknown>;

    // Should be expanded (object preserved, no deep truncation)
    // Inner strings are also preserved because the whole path is expanded
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
