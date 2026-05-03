import { mkdir, readFile, writeFile, chmod } from 'fs/promises';
import { homedir, hostname, userInfo } from 'os';
import { dirname, join } from 'path';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import type { SessionState } from '../types.js';

/**
 * Encrypted on-disk persistence for the Monarch Money session token.
 *
 * The token is encrypted at rest with AES-256-GCM. The encryption key is
 * derived from `MONARCH_SESSION_PASSPHRASE` if set, otherwise from the
 * machine's hostname + the current user — this gives a stable but
 * machine-bound key without forcing the user to manage a passphrase.
 *
 * Layout on disk: <salt:16><iv:12><tag:16><ciphertext>, base64-encoded.
 *
 * The directory is `~/.monarch-money-mcp/` by default and can be overridden
 * with `MONARCH_STATE_DIR` for tests or non-default deployments.
 */

export interface SessionStore {
  load(): Promise<SessionState | null>;
  save(state: SessionState): Promise<void>;
  clear(): Promise<void>;
  path(): string;
}

const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;

function derivePassphrase(): string {
  const explicit = process.env.MONARCH_SESSION_PASSPHRASE;
  if (explicit && explicit.length > 0) return explicit;
  // Fallback: bind to host + user so the encrypted file is tied to the
  // machine that wrote it. Use the os module rather than env vars — on Linux,
  // $HOSTNAME is a shell variable that isn't exported into subprocesses (so
  // an MCP server launched by Claude Desktop / VS Code would see it
  // unset), and $USER is similarly unreliable in headless contexts.
  const host = hostname() || 'localhost';
  let user = 'anonymous';
  try {
    user = userInfo().username || user;
  } catch {
    // userInfo() can throw EACCES on minimal containers; fall back gracefully.
  }
  return `monarch-mcp:${host}:${user}`;
}

export function defaultStateDir(): string {
  return process.env.MONARCH_STATE_DIR ?? join(homedir(), '.monarch-money-mcp');
}

export function defaultSessionPath(): string {
  return join(defaultStateDir(), 'session.enc');
}

export function createFileSessionStore(filePath: string = defaultSessionPath()): SessionStore {
  return {
    path: () => filePath,

    async load() {
      let raw: Buffer;
      try {
        raw = await readFile(filePath);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
        throw err;
      }
      const buf = Buffer.from(raw.toString('utf-8'), 'base64');
      if (buf.length < SALT_LEN + IV_LEN + TAG_LEN + 1) {
        throw new Error(`Session file at ${filePath} is corrupt or truncated`);
      }
      const salt = buf.subarray(0, SALT_LEN);
      const iv = buf.subarray(SALT_LEN, SALT_LEN + IV_LEN);
      const tag = buf.subarray(SALT_LEN + IV_LEN, SALT_LEN + IV_LEN + TAG_LEN);
      const ciphertext = buf.subarray(SALT_LEN + IV_LEN + TAG_LEN);
      const key = scryptSync(derivePassphrase(), salt, KEY_LEN);
      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      try {
        const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        return JSON.parse(plaintext.toString('utf-8')) as SessionState;
      } catch {
        throw new Error(
          `Failed to decrypt session at ${filePath}. The encryption passphrase may have changed; ` +
            `delete the file and re-authenticate.`
        );
      }
    },

    async save(state: SessionState) {
      await mkdir(dirname(filePath), { recursive: true, mode: 0o700 });
      const salt = randomBytes(SALT_LEN);
      const iv = randomBytes(IV_LEN);
      const key = scryptSync(derivePassphrase(), salt, KEY_LEN);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      const plaintext = Buffer.from(JSON.stringify(state), 'utf-8');
      const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
      const tag = cipher.getAuthTag();
      const blob = Buffer.concat([salt, iv, tag, ciphertext]).toString('base64');
      await writeFile(filePath, blob, { mode: 0o600 });
      try {
        await chmod(filePath, 0o600);
      } catch {
        // chmod is best-effort on platforms that don't support it
      }
    },

    async clear() {
      try {
        await writeFile(filePath, '');
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
      }
    },
  };
}

/**
 * In-memory session store, for tests.
 */
export function createMemorySessionStore(initial?: SessionState | null): SessionStore {
  let state: SessionState | null = initial ?? null;
  return {
    path: () => '<memory>',
    async load() {
      return state;
    },
    async save(s) {
      state = s;
    },
    async clear() {
      state = null;
    },
  };
}
