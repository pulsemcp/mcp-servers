import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSSHConfigFromEnv } from '../../shared/src/server.js';

describe('SSH Config from Environment', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    // Set required env vars
    process.env.SSH_HOST = 'test-host';
    process.env.SSH_USERNAME = 'test-user';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('SSH_COMMAND_TIMEOUT', () => {
    it('should use default when not set', () => {
      delete process.env.SSH_COMMAND_TIMEOUT;

      const config = createSSHConfigFromEnv();

      expect(config.commandTimeout).toBeUndefined();
    });

    it('should parse valid timeout value', () => {
      process.env.SSH_COMMAND_TIMEOUT = '300000';

      const config = createSSHConfigFromEnv();

      expect(config.commandTimeout).toBe(300000);
    });

    it('should throw error for invalid timeout value', () => {
      process.env.SSH_COMMAND_TIMEOUT = 'invalid';

      expect(() => createSSHConfigFromEnv()).toThrow(
        'Invalid SSH_COMMAND_TIMEOUT: invalid. Must be a non-negative number.'
      );
    });

    it('should throw error for negative timeout value', () => {
      process.env.SSH_COMMAND_TIMEOUT = '-1000';

      expect(() => createSSHConfigFromEnv()).toThrow(
        'Invalid SSH_COMMAND_TIMEOUT: -1000. Must be a non-negative number.'
      );
    });

    it('should accept zero timeout value', () => {
      process.env.SSH_COMMAND_TIMEOUT = '0';

      const config = createSSHConfigFromEnv();

      expect(config.commandTimeout).toBe(0);
    });
  });

  describe('SSH_TIMEOUT (connection timeout)', () => {
    it('should use default (30000ms) when not set', () => {
      delete process.env.SSH_TIMEOUT;

      const config = createSSHConfigFromEnv();

      expect(config.timeout).toBe(30000);
    });

    it('should parse valid timeout value', () => {
      process.env.SSH_TIMEOUT = '60000';

      const config = createSSHConfigFromEnv();

      expect(config.timeout).toBe(60000);
    });

    it('should throw error for invalid timeout value', () => {
      process.env.SSH_TIMEOUT = 'invalid';

      expect(() => createSSHConfigFromEnv()).toThrow(
        'Invalid SSH_TIMEOUT: invalid. Must be a non-negative number.'
      );
    });
  });
});
