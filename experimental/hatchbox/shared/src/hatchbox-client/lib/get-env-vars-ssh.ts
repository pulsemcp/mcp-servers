import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export async function getEnvVarsSSH(
  serverIP: string,
  sshKeyPath?: string,
  appName?: string
): Promise<Array<{ name: string; value: string }>> {
  // Build SSH command options
  const sshOptions = ['-o ConnectTimeout=5', '-o BatchMode=yes', '-o StrictHostKeyChecking=no'];

  if (sshKeyPath) {
    sshOptions.push(`-i ${sshKeyPath}`);
  }

  // Find the puma process for the app
  const findProcessCmd = appName
    ? `pgrep -f "puma.*${appName}" | head -1`
    : `pgrep -f "puma" | head -1`;

  const pidCmd = `ssh ${sshOptions.join(' ')} deploy@${serverIP} "${findProcessCmd}"`;

  try {
    const { stdout: pidOutput } = await execPromise(pidCmd);
    const pid = pidOutput.trim();

    if (!pid) {
      throw new Error('No puma process found on the server. Make sure the Rails app is running.');
    }

    // Read environment variables from the process
    const envCmd = `ssh ${sshOptions.join(' ')} deploy@${serverIP} "cat /proc/${pid}/environ | tr '\\0' '\\n'"`;
    const { stdout: envOutput } = await execPromise(envCmd);

    // Parse environment variables
    const envVars: Array<{ name: string; value: string }> = [];
    envOutput.split('\n').forEach((line) => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        envVars.push({
          name: key,
          value: valueParts.join('='),
        });
      }
    });

    // Sort by name for consistent output
    return envVars.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Provide more helpful error messages
    if (errorMessage.includes('Permission denied')) {
      throw new Error('SSH permission denied. Make sure your SSH key is authorized on the server.');
    }
    if (
      errorMessage.includes('Connection refused') ||
      errorMessage.includes('Connection timed out')
    ) {
      throw new Error(
        `Cannot connect to server at ${serverIP}. Check the IP address and network connectivity.`
      );
    }
    if (errorMessage.includes('command not found')) {
      throw new Error(
        'Required commands not available on server. This may not be a Hatchbox server.'
      );
    }

    throw new Error(`Failed to get environment variables via SSH: ${errorMessage}`);
  }
}
