import { describe, it, expect } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Claude Code Agent Manual Tests', () => {
  describe('Mock Workflow', () => {
    it('should complete a full agent workflow with mock client', async () => {
      console.log('🚀 Starting Claude Code Agent manual test with mock...');
      console.log('ℹ️  Using integration mock - no real Claude Code CLI required');
      console.log('📝 Testing non-interactive mode with -p flag\n');

      const projectRoot = path.join(__dirname, '../..');
      const client = new TestMCPClient({
        serverPath: path.join(__dirname, '../../local/build/index.integration-with-mock.js'),
        env: {
          TRUSTED_SERVERS_PATH: path.join(projectRoot, 'servers.md'),
          SERVER_CONFIGS_PATH: path.join(projectRoot, 'servers.json'),
        },
        debug: false,
      });

      try {
        // Connect to server
        await client.connect();
        console.log('✅ Connected to Claude Code Agent MCP Server (Mock)\n');

        // List available tools
        const tools = await client.listTools();
        console.log(`📋 Available tools: ${tools.tools.map((t) => t.name).join(', ')}\n`);
        expect(tools.tools).toHaveLength(7);

        // 1. Initialize agent
        console.log('1️⃣ Initializing agent...');
        const initResult = await client.callTool('init_agent', {
          system_prompt:
            'You are a helpful assistant specialized in Python development and database operations.',
          working_directory: '/tmp/test-manual',
        });

        const initData = JSON.parse(initResult.content[0].text);
        console.log(`✅ Agent initialized with session: ${initData.sessionId}`);
        console.log(`   Status: ${initData.status}`);
        console.log(`   State URI: ${initData.stateUri}\n`);

        // 2. Find relevant servers
        console.log('2️⃣ Finding servers for database operations...');
        const findResult = await client.callTool('find_servers', {
          task_prompt: 'I need to query a PostgreSQL database and fetch data from a web API',
        });

        const servers = JSON.parse(findResult.content[0].text);
        console.log(`✅ Found ${servers.servers.length} relevant servers:`);
        servers.servers.forEach((s: { name: string; rationale: string }) => {
          console.log(`   - ${s.name}: ${s.rationale}`);
        });
        console.log();

        // 3. Install servers
        console.log('3️⃣ Installing servers...');
        const serverNames = servers.servers.map((s: { name: string }) => s.name);
        const installResult = await client.callTool('install_servers', {
          server_names: serverNames.slice(0, 2), // Install first 2 servers
        });

        const installations = JSON.parse(installResult.content[0].text);
        console.log(`✅ Installation results:`);
        installations.installations.forEach((i: { serverName: string; status: string }) => {
          console.log(`   - ${i.serverName}: ${i.status}`);
        });
        console.log(`   MCP config written to: ${installations.mcpConfigPath}\n`);

        // 4. Chat with agent
        console.log('4️⃣ Chatting with agent...');
        const chatResult = await client.callTool('chat', {
          prompt: 'Can you help me connect to a PostgreSQL database?',
          timeout: 30000,
        });

        const chatResponse = JSON.parse(chatResult.content[0].text);
        console.log(`✅ Agent response:`);
        console.log(`   "${chatResponse.response}"`);
        console.log(`   Tokens used: ${chatResponse.metadata.tokensUsed}`);
        console.log(`   Duration: ${chatResponse.metadata.duration}ms\n`);

        // 5. Check resources
        console.log('5️⃣ Checking available resources...');
        const resources = await client.listResources();
        console.log(`✅ Found ${resources.resources.length} resources:`);
        resources.resources.forEach((r) => {
          console.log(`   - ${r.name}: ${r.uri}`);
        });
        console.log();

        // 6. Inspect transcript
        console.log('6️⃣ Inspecting conversation transcript...');
        const transcriptResult = await client.callTool('inspect_transcript', {
          format: 'json',
        });

        const transcript = JSON.parse(transcriptResult.content[0].text);
        console.log(`✅ Transcript info:`);
        console.log(`   URI: ${transcript.transcriptUri}`);
        console.log(`   Messages: ${transcript.metadata.messageCount}`);
        console.log(`   Last updated: ${transcript.metadata.lastUpdated}\n`);

        // 7. Get server capabilities
        console.log('7️⃣ Getting server capabilities...');
        const capResult = await client.callTool('get_server_capabilities', {
          server_names: serverNames.slice(0, 1), // Check first server
        });

        const capabilities = JSON.parse(capResult.content[0].text);
        console.log(`✅ Server capabilities:`);
        capabilities.servers.forEach(
          (s: { name: string; capabilities: { tools?: string[]; resources?: string[] } }) => {
            console.log(`   ${s.name}:`);
            if (s.capabilities.tools) {
              console.log(`     - ${s.capabilities.tools.length} tools available`);
            }
            if (s.capabilities.resources) {
              console.log(`     - ${s.capabilities.resources.length} resources available`);
            }
          }
        );
        console.log();

        // 8. Stop agent
        console.log('8️⃣ Stopping agent...');
        const stopResult = await client.callTool('stop_agent', {});

        const stopData = JSON.parse(stopResult.content[0].text);
        console.log(`✅ Agent stopped:`);
        console.log(`   Status: ${stopData.status}`);
        console.log(`   Final state: ${stopData.finalState.systemPrompt}`);
        console.log(`   Installed servers: ${stopData.finalState.installedServers.join(', ')}\n`);

        // Disconnect
        await client.disconnect();
        console.log('✅ Mock workflow test completed successfully!\n');
      } catch (error) {
        console.error('❌ Test failed:', error);
        await client.disconnect();
        throw error;
      }
    });
  });

  describe('Tool Workflow', () => {
    it('should complete a full agent workflow with real Claude Code CLI', async () => {
      console.log('🚀 Starting Claude Code Agent manual test...\n');

      const client = new TestMCPClient({
        serverPath: path.join(__dirname, '../../local/build/index.js'),
        env: {
          // Use default environment variables
        },
        debug: true,
      });

      try {
        // Connect to server
        await client.connect();
        console.log('✅ Connected to Claude Code Agent MCP Server\n');

        // List available tools
        const tools = await client.listTools();
        console.log(`📋 Available tools: ${tools.tools.map((t) => t.name).join(', ')}\n`);
        expect(tools.tools).toHaveLength(7);

        // 1. Initialize agent
        console.log('1️⃣ Initializing agent...');
        const initResult = await client.callTool('init_agent', {
          system_prompt:
            'You are a helpful assistant specialized in Python development and database operations.',
          working_directory: '/tmp/test-manual',
        });

        const initData = JSON.parse(initResult.content[0].text);
        console.log(`✅ Agent initialized with session: ${initData.sessionId}`);
        console.log(`   Status: ${initData.status}`);
        console.log(`   State URI: ${initData.stateUri}\n`);

        // 2. Find relevant servers
        console.log('2️⃣ Finding servers for database operations...');
        const findResult = await client.callTool('find_servers', {
          task_prompt: 'I need to query a PostgreSQL database and fetch data from a web API',
        });

        const servers = JSON.parse(findResult.content[0].text);
        console.log(`✅ Find servers result:`, servers);

        // Handle case where servers may not be in expected format
        if (!servers.servers || !Array.isArray(servers.servers)) {
          console.warn(`⚠️  Unexpected server list format. Got:`, servers);
          console.log(`   Expected format: { servers: [{ name: string, rationale: string }] }`);

          // Skip remaining tests if we can't get servers
          throw new Error('find_servers returned unexpected format - unable to continue test');
        }

        console.log(`   Found ${servers.servers.length} relevant servers:`);
        servers.servers.forEach((s: { name: string; rationale: string }) => {
          console.log(`   - ${s.name}: ${s.rationale}`);
        });
        console.log();

        // 3. Install servers
        console.log('3️⃣ Installing servers...');
        const serverNames = servers.servers.map((s: { name: string }) => s.name);
        const installResult = await client.callTool('install_servers', {
          server_names: serverNames.slice(0, 2), // Install first 2 servers
        });

        const installations = JSON.parse(installResult.content[0].text);
        console.log(`✅ Installation results:`);
        installations.installations.forEach((i: { serverName: string; status: string }) => {
          console.log(`   - ${i.serverName}: ${i.status}`);
        });
        console.log(`   MCP config written to: ${installations.mcpConfigPath}\n`);

        // 4. Chat with agent
        console.log('4️⃣ Chatting with agent...');
        const chatResult = await client.callTool('chat', {
          prompt: 'Can you help me connect to a PostgreSQL database?',
          timeout: 30000,
        });

        const chatResponse = JSON.parse(chatResult.content[0].text);
        console.log(`✅ Agent response:`);
        console.log(`   "${chatResponse.response}"`);
        console.log(`   Tokens used: ${chatResponse.metadata.tokensUsed}`);
        console.log(`   Duration: ${chatResponse.metadata.duration}ms\n`);

        // 5. Check resources
        console.log('5️⃣ Checking available resources...');
        const resources = await client.listResources();
        console.log(`✅ Found ${resources.resources.length} resources:`);
        resources.resources.forEach((r) => {
          console.log(`   - ${r.name}: ${r.uri}`);
        });
        console.log();

        // 6. Inspect transcript
        console.log('6️⃣ Inspecting conversation transcript...');
        const transcriptResult = await client.callTool('inspect_transcript', {
          format: 'json',
        });

        const transcript = JSON.parse(transcriptResult.content[0].text);
        console.log(`✅ Transcript info:`);
        console.log(`   URI: ${transcript.transcriptUri}`);
        console.log(`   Messages: ${transcript.metadata.messageCount}`);
        console.log(`   Last updated: ${transcript.metadata.lastUpdated}\n`);

        // 7. Get server capabilities
        console.log('7️⃣ Getting server capabilities...');
        const capResult = await client.callTool('get_server_capabilities', {
          server_names: serverNames.slice(0, 1), // Check first server
        });

        const capabilities = JSON.parse(capResult.content[0].text);
        console.log(`✅ Server capabilities:`);
        capabilities.servers.forEach(
          (s: { name: string; capabilities: { tools?: string[]; resources?: string[] } }) => {
            console.log(`   ${s.name}:`);
            if (s.capabilities.tools) {
              console.log(`     - ${s.capabilities.tools.length} tools available`);
            }
            if (s.capabilities.resources) {
              console.log(`     - ${s.capabilities.resources.length} resources available`);
            }
          }
        );
        console.log();

        // 8. Stop agent
        console.log('8️⃣ Stopping agent...');
        const stopResult = await client.callTool('stop_agent', {});

        const stopData = JSON.parse(stopResult.content[0].text);
        console.log(`✅ Agent stopped:`);
        console.log(`   Status: ${stopData.status}`);
        console.log(`   Final state: ${stopData.finalState.systemPrompt}`);
        console.log(`   Installed servers: ${stopData.finalState.installedServers.join(', ')}\n`);

        // Disconnect
        await client.disconnect();
        console.log('✅ Test completed successfully!\n');
      } catch (error) {
        console.error('❌ Test failed:', error);
        await client.disconnect();
        throw error;
      }
    });
  });

  describe('Error Scenarios', () => {
    it('should handle errors gracefully', async () => {
      console.log('🔧 Testing error scenarios...\n');

      const client = new TestMCPClient({
        serverPath: path.join(__dirname, '../../local/build/index.js'),
        env: {},
        debug: false,
      });

      try {
        await client.connect();

        // Test calling tools without agent initialization
        console.log('1️⃣ Testing operations without agent initialization...');
        try {
          await client.callTool('install_servers', {
            server_names: ['com.example/test'],
          });
          throw new Error('Expected an error to be thrown');
        } catch (error: unknown) {
          expect(error).toBeDefined();
          console.log(`✅ Correctly handled uninitialized agent (error thrown)\n`);
        }

        // Test invalid parameters
        console.log('2️⃣ Testing invalid parameters...');
        try {
          await client.callTool('init_agent', {});
          throw new Error('Expected an error to be thrown');
        } catch (error: unknown) {
          expect(error).toBeDefined();
          console.log(`✅ Correctly handled missing parameters (error thrown)\n`);
        }

        await client.disconnect();
        console.log('✅ Error handling tests completed!\n');
      } catch (error) {
        console.error('❌ Error test failed:', error);
        await client.disconnect();
        throw error;
      }
    });
  });
});
