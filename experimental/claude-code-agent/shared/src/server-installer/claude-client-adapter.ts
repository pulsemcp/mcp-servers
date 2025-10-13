import { IClaudeCodeInferenceClient, InstallationContext } from './types.js';

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

    return new Promise((resolve, reject) => {
      const claude = spawn(this.claudeCodePath, ['--output-format', 'json', '-p', prompt], {
        cwd: this.workingDir,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      claude.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      claude.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      claude.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Claude Code inference failed with code ${code}: ${stderr}`));
          return;
        }

        try {
          // Parse the JSON response from Claude Code
          const response = JSON.parse(stdout);

          // Extract the result from Claude's response format
          if (response.result) {
            resolve(response.result.toString());
          } else {
            resolve(stdout);
          }
        } catch {
          // If not valid JSON, return raw output
          resolve(stdout);
        }
      });

      claude.on('error', (error) => {
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
