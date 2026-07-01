#!/usr/bin/env node
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  createFileSessionStore,
  createMCPServer,
  MonarchEmailOtpRequiredError,
  MonarchLoginRejectedError,
  MonarchTotpRequiredError,
  resolveSession,
} from '../shared/index.js';
import { logServerStart, logError } from '../shared/logging.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const VERSION = packageJson.version;

// Surface process-level failures on stderr instead of letting them vanish.
// Without these handlers an unhandled rejection or uncaught exception can leave
// the long-lived stdio server in a half-dead state where it stays connected but
// stops answering requests — the client then sees confusing symptoms like
// intermittent "No such tool available" with no server-side trace. An uncaught
// exception leaves the process in an undefined state, so we log and exit to let
// the supervisor restart cleanly; a stray rejection is logged but non-fatal.
process.on('unhandledRejection', (reason) => {
  logError('unhandledRejection', reason);
});
process.on('uncaughtException', (error) => {
  logError('uncaughtException', error);
  process.exit(1);
});

async function main() {
  // Resolve a session up front from env vars (token or email+password) or the
  // cached encrypted file. Failures are non-fatal — the server still boots so
  // the in-protocol auth tools can recover. We log a clear stderr hint when
  // env-based login fails for a known reason (OTP gate, bad creds).
  const sessionStore = createFileSessionStore();
  try {
    await resolveSession({ sessionStore });
  } catch (err) {
    if (err instanceof MonarchEmailOtpRequiredError) {
      process.stderr.write(
        `[monarch-money] email OTP required: ${err.message}\n` +
          `[monarch-money] read the code Monarch just emailed you, set MONARCH_EMAIL_OTP=<code>, and restart.\n`
      );
    } else if (err instanceof MonarchTotpRequiredError) {
      process.stderr.write(
        `[monarch-money] TOTP required: ${err.message}\n` +
          `[monarch-money] set MONARCH_TOTP=<code> and restart.\n`
      );
    } else if (err instanceof MonarchLoginRejectedError) {
      process.stderr.write(`[monarch-money] login rejected (HTTP ${err.status}): ${err.message}\n`);
    } else {
      process.stderr.write(
        `[monarch-money] auto-auth failed: ${err instanceof Error ? err.message : String(err)}\n`
      );
    }
  }

  const { server, registerHandlers } = createMCPServer({
    version: VERSION,
    sessionStore,
  });
  await registerHandlers(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logServerStart('Monarch Money');
}

main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
