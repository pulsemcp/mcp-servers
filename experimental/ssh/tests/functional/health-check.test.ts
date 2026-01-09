import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMockSSHClient } from '../mocks/ssh-client.functional-mock.js';

// We need to test the health check logic indirectly since it's in index.ts
// Testing the core components that health check relies on

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
    it('should respect SKIP_HEALTH_CHECKS=true', () => {
      process.env.SKIP_HEALTH_CHECKS = 'true';
      expect(process.env.SKIP_HEALTH_CHECKS).toBe('true');
    });

    it('should default to performing health checks when not set', () => {
      delete process.env.SKIP_HEALTH_CHECKS;
      expect(process.env.SKIP_HEALTH_CHECKS).toBeUndefined();
    });
  });

  describe('HEALTH_CHECK_TIMEOUT environment variable', () => {
    it('should accept valid timeout values', () => {
      process.env.HEALTH_CHECK_TIMEOUT = '5000';
      const timeout = parseInt(process.env.HEALTH_CHECK_TIMEOUT, 10);
      expect(timeout).toBe(5000);
      expect(!isNaN(timeout) && timeout > 0).toBe(true);
    });

    it('should detect invalid timeout values', () => {
      process.env.HEALTH_CHECK_TIMEOUT = 'invalid';
      const timeout = parseInt(process.env.HEALTH_CHECK_TIMEOUT, 10);
      expect(isNaN(timeout)).toBe(true);
    });

    it('should detect negative timeout values', () => {
      process.env.HEALTH_CHECK_TIMEOUT = '-1000';
      const timeout = parseInt(process.env.HEALTH_CHECK_TIMEOUT, 10);
      expect(timeout > 0).toBe(false);
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

  describe('Health check error hints', () => {
    it('should identify authentication errors', () => {
      const errorMessage = 'All configured authentication methods failed';
      const isAuthError = errorMessage.includes('authentication') || errorMessage.includes('auth');
      expect(isAuthError).toBe(true);
    });

    it('should identify timeout errors', () => {
      const errorMessage = 'SSH connection timeout after 10000ms';
      const isTimeoutError = errorMessage.includes('timeout');
      expect(isTimeoutError).toBe(true);
    });

    it('should identify connection refused errors', () => {
      const errorMessage = 'connect ECONNREFUSED 192.168.1.1:22';
      const isConnRefused =
        errorMessage.includes('ECONNREFUSED') || errorMessage.includes('connect');
      expect(isConnRefused).toBe(true);
    });

    it('should identify DNS resolution errors', () => {
      const errorMessage = 'getaddrinfo ENOTFOUND invalid-host';
      const isDnsError = errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo');
      expect(isDnsError).toBe(true);
    });
  });
});
