import { IClaudeCodeInferenceClient, InstallationContext } from './types.js';
import { createLogger } from '../logging.js';

const logger = createLogger('claude-client-adapter');

/**
 * Adapter to use the existing Claude Code client for inference
 */
export class ClaudeCodeInferenceAdapter implements IClaudeCodeInferenceClient {
  constructor(
    private claudeCodePath: string,
    private workingDir: string
  ) {}

  async runInference(prompt: string): Promise<string> {
    const { spawn } = await import('child_process');

    logger.debug(`Starting Claude Code inference...`);
    logger.debug(`Claude path: ${this.claudeCodePath}`);
    logger.debug(`Working directory: ${this.workingDir}`);
    logger.debug(`Prompt length: ${prompt.length} characters`);

    return new Promise((resolve, reject) => {
      const args = ['-p', prompt, '--output-format', 'json'];

      logger.debug(
        `Spawning Claude Code with args: ${JSON.stringify(args.map((a, i) => (i === 1 ? `<prompt ${a.length} chars>` : a)))}`
      );

      const claude = spawn(this.claudeCodePath, args, {
        cwd: this.workingDir,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      logger.debug(`Process spawned with PID: ${claude.pid}`);

      // Close stdin immediately since we're using -p flag
      claude.stdin.end();
      logger.debug('Stdin closed');

      let stdout = '';
      let stderr = '';

      claude.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        logger.debug(`[stdout chunk] ${chunk.length} bytes`);
      });

      claude.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        logger.debug(`[stderr chunk] ${chunk}`);
      });

      claude.on('close', (code) => {
        logger.debug(`Process closed with code: ${code}`);
        logger.debug(`Total stdout: ${stdout.length} bytes`);
        logger.debug(`Total stderr: ${stderr.length} bytes`);

        if (code !== 0) {
          logger.error(`Claude Code failed with code ${code}`);
          logger.error(`Stderr: ${stderr}`);
          reject(new Error(`Claude Code inference failed with code ${code}: ${stderr}`));
          return;
        }

        try {
          logger.debug('Attempting to parse stdout as JSON...');
          // Parse the JSON response from Claude Code
          const response = JSON.parse(stdout);
          logger.debug('JSON parse successful');

          // Extract the result from Claude's response format
          if (response.result) {
            logger.debug('Extracting result field from response');
            resolve(response.result.toString());
          } else {
            logger.debug('No result field, returning raw stdout');
            resolve(stdout);
          }
        } catch (parseError) {
          logger.warn('Failed to parse as JSON, returning raw output');
          logger.debug(`Parse error: ${parseError}`);
          // If not valid JSON, return raw output
          resolve(stdout);
        }
      });

      claude.on('error', (error) => {
        logger.error(`Failed to spawn Claude Code process: ${error.message}`);
        reject(new Error(`Failed to spawn Claude Code process: ${error.message}`));
      });
    });
  }
}

/**
 * Converts context to installation context with defaults
 */
export function convertLegacyContext(context?: InstallationContext): InstallationContext {
  return {
    purpose: context?.purpose || 'Server installation via claude-code-agent',
  };
}
