import { describe, it, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Focused test to reproduce the 400 error with search_logs
 */
describe('AppSignal search_logs 400 Error - Manual Test', () => {
  let client: TestMCPClient;

  beforeAll(async () => {
    if (!process.env.APPSIGNAL_API_KEY) {
      throw new Error('Manual tests require APPSIGNAL_API_KEY environment variable');
    }

    const serverPath = path.join(__dirname, '../../local/build/index.js');
    client = new TestMCPClient({
      serverPath,
      env: {
        APPSIGNAL_API_KEY: process.env.APPSIGNAL_API_KEY,
      },
      debug: true, // Enable debug to see raw MCP messages
    });

    await client.connect();
  });

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  it('should reproduce the 400 error with the exact user parameters', async () => {
    console.log('\n🧪 Testing search_logs with user-provided parameters...\n');

    // First, get apps and select one
    const appsResult = await client.callTool('get_apps', {});
    const response = JSON.parse(appsResult.content[0].text);

    if (response.apps.length === 0) {
      throw new Error('No apps found - cannot continue test');
    }

    const selectedApp = response.apps[0];
    await client.callTool('select_app_id', { appId: selectedApp.id });

    console.log(`✓ Selected app: ${selectedApp.name} (${selectedApp.id})\n`);

    // Now test the exact parameters that are causing the 400 error
    console.log('📊 Testing search_logs with exact user parameters...');
    console.log(
      'Parameters:',
      JSON.stringify(
        {
          query: 'test',
          limit: 1,
          severities: [],
        },
        null,
        2
      )
    );

    try {
      const result = await client.callTool('search_logs', {
        query: 'test',
        limit: 1,
        severities: [],
      });

      console.log('\nResult:', result.content[0].text);

      // Check if we got an error
      if (result.content[0].text.startsWith('Error')) {
        console.log('\n❌ Confirmed: Got an error response');

        // Look for 400 error specifically
        if (result.content[0].text.includes('400')) {
          console.log('✓ Reproduced the 400 error!');
          console.log('\nFull error:', result.content[0].text);
        }
      } else {
        console.log('\n✅ No error - search completed successfully');
        const data = JSON.parse(result.content[0].text);
        console.log(`Found ${data.lines.length} log entries`);
      }
    } catch (error) {
      console.error('\n❌ Exception thrown:', error);
      throw error;
    }

    // Test with different parameter combinations to isolate the issue
    console.log('\n🔍 Testing different parameter combinations...\n');

    // Test 1: Without severities parameter
    console.log('Test 1: Without severities parameter');
    try {
      const result = await client.callTool('search_logs', {
        query: 'test',
        limit: 1,
      });

      if (result.content[0].text.startsWith('Error')) {
        console.log(
          '❌ Error without severities:',
          result.content[0].text.substring(0, 100) + '...'
        );
      } else {
        console.log('✅ Works without severities parameter');
      }
    } catch (error) {
      console.error('❌ Exception:', error);
    }

    // Test 2: With explicit severity values
    console.log('\nTest 2: With explicit severity values');
    try {
      const result = await client.callTool('search_logs', {
        query: 'test',
        limit: 1,
        severities: ['error', 'warn'],
      });

      if (result.content[0].text.startsWith('Error')) {
        console.log('❌ Error with severities:', result.content[0].text.substring(0, 100) + '...');
      } else {
        console.log('✅ Works with explicit severities');
      }
    } catch (error) {
      console.error('❌ Exception:', error);
    }

    // Test 3: With empty query
    console.log('\nTest 3: With empty query');
    try {
      const result = await client.callTool('search_logs', {
        query: '',
        limit: 1,
        severities: [],
      });

      if (result.content[0].text.startsWith('Error')) {
        console.log('❌ Error with empty query:', result.content[0].text.substring(0, 100) + '...');
      } else {
        console.log('✅ Works with empty query');
      }
    } catch (error) {
      console.error('❌ Exception:', error);
    }

    // Test 4: With start/end parameters (testing the workaround)
    console.log('\nTest 4: With start/end parameters');
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const result = await client.callTool('search_logs', {
        query: 'test',
        limit: 1,
        severities: ['error', 'warn'],
        start: oneHourAgo.toISOString(),
        end: now.toISOString(),
      });

      if (result.content[0].text.startsWith('Error')) {
        console.log('❌ Error with start/end:', result.content[0].text.substring(0, 100) + '...');
      } else {
        console.log('✅ Works with start/end parameters!');
        const data = JSON.parse(result.content[0].text);
        console.log(`   Time window: ${oneHourAgo.toISOString()} to ${now.toISOString()}`);
        console.log(`   Query window from API: ${data.queryWindow}s`);
      }
    } catch (error) {
      console.error('❌ Exception:', error);
    }
  });
});
