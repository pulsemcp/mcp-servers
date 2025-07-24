import { describe, it, expect } from 'vitest';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Proxy Support', () => {
  it('should configure proxy when ENABLE_PROXY_SETTINGS is true', async () => {
    console.log('\n🔧 Testing proxy configuration with ENABLE_PROXY_SETTINGS=true...');

    // Start the server with proxy env vars
    const serverPath = path.join(__dirname, '../../../local/build/index.js');
    const serverProcess = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        ENABLE_PROXY_SETTINGS: 'true',
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

    // Verify proxy was enabled and configuration was detected
    expect(stderrOutput).toContain('Proxy support enabled via ENABLE_PROXY_SETTINGS');
    expect(stderrOutput).toContain('Proxy configuration detected:');
    expect(stderrOutput).toContain('HTTP_PROXY: http://proxy.example.com:8080');
    expect(stderrOutput).toContain('HTTPS_PROXY: https://secure-proxy.example.com:8443');
    expect(stderrOutput).toContain('NO_PROXY: localhost,127.0.0.1,internal.company.com');
    expect(stderrOutput).toContain(
      'Note: proxy-agent also checks system proxy settings and PAC files'
    );

    console.log('✅ Proxy configuration correctly detected');
    console.log('\n📋 Server output:');
    console.log(stderrOutput);

    // Clean up
    serverProcess.kill();
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  it('should not enable proxy when ENABLE_PROXY_SETTINGS is not set', async () => {
    console.log('\n🔧 Testing without proxy enabled (default behavior)...');

    // Start the server without ENABLE_PROXY_SETTINGS
    const serverPath = path.join(__dirname, '../../../local/build/index.js');
    const serverProcess = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        HTTP_PROXY: 'http://proxy.example.com:8080',
        HTTPS_PROXY: 'https://secure-proxy.example.com:8443',
        NO_PROXY: 'localhost,127.0.0.1,internal.company.com',
        SKIP_HEALTH_CHECKS: 'true',
        // ENABLE_PROXY_SETTINGS not set (defaults to false)
      },
    });

    // Collect stderr output
    let stderrOutput = '';
    serverProcess.stderr.on('data', (data: Buffer) => {
      stderrOutput += data.toString();
    });

    // Wait for server to start
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verify proxy is disabled by default
    expect(stderrOutput).toContain(
      'Proxy support disabled (set ENABLE_PROXY_SETTINGS=true to enable)'
    );
    expect(stderrOutput).not.toContain('Proxy configuration detected');

    console.log('✅ Proxy support correctly disabled by default');

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

  describe('proxy-agent Behavior', () => {
    it('should explain how proxy-agent works', () => {
      console.log('\n📚 How proxy-agent Works:');
      console.log('------------------------');
      console.log('1. Automatically detects proxy settings from multiple sources:');
      console.log('   - Environment variables (HTTP_PROXY, HTTPS_PROXY, NO_PROXY)');
      console.log('   - npm configuration (npm config get proxy)');
      console.log('   - System proxy settings (macOS and Windows)');
      console.log('   - PAC (Proxy Auto-Config) files');
      console.log('2. Supports multiple proxy types:');
      console.log('   - HTTP/HTTPS proxies');
      console.log('   - SOCKS/SOCKS5 proxies');
      console.log('   - Authenticated proxies (username:password in URL)');
      console.log('3. Zero configuration for most users:');
      console.log('   - If your browser works, pulse-fetch works');
      console.log('   - No manual environment variable setup needed');

      expect(true).toBe(true); // Placeholder test
    });

    it('should demonstrate system proxy detection', () => {
      console.log('\n📚 System Proxy Detection Examples:');
      console.log('----------------------------------');
      console.log('macOS:');
      console.log('  System Preferences → Network → Advanced → Proxies');
      console.log('  - proxy-agent automatically detects these settings');
      console.log('\nWindows:');
      console.log('  Settings → Network & Internet → Proxy');
      console.log('  - proxy-agent automatically detects these settings');
      console.log('\nPAC Files:');
      console.log('  If your organization uses PAC files, proxy-agent will');
      console.log('  automatically detect and use them');

      expect(true).toBe(true); // Placeholder test
    });
  });
});
