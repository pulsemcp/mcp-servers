import { describe, it, expect } from 'vitest';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Proxy Support', () => {
  it('should configure proxy when environment variables are set', async () => {
    console.log('\n🔧 Testing proxy configuration...');

    // Start the server with proxy env vars
    const serverPath = path.join(__dirname, '../../../local/build/index.js');
    const serverProcess = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        HTTP_PROXY: 'http://proxy.example.com:8080',
        HTTPS_PROXY: 'https://secure-proxy.example.com:8443',
        NO_PROXY: 'localhost,127.0.0.1,internal.company.com',
        SKIP_HEALTH_CHECKS: 'true',
      },
    });

    // Collect stderr output
    let stderrOutput = '';
    serverProcess.stderr.on('data', (data: Buffer) => {
      stderrOutput += data.toString();
    });

    // Wait for server to start and configure proxy
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verify proxy configuration was logged
    expect(stderrOutput).toContain('Proxy configuration:');
    expect(stderrOutput).toContain('HTTP_PROXY: http://proxy.example.com:8080');
    expect(stderrOutput).toContain('HTTPS_PROXY: https://secure-proxy.example.com:8443');
    expect(stderrOutput).toContain('NO_PROXY: localhost,127.0.0.1,internal.company.com');

    console.log('✅ Proxy configuration correctly logged');
    console.log('\n📋 Server output:');
    console.log(stderrOutput);

    // Clean up
    serverProcess.kill();
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  it('should not log proxy configuration when environment variables are not set', async () => {
    console.log('\n🔧 Testing without proxy configuration...');

    // Start the server without proxy env vars
    const serverPath = path.join(__dirname, '../../../local/build/index.js');
    const serverProcess = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        HTTP_PROXY: '',
        HTTPS_PROXY: '',
        NO_PROXY: '',
        SKIP_HEALTH_CHECKS: 'true',
      },
    });

    // Collect stderr output
    let stderrOutput = '';
    serverProcess.stderr.on('data', (data: Buffer) => {
      stderrOutput += data.toString();
    });

    // Wait for server to start
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verify proxy configuration was NOT logged
    expect(stderrOutput).not.toContain('Proxy configuration:');

    console.log('✅ No proxy configuration logged when env vars not set');

    // Clean up
    serverProcess.kill();
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  describe('Proxy Configuration Examples', () => {
    it('should demonstrate basic proxy setup', () => {
      console.log('\n📚 Basic Proxy Configuration:');
      console.log('----------------------------');
      console.log('export HTTP_PROXY=http://proxy.company.com:8080');
      console.log('export HTTPS_PROXY=http://proxy.company.com:8080');
      console.log('npx @pulsemcp/pulse-fetch');

      expect(true).toBe(true); // Placeholder test
    });

    it('should demonstrate authenticated proxy setup', () => {
      console.log('\n📚 Authenticated Proxy Configuration:');
      console.log('------------------------------------');
      console.log('export HTTP_PROXY=http://username:password@proxy.company.com:8080');
      console.log('export HTTPS_PROXY=http://username:password@proxy.company.com:8080');
      console.log('npx @pulsemcp/pulse-fetch');

      expect(true).toBe(true); // Placeholder test
    });

    it('should demonstrate NO_PROXY configuration', () => {
      console.log('\n📚 NO_PROXY Configuration:');
      console.log('-------------------------');
      console.log('export HTTP_PROXY=http://proxy.company.com:8080');
      console.log('export HTTPS_PROXY=http://proxy.company.com:8080');
      console.log('export NO_PROXY=localhost,127.0.0.1,*.internal.company.com,10.0.0.0/8');
      console.log('npx @pulsemcp/pulse-fetch');
      console.log('\nThis will bypass the proxy for:');
      console.log('- localhost and 127.0.0.1');
      console.log('- Any subdomain of internal.company.com');
      console.log('- Any IP in the 10.0.0.0/8 range');

      expect(true).toBe(true); // Placeholder test
    });
  });

  describe('EnvHttpProxyAgent Behavior', () => {
    it('should explain how EnvHttpProxyAgent works', () => {
      console.log('\n📚 How EnvHttpProxyAgent Works:');
      console.log('-------------------------------');
      console.log('1. Automatically reads HTTP_PROXY, HTTPS_PROXY, and NO_PROXY env vars');
      console.log('2. Routes HTTP requests through HTTP_PROXY');
      console.log('3. Routes HTTPS requests through HTTPS_PROXY');
      console.log('4. Bypasses proxy for hosts matching NO_PROXY patterns');
      console.log('5. Supports wildcards (*.example.com) and CIDR notation (10.0.0.0/8)');
      console.log('6. Works with authenticated proxies (username:password in URL)');

      expect(true).toBe(true); // Placeholder test
    });
  });
});
