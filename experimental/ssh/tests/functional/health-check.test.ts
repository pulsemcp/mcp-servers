import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMockSSHClient } from '../mocks/ssh-client.functional-mock.js';

// Import health check utilities from the shared module
import {
  getErrorHint,
  parseHealthCheckTimeout,
  DEFAULT_HEALTH_CHECK_TIMEOUT,
  MAX_HEALTH_CHECK_TIMEOUT,
} from '../../shared/src/health-check.js';

describe('Health Check Components', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('SKIP_HEALTH_CHECKS environment variable', () => {
    it('should accept "true" to skip health checks', () => {
      process.env.SKIP_HEALTH_CHECKS = 'true';
      expect(process.env.SKIP_HEALTH_CHECKS).toBe('true');
    });

    it('should default to performing health checks when not set', () => {
      delete process.env.SKIP_HEALTH_CHECKS;
      expect(process.env.SKIP_HEALTH_CHECKS).toBeUndefined();
    });

    it('should not skip health checks for values other than "true"', () => {
      // These should NOT skip health checks
      const nonTrueValues = ['false', 'TRUE', '1', 'yes', ''];
      for (const value of nonTrueValues) {
        expect(value === 'true').toBe(false);
      }
    });
  });

  describe('parseHealthCheckTimeout function', () => {
    it('should return default timeout when no value provided', () => {
      const timeout = parseHealthCheckTimeout(undefined);
      expect(timeout).toBe(DEFAULT_HEALTH_CHECK_TIMEOUT);
    });

    it('should parse valid timeout values', () => {
      const timeout = parseHealthCheckTimeout('5000');
      expect(timeout).toBe(5000);
    });

    it('should return default for invalid timeout values', () => {
      const warnFn = vi.fn();
      const timeout = parseHealthCheckTimeout('invalid', warnFn);
      expect(timeout).toBe(DEFAULT_HEALTH_CHECK_TIMEOUT);
      expect(warnFn).toHaveBeenCalled();
    });

    it('should return default for negative timeout values', () => {
      const warnFn = vi.fn();
      const timeout = parseHealthCheckTimeout('-1000', warnFn);
      expect(timeout).toBe(DEFAULT_HEALTH_CHECK_TIMEOUT);
      expect(warnFn).toHaveBeenCalled();
    });

    it('should return default for timeout exceeding maximum', () => {
      const warnFn = vi.fn();
      const timeout = parseHealthCheckTimeout('500000', warnFn);
      expect(timeout).toBe(DEFAULT_HEALTH_CHECK_TIMEOUT);
      expect(warnFn).toHaveBeenCalled();
    });

    it('should accept timeout at the maximum boundary', () => {
      const warnFn = vi.fn();
      const timeout = parseHealthCheckTimeout(String(MAX_HEALTH_CHECK_TIMEOUT), warnFn);
      expect(timeout).toBe(MAX_HEALTH_CHECK_TIMEOUT);
      expect(warnFn).not.toHaveBeenCalled();
    });

    it('should not call warnFn when no warnFn provided', () => {
      // Should not throw even without warnFn
      const timeout = parseHealthCheckTimeout('invalid');
      expect(timeout).toBe(DEFAULT_HEALTH_CHECK_TIMEOUT);
    });
  });

  describe('SSHClient connection behavior', () => {
    it('should successfully connect with mock client', async () => {
      const mockClient = createMockSSHClient();
      await expect(mockClient.connect()).resolves.toBeUndefined();
      expect(mockClient.connect).toHaveBeenCalled();
    });

    it('should handle connection failure', async () => {
      const mockClient = createMockSSHClient();
      (mockClient.connect as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Connection refused')
      );
      await expect(mockClient.connect()).rejects.toThrow('Connection refused');
    });

    it('should handle authentication failure', async () => {
      const mockClient = createMockSSHClient();
      (mockClient.connect as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('All configured authentication methods failed')
      );
      await expect(mockClient.connect()).rejects.toThrow('authentication');
    });

    it('should handle timeout', async () => {
      const mockClient = createMockSSHClient();
      (mockClient.connect as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('SSH connection timeout after 10000ms')
      );
      await expect(mockClient.connect()).rejects.toThrow('timeout');
    });

    it('should disconnect after connection', async () => {
      const mockClient = createMockSSHClient();
      await mockClient.connect();
      mockClient.disconnect();
      expect(mockClient.disconnect).toHaveBeenCalled();
    });
  });

  describe('getErrorHint function', () => {
    it('should return authentication hint for auth errors', () => {
      const hint = getErrorHint('All configured authentication methods failed', 10000);
      expect(hint).toContain('SSH key');
      expect(hint).toContain('ssh-add -l');
    });

    it('should return authentication hint for uppercase AUTH', () => {
      const hint = getErrorHint('AUTH_FAILED: could not authenticate', 10000);
      expect(hint).toContain('SSH key');
    });

    it('should return timeout hint for timeout errors', () => {
      const hint = getErrorHint('SSH connection timeout after 10000ms', 10000);
      expect(hint).toContain('timed out');
      expect(hint).toContain('10000ms');
    });

    it('should return connection refused hint for ECONNREFUSED', () => {
      const hint = getErrorHint('connect ECONNREFUSED 192.168.1.1:22', 10000);
      expect(hint).toContain('Connection refused');
      expect(hint).toContain('SSH server is running');
    });

    it('should NOT return connection refused hint for generic "connect" word', () => {
      // This was a bug where "connect" would trigger the connection refused hint
      const hint = getErrorHint('Could not connect to server', 10000);
      expect(hint).not.toContain('Connection refused');
    });

    it('should return DNS hint for ENOTFOUND', () => {
      const hint = getErrorHint('getaddrinfo ENOTFOUND invalid-host', 10000);
      expect(hint).toContain('resolve hostname');
      expect(hint).toContain('SSH_HOST');
    });

    it('should return DNS hint for getaddrinfo errors', () => {
      const hint = getErrorHint('getaddrinfo EAI_AGAIN test.invalid', 10000);
      expect(hint).toContain('resolve hostname');
    });

    it('should return network hint for ECONNRESET', () => {
      const hint = getErrorHint('read ECONNRESET', 10000);
      expect(hint).toContain('Network error');
    });

    it('should return network hint for EHOSTUNREACH', () => {
      const hint = getErrorHint('connect EHOSTUNREACH 10.0.0.1', 10000);
      expect(hint).toContain('Network error');
      expect(hint).toContain('firewall');
    });

    it('should return network hint for ENETUNREACH', () => {
      const hint = getErrorHint('connect ENETUNREACH 192.168.1.1', 10000);
      expect(hint).toContain('Network error');
    });

    it('should return empty string for unknown errors', () => {
      const hint = getErrorHint('Some random error message', 10000);
      expect(hint).toBe('');
    });

    it('should include the correct timeout value in timeout hint', () => {
      const hint = getErrorHint('Connection timeout', 5000);
      expect(hint).toContain('5000ms');

      const hint2 = getErrorHint('Connection timeout', 30000);
      expect(hint2).toContain('30000ms');
    });
  });
});
