import { config } from 'dotenv';
import { TestMCPClient } from '../../../../test-mcp-client/dist/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
config({ path: path.resolve(__dirname, '../../.env') });

async function exploreClosedThread() {
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

    // First, list channels to find #company-wide
    console.log('📋 Listing channels...');
    const channelsResult = await client.callTool('get_channels', {});
    console.log(channelsResult.content[0].text);

    // Extract company-wide channel ID
    const channelMatch = channelsResult.content[0].text.match(/#company-wide \(ID: ([^)]+)\)/);
    if (!channelMatch) {
      console.error('❌ Could not find #company-wide channel');
      return;
    }

    const companyWideChannelId = channelMatch[1];
    console.log(`\n✅ Found #company-wide channel: ${companyWideChannelId}`);

    // List threads in the channel
    console.log('\n📜 Listing threads in #company-wide...');
    const threadsResult = await client.callTool('get_threads', {
      channel_id: companyWideChannelId,
      limit: 50,
    });
    console.log(threadsResult.content[0].text);

    // Find the closed thread
    const closedThreadMatch = threadsResult.content[0].text.match(
      /"MCP Test Thread - 2025-06-27T12:20:30\.091Z" \(ID: ([^)]+)\)/
    );

    if (closedThreadMatch) {
      const closedThreadId = closedThreadMatch[1];
      console.log(`\n✅ Found closed thread ID: ${closedThreadId}`);

      // Get the thread details
      console.log('\n📖 Getting thread details...');
      const threadResult = await client.callTool('get_thread', {
        thread_id: closedThreadId,
      });
      console.log(threadResult.content[0].text);

      // Let's also make a direct API call to understand the raw data
      console.log('\n🔍 Making direct API call to understand thread structure...');
      const threadUrl = `https://api.twist.com/api/v3/threads/getone?id=${closedThreadId}`;
      const threadResponse = await fetch(threadUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (threadResponse.ok) {
        const threadData = await threadResponse.json();
        console.log('\nRaw thread data:', JSON.stringify(threadData, null, 2));
      }

      // Get messages to see if there's a pattern
      console.log('\n🔍 Getting raw messages data...');
      const messagesUrl = `https://api.twist.com/api/v3/comments/get?thread_id=${closedThreadId}`;
      const messagesResponse = await fetch(messagesUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json();
        console.log('\nRaw messages data:', JSON.stringify(messagesData, null, 2));
      }
    } else {
      console.log('\n⚠️ Could not find the closed thread. Here are all threads:');
      console.log(threadsResult.content[0].text);
    }

    // Let's also check other threads to compare
    console.log('\n📊 Comparing with an open thread...');
    const openThreadMatch = threadsResult.content[0].text.match(/"([^"]+)" \(ID: ([^)]+)\)/);
    if (openThreadMatch && openThreadMatch[2] !== closedThreadMatch?.[1]) {
      const openThreadId = openThreadMatch[2];
      console.log(`\n✅ Found open thread ID: ${openThreadId}`);

      const openThreadUrl = `https://api.twist.com/api/v3/threads/getone?id=${openThreadId}`;
      const openThreadResponse = await fetch(openThreadUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (openThreadResponse.ok) {
        const openThreadData = await openThreadResponse.json();
        console.log('\nRaw open thread data:', JSON.stringify(openThreadData, null, 2));
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.disconnect();
    console.log('\n👋 Disconnected from server');
  }
}

// Run the exploration
exploreClosedThread().catch(console.error);
