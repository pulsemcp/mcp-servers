import { config } from 'dotenv';
import { TestMCPClient } from '../../../../test-mcp-client/dist/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
config({ path: path.resolve(__dirname, '../../.env') });

async function testPaginationAndFilters() {
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

    // Test 1: Get threads with default settings (should exclude closed threads)
    console.log('=== Test 1: Default settings (open threads only, limit 50) ===');
    const defaultResult = await client.callTool('get_threads', {
      channel_id: channelId,
    });
    console.log(defaultResult.content[0].text);
    console.log('');

    // Test 2: Get threads including closed ones
    console.log('=== Test 2: Include closed threads ===');
    const withClosedResult = await client.callTool('get_threads', {
      channel_id: channelId,
      include_closed: true,
    });
    console.log(withClosedResult.content[0].text);
    console.log('');

    // Test 3: Test pagination with smaller limit
    console.log('=== Test 3: Pagination - First 5 threads ===');
    const page1Result = await client.callTool('get_threads', {
      channel_id: channelId,
      limit: 5,
      offset: 0,
    });
    console.log(page1Result.content[0].text);
    console.log('');

    // Test 4: Get next page
    console.log('=== Test 4: Pagination - Next 5 threads (offset 5) ===');
    const page2Result = await client.callTool('get_threads', {
      channel_id: channelId,
      limit: 5,
      offset: 5,
    });
    console.log(page2Result.content[0].text);
    console.log('');

    // Test 5: Find a closed thread and examine it
    console.log('=== Test 5: Examine a closed thread ===');
    const closedThreadMatch = withClosedResult.content[0].text.match(
      /"([^"]+)" \(ID: ([^)]+)\)\[CLOSED\]/
    );

    if (closedThreadMatch) {
      const closedThreadId = closedThreadMatch[2];
      console.log(`Found closed thread: "${closedThreadMatch[1]}" (ID: ${closedThreadId})`);

      // Get thread with default message limit
      const threadResult = await client.callTool('get_thread', {
        thread_id: closedThreadId,
      });
      console.log('\nWith default message limit (10):');
      console.log(threadResult.content[0].text.substring(0, 500) + '...');

      // Get thread with custom message limit
      const threadLimitedResult = await client.callTool('get_thread', {
        thread_id: closedThreadId,
        message_limit: 3,
      });
      console.log('\nWith message limit 3:');
      console.log(threadLimitedResult.content[0].text);
    } else {
      console.log('No closed threads found');
    }
    console.log('');

    // Test 6: Test message pagination on a thread with multiple messages
    console.log('=== Test 6: Message pagination ===');
    // Find a thread with multiple messages
    const anyThreadMatch = defaultResult.content[0].text.match(/"([^"]+)" \(ID: ([^)]+)\)/);
    if (anyThreadMatch) {
      const threadId = anyThreadMatch[2];
      console.log(`Testing on thread: "${anyThreadMatch[1]}" (ID: ${threadId})`);

      // Get last 5 messages
      const recentMessages = await client.callTool('get_thread', {
        thread_id: threadId,
        message_limit: 5,
        message_offset: 0,
      });
      console.log('\nLast 5 messages:');
      const messageSection = recentMessages.content[0].text.split('Messages')[1];
      if (messageSection) {
        console.log('Messages' + messageSection.substring(0, 400) + '...');
      }

      // Get older messages
      const olderMessages = await client.callTool('get_thread', {
        thread_id: threadId,
        message_limit: 5,
        message_offset: 5,
      });
      console.log('\nOlder 5 messages (offset 5):');
      const olderSection = olderMessages.content[0].text.split('Messages')[1];
      if (olderSection) {
        console.log('Messages' + olderSection.substring(0, 400) + '...');
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.disconnect();
    console.log('\n👋 Disconnected from server');
  }
}

// Run the test
testPaginationAndFilters().catch(console.error);
