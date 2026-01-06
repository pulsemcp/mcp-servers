import { spawn } from 'child_process';
import {
  OnePasswordNotFoundError,
  OnePasswordAuthenticationError,
  OnePasswordCommandError,
} from '../../types.js';

const CLI_TIMEOUT = 30000; // 30 seconds

/**
 * Execute a 1Password CLI command
 *
 * @param serviceAccountToken - The service account token for authentication
 * @param args - Command arguments to pass to the `op` CLI
 * @returns The parsed JSON output from the command
 */
export async function executeCommand<T>(serviceAccountToken: string, args: string[]): Promise<T> {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      OP_SERVICE_ACCOUNT_TOKEN: serviceAccountToken,
    };

    // Add JSON format flag if not already present
    if (!args.includes('--format') && !args.includes('-f')) {
      args = [...args, '--format', 'json'];
    }

    const proc = spawn('op', args, {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Close stdin to prevent the CLI from waiting for input
    proc.stdin.end();

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    const timeout = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new OnePasswordCommandError(`Command timed out after ${CLI_TIMEOUT}ms`, -1));
    }, CLI_TIMEOUT);

    proc.on('error', (error) => {
      clearTimeout(timeout);
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(
          new OnePasswordCommandError(
            '1Password CLI (op) not found. Please ensure it is installed and available in PATH.',
            -1
          )
        );
      } else {
        reject(new OnePasswordCommandError(`Failed to execute command: ${error.message}`, -1));
      }
    });

    proc.on('close', (code) => {
      clearTimeout(timeout);

      if (code !== 0) {
        const errorMessage = stderr.trim();
        handleError(errorMessage, code || 1, reject);
        return;
      }

      try {
        const result = JSON.parse(stdout) as T;
        resolve(result);
      } catch (parseError) {
        reject(
          new OnePasswordCommandError(
            `Failed to parse 1Password response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
            0
          )
        );
      }
    });
  });
}

function handleError(errorMessage: string, exitCode: number, reject: (error: Error) => void): void {
  const lowerError = errorMessage.toLowerCase();

  if (
    lowerError.includes('not found') ||
    lowerError.includes('no item found') ||
    lowerError.includes("isn't an item")
  ) {
    reject(new OnePasswordNotFoundError(errorMessage));
  } else if (
    lowerError.includes('authentication') ||
    lowerError.includes('unauthorized') ||
    lowerError.includes('invalid session') ||
    lowerError.includes('invalid token') ||
    lowerError.includes('not signed in')
  ) {
    reject(new OnePasswordAuthenticationError(errorMessage));
  } else {
    reject(
      new OnePasswordCommandError(
        `1Password CLI error (exit ${exitCode}): ${errorMessage}`,
        exitCode
      )
    );
  }
}
