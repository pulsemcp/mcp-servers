import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runOAuthSetup } from '../../local/src/oauth-setup.js';

describe('OAuth Setup CLI', () => {
  const originalEnv = process.env;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.GMAIL_OAUTH_CLIENT_ID;
    delete process.env.GMAIL_OAUTH_CLIENT_SECRET;
    // Mock process.exit to prevent actually exiting
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('should exit with usage message when no credentials provided', async () => {
    await expect(runOAuthSetup([])).rejects.toThrow('process.exit called');

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('npx gmail-workspace-mcp-server oauth-setup')
    );
  });

  it('should exit with usage when only client_id is provided via args', async () => {
    await expect(runOAuthSetup(['my-client-id'])).rejects.toThrow('process.exit called');

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('npx gmail-workspace-mcp-server oauth-setup')
    );
  });

  it('should exit with usage when only client_id is provided via env', async () => {
    process.env.GMAIL_OAUTH_CLIENT_ID = 'env-client-id';

    await expect(runOAuthSetup([])).rejects.toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should exit with usage when only client_secret is provided via env', async () => {
    process.env.GMAIL_OAUTH_CLIENT_SECRET = 'env-client-secret';

    await expect(runOAuthSetup([])).rejects.toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should accept credentials from env vars and attempt OAuth flow', async () => {
    process.env.GMAIL_OAUTH_CLIENT_ID = 'test-client-id';
    process.env.GMAIL_OAUTH_CLIENT_SECRET = 'test-client-secret';

    // The function will try to start a server and generate an auth URL.
    // It will fail because there's no real OAuth server, but it should NOT
    // exit with usage errors - it should proceed to the OAuth flow.
    // We expect it to either succeed in starting the server or fail with
    // a non-usage error (e.g., timeout or port error).
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Use a port that's unlikely to conflict but will eventually timeout
    process.env.PORT = '0'; // Port 0 lets the OS assign a random port

    // Start the setup - it will wait for a callback that never comes.
    // We don't await it since it blocks waiting for OAuth callback.
    void runOAuthSetup([]);

    // Give it a moment to start the server and print the auth URL
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify it printed the OAuth setup header (meaning it passed validation)
    expect(logSpy).toHaveBeenCalledWith('\n=== Gmail OAuth2 Setup ===\n');

    logSpy.mockRestore();

    // Clean up: the promise is still pending (waiting for callback), but
    // the test will end and the server will be garbage collected
  });
});
