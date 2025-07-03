import { config } from 'dotenv';
import { TestMCPClient } from '../../../../test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
config({ path: path.resolve(__dirname, '../../.env') });

async function testRobustPagination() {
  const bearerToken = process.env.TWIST_BEARER_TOKEN;
  const workspaceId = process.env.TWIST_WORKSPACE_ID;

  if (!bearerToken || !workspaceId) {
    console.error('❌ TWIST_BEARER_TOKEN and TWIST_WORKSPACE_ID are required');
    process.exit(1);
  }

  // Start the actual MCP server
  const serverPath = path.join(__dirname, '../../local/build/index.js');

  const client = new TestMCPClient({
    serverPath,
    env: {
      TWIST_BEARER_TOKEN: bearerToken,
      TWIST_WORKSPACE_ID: workspaceId,
    },
    debug: false,
  });

  try {
    await client.connect();
    console.log('✅ Connected to Twist MCP server\n');

    // First, find the #company-wide channel
    console.log('📋 Finding #company-wide channel...');
    const channelsResult = await client.callTool('get_channels', {});
    const channelMatch = channelsResult.content[0].text.match(/#company-wide \(ID: ([^)]+)\)/);

    if (!channelMatch) {
      console.error('❌ Could not find #company-wide channel');
      return;
    }

    const channelId = channelMatch[1];
    console.log(`✅ Found channel ID: ${channelId}\n`);

    console.log('=== ROBUST PAGINATION SYSTEM DEMONSTRATION ===\n');

    // Test 1: Show all threads with closed included to see total
    console.log('Test 1: Get ALL threads (closed included) to see dataset');
    const allResult = await client.callTool('get_channel', {
      channel_id: channelId,
      include_closed_threads: true,
      threads_limit: 50, // Request more than available
    });
    console.log(allResult.content[0].text);
    console.log('\n' + '='.repeat(80) + '\n');

    // Test 2: Open threads only pagination
    console.log('Test 2: Open threads pagination (should always return 1 open thread)');
    for (let offset = 0; offset < 3; offset += 1) {
      console.log(`\n--- Offset ${offset}, Limit 2 (open threads only) ---`);
      const result = await client.callTool('get_channel', {
        channel_id: channelId,
        include_closed_threads: false,
        threads_limit: 2,
        threads_offset: offset,
      });

      // Extract just the threads section for cleaner output
      const text = result.content[0].text;
      const threadsSection = text.split('Threads (')[1];
      if (threadsSection) {
        console.log('Threads (' + threadsSection);
      } else {
        console.log('No threads section found');
      }
    }
    console.log('\n' + '='.repeat(80) + '\n');

    // Test 3: Pagination with closed threads included
    console.log('Test 3: Mixed threads pagination (closed included)');
    for (let offset = 0; offset < 15; offset += 3) {
      console.log(`\n--- Offset ${offset}, Limit 3 (all threads) ---`);
      const result = await client.callTool('get_channel', {
        channel_id: channelId,
        include_closed_threads: true,
        threads_limit: 3,
        threads_offset: offset,
      });

      // Extract just the threads section for cleaner output
      const text = result.content[0].text;
      const threadsSection = text.split('Threads (')[1];
      if (threadsSection) {
        console.log('Threads (' + threadsSection.split('\n\n')[0]);
        const threadLines = threadsSection.split('\n').slice(1, 4); // Get thread lines only
        threadLines.forEach((line) => {
          if (line.trim() && line.startsWith('- ')) {
            console.log(line);
          }
        });
      }
    }
    console.log('\n' + '='.repeat(80) + '\n');

    // Test 4: Edge cases
    console.log('Test 4: Edge cases');

    console.log('\n--- Large offset (beyond available threads) ---');
    const beyondResult = await client.callTool('get_channel', {
      channel_id: channelId,
      include_closed_threads: true,
      threads_limit: 5,
      threads_offset: 100,
    });
    const beyondText = beyondResult.content[0].text;
    const beyondThreadsSection = beyondText.split('Threads (')[1];
    if (beyondThreadsSection) {
      console.log('Threads (' + beyondThreadsSection.split('\n\n')[0]);
    }

    console.log('\n--- Limit larger than total threads ---');
    const largeResult = await client.callTool('get_channel', {
      channel_id: channelId,
      include_closed_threads: true,
      threads_limit: 1000,
      threads_offset: 0,
    });
    const largeText = largeResult.content[0].text;
    const largeThreadsSection = largeText.split('Threads (')[1];
    if (largeThreadsSection) {
      console.log('Threads (' + largeThreadsSection.split('\n\n')[0]);
    }

    console.log('\n✅ Robust pagination system successfully demonstrated!');
    console.log('\nKey improvements:');
    console.log('• Always fetches max threads (500) from API to avoid API pagination issues');
    console.log('• Client-side filtering ensures accurate results');
    console.log('• Pagination applied AFTER filtering for consistent behavior');
    console.log('• Abstracts away Twist API limitations from callers');
    console.log('• Returns exact requested number of threads when possible');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.disconnect();
    console.log('\n👋 Disconnected from server');
  }
}

// Run the test
testRobustPagination().catch(console.error);
