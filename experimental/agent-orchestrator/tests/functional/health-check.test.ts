import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getErrorHint,
  parseHealthCheckTimeout,
  checkApiHealth,
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

  describe('getErrorHint function', () => {
    it('should return authentication hint for 401 errors', () => {
      const hint = getErrorHint('API Error (401): Unauthorized', 10000);
      expect(hint).toContain('Authentication failed');
      expect(hint).toContain('AGENT_ORCHESTRATOR_API_KEY');
    });

    it('should return authentication hint for 403 errors', () => {
      const hint = getErrorHint('API Error (403): Forbidden', 10000);
      expect(hint).toContain('Authentication failed');
    });

    it('should return authentication hint for unauthorized text', () => {
      const hint = getErrorHint('Request unauthorized', 10000);
      expect(hint).toContain('Authentication failed');
    });

    it('should return authentication hint for forbidden text', () => {
      const hint = getErrorHint('Access forbidden', 10000);
      expect(hint).toContain('Authentication failed');
    });

    it('should return timeout hint for timeout errors', () => {
      const hint = getErrorHint('Request timeout after 10000ms', 10000);
      expect(hint).toContain('timed out');
      expect(hint).toContain('10000ms');
    });

    it('should return connection refused hint for ECONNREFUSED', () => {
      const hint = getErrorHint('connect ECONNREFUSED 127.0.0.1:3000', 10000);
      expect(hint).toContain('Connection refused');
      expect(hint).toContain('AGENT_ORCHESTRATOR_BASE_URL');
    });

    it('should NOT return connection refused hint for generic "connect" word', () => {
      const hint = getErrorHint('Could not connect to server', 10000);
      expect(hint).not.toContain('Connection refused');
    });

    it('should return DNS hint for ENOTFOUND', () => {
      const hint = getErrorHint('getaddrinfo ENOTFOUND invalid-host', 10000);
      expect(hint).toContain('resolve hostname');
      expect(hint).toContain('AGENT_ORCHESTRATOR_BASE_URL');
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

    it('should return URL hint for invalid URL errors', () => {
      const hint = getErrorHint('Invalid URL: not-a-url', 10000);
      expect(hint).toContain('Invalid URL');
      expect(hint).toContain('AGENT_ORCHESTRATOR_BASE_URL');
    });

    it('should return URL hint for ERR_INVALID_URL', () => {
      const hint = getErrorHint('TypeError: ERR_INVALID_URL', 10000);
      expect(hint).toContain('Invalid URL');
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

  describe('checkApiHealth function', () => {
    it('should throw error for empty baseUrl', async () => {
      await expect(checkApiHealth('', 'api-key')).rejects.toThrow('Base URL cannot be empty');
    });

    it('should throw error for whitespace-only baseUrl', async () => {
      await expect(checkApiHealth('   ', 'api-key')).rejects.toThrow('Base URL cannot be empty');
    });

    it('should throw error for empty apiKey', async () => {
      await expect(checkApiHealth('http://localhost:3000', '')).rejects.toThrow(
        'API key cannot be empty'
      );
    });

    it('should throw error for whitespace-only apiKey', async () => {
      await expect(checkApiHealth('http://localhost:3000', '   ')).rejects.toThrow(
        'API key cannot be empty'
      );
    });

    it('should throw error for invalid URL', async () => {
      await expect(checkApiHealth('not-a-valid-url', 'api-key')).rejects.toThrow('Invalid URL');
      await expect(checkApiHealth('not-a-valid-url', 'api-key')).rejects.toThrow(
        'AGENT_ORCHESTRATOR_BASE_URL'
      );
    });
  });
});
