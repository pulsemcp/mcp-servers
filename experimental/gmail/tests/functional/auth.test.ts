import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createDefaultClient,
  OAuth2GmailClient,
  ServiceAccountGmailClient,
} from '../../shared/src/server.js';

describe('Authentication Modes', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Create a clean copy for each test
    process.env = { ...originalEnv };
    // Clear all Gmail-related env vars
    delete process.env.GMAIL_OAUTH_CLIENT_ID;
    delete process.env.GMAIL_OAUTH_CLIENT_SECRET;
    delete process.env.GMAIL_OAUTH_REFRESH_TOKEN;
    delete process.env.GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL;
    delete process.env.GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY;
    delete process.env.GMAIL_IMPERSONATE_EMAIL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createDefaultClient', () => {
    it('should create OAuth2GmailClient when OAuth2 env vars are set', () => {
      process.env.GMAIL_OAUTH_CLIENT_ID = 'test-client-id';
      process.env.GMAIL_OAUTH_CLIENT_SECRET = 'test-client-secret';
      process.env.GMAIL_OAUTH_REFRESH_TOKEN = 'test-refresh-token';

      const client = createDefaultClient();
      expect(client).toBeInstanceOf(OAuth2GmailClient);
    });

    it('should create ServiceAccountGmailClient when service account env vars are set', () => {
      process.env.GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL = 'test@project.iam.gserviceaccount.com';
      process.env.GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY =
        '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----';
      process.env.GMAIL_IMPERSONATE_EMAIL = 'user@domain.com';

      const client = createDefaultClient();
      expect(client).toBeInstanceOf(ServiceAccountGmailClient);
    });

    it('should prefer OAuth2 when both credential sets are present', () => {
      process.env.GMAIL_OAUTH_CLIENT_ID = 'test-client-id';
      process.env.GMAIL_OAUTH_CLIENT_SECRET = 'test-client-secret';
      process.env.GMAIL_OAUTH_REFRESH_TOKEN = 'test-refresh-token';
      process.env.GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL = 'test@project.iam.gserviceaccount.com';
      process.env.GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY =
        '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----';
      process.env.GMAIL_IMPERSONATE_EMAIL = 'user@domain.com';

      const client = createDefaultClient();
      expect(client).toBeInstanceOf(OAuth2GmailClient);
    });

    it('should throw when no credentials are set', () => {
      expect(() => createDefaultClient()).toThrow(
        'GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL environment variable must be set'
      );
    });

    it('should throw when only partial OAuth2 credentials are set', () => {
      process.env.GMAIL_OAUTH_CLIENT_ID = 'test-client-id';
      // Missing GMAIL_OAUTH_CLIENT_SECRET and GMAIL_OAUTH_REFRESH_TOKEN

      // Should fall through to service account mode and fail
      expect(() => createDefaultClient()).toThrow(
        'GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL environment variable must be set'
      );
    });

    it('should throw when service account is missing private key', () => {
      process.env.GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL = 'test@project.iam.gserviceaccount.com';
      // Missing GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY

      expect(() => createDefaultClient()).toThrow(
        'GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY environment variable must be set'
      );
    });

    it('should throw when service account is missing impersonate email', () => {
      process.env.GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL = 'test@project.iam.gserviceaccount.com';
      process.env.GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY =
        '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----';
      // Missing GMAIL_IMPERSONATE_EMAIL

      expect(() => createDefaultClient()).toThrow(
        'GMAIL_IMPERSONATE_EMAIL environment variable must be set'
      );
    });
  });

  describe('OAuth2GmailClient', () => {
    it('should be constructable with required parameters', () => {
      const client = new OAuth2GmailClient('client-id', 'client-secret', 'refresh-token');
      expect(client).toBeInstanceOf(OAuth2GmailClient);
    });

    it('should implement IGmailClient interface methods', () => {
      const client = new OAuth2GmailClient('client-id', 'client-secret', 'refresh-token');
      expect(typeof client.listMessages).toBe('function');
      expect(typeof client.getMessage).toBe('function');
      expect(typeof client.modifyMessage).toBe('function');
      expect(typeof client.createDraft).toBe('function');
      expect(typeof client.getDraft).toBe('function');
      expect(typeof client.listDrafts).toBe('function');
      expect(typeof client.deleteDraft).toBe('function');
      expect(typeof client.sendMessage).toBe('function');
      expect(typeof client.sendDraft).toBe('function');
    });
  });
});
