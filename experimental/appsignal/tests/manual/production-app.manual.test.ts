import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../test-mcp-client/dist/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Manual test specifically for production app ID to verify bug fixes.
 * This test ensures that:
 * 1. The correct production app ID returns results (not development)
 * 2. Singular incident queries work without 400 errors
 */
describe('Production App Bug Fixes - Manual Test', () => {
  let client: TestMCPClient;
  const PRODUCTION_APP_ID = '674fa72ad2a5e4ed3afb6b2c'; // pulsemcp/production
  const DEVELOPMENT_APP_ID = '674fa20cd2a5e4ed3afb6b25'; // pulsemcp/development (wrong one)

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
      debug: false,
    });

    await client.connect();
  });

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  it('should return results for production app ID and handle singular incidents correctly', async () => {
    console.log('\n🧪 Testing Production App Bug Fixes...\n');

    // Step 1: Verify we can see both apps
    console.log('📱 Step 1: Getting list of apps...');
    const appsResult = await client.callTool('get_apps', {});
    const appsData = JSON.parse(appsResult.content[0].text);
    
    const productionApp = appsData.apps.find((app: { id: string; name: string; environment: string }) => app.id === PRODUCTION_APP_ID);
    const developmentApp = appsData.apps.find((app: { id: string; name: string; environment: string }) => app.id === DEVELOPMENT_APP_ID);
    
    expect(productionApp).toBeDefined();
    expect(developmentApp).toBeDefined();
    console.log(`   ✓ Found production app: ${productionApp.name} (${productionApp.environment})`);
    console.log(`   ✓ Found development app: ${developmentApp.name} (${developmentApp.environment})`);

    // Step 2: Select production app
    console.log('\n🎯 Step 2: Selecting production app...');
    await client.callTool('select_app_id', { appId: PRODUCTION_APP_ID });
    console.log(`   ✓ Selected app ID: ${PRODUCTION_APP_ID}`);

    // Step 3: Test list queries return results
    console.log('\n📋 Step 3: Testing list queries with production app...');
    
    // Test anomaly incidents
    const anomalyResult = await client.callTool('get_anomaly_incidents', {
      states: ['OPEN'],
      limit: 10,
    });
    const anomalyData = JSON.parse(anomalyResult.content[0].text);
    console.log(`   ✓ Anomaly incidents: ${anomalyData.total} total, ${anomalyData.incidents.length} returned`);
    expect(anomalyData.incidents.length).toBeGreaterThan(0);

    // Test exception incidents
    const exceptionResult = await client.callTool('get_exception_incidents', {
      states: ['OPEN'],
      limit: 10,
    });
    const exceptionData = JSON.parse(exceptionResult.content[0].text);
    console.log(`   ✓ Exception incidents: ${exceptionData.total} total, ${exceptionData.incidents.length} returned`);
    expect(exceptionData.incidents.length).toBeGreaterThan(0);

    // Test log incidents
    const logResult = await client.callTool('get_log_incidents', {
      states: ['OPEN'],
      limit: 10,
    });
    const logData = JSON.parse(logResult.content[0].text);
    console.log(`   ✓ Log incidents: ${logData.total} total, ${logData.incidents.length} returned`);
    // Log incidents might be empty, that's OK

    // Step 4: Test singular incident queries (Bug 2 fix)
    console.log('\n🔍 Step 4: Testing singular incident queries (400 error fix)...');
    
    // Test anomaly incident
    if (anomalyData.incidents.length > 0) {
      const incidentId = anomalyData.incidents[0].id;
      console.log(`\n   Testing get_anomaly_incident with ID: ${incidentId}`);
      
      const singleAnomalyResult = await client.callTool('get_anomaly_incident', {
        incidentId: incidentId,
      });
      
      expect(singleAnomalyResult.content[0].text).not.toContain('400');
      expect(singleAnomalyResult.content[0].text).not.toContain('Error');
      
      const singleAnomaly = JSON.parse(singleAnomalyResult.content[0].text);
      expect(singleAnomaly.id).toBe(incidentId);
      console.log('   ✅ Successfully retrieved anomaly incident without 400 error!');
    }

    // Test exception incident
    if (exceptionData.incidents.length > 0) {
      const incidentId = exceptionData.incidents[0].id;
      console.log(`\n   Testing get_exception_incident with ID: ${incidentId}`);
      
      const singleExceptionResult = await client.callTool('get_exception_incident', {
        incidentId: incidentId,
      });
      
      expect(singleExceptionResult.content[0].text).not.toContain('400');
      expect(singleExceptionResult.content[0].text).not.toContain('Error');
      
      const singleException = JSON.parse(singleExceptionResult.content[0].text);
      expect(singleException.id).toBe(incidentId);
      console.log('   ✅ Successfully retrieved exception incident without 400 error!');
    }

    // Test log incident
    if (logData.incidents.length > 0) {
      const incidentId = logData.incidents[0].id;
      console.log(`\n   Testing get_log_incident with ID: ${incidentId}`);
      
      const singleLogResult = await client.callTool('get_log_incident', {
        incidentId: incidentId,
      });
      
      expect(singleLogResult.content[0].text).not.toContain('400');
      expect(singleLogResult.content[0].text).not.toContain('Error');
      
      const singleLog = JSON.parse(singleLogResult.content[0].text);
      expect(singleLog.id).toBe(incidentId);
      console.log('   ✅ Successfully retrieved log incident without 400 error!');
    }

    // Step 5: Verify development app returns empty results (for comparison)
    console.log('\n🔄 Step 5: Verifying development app has no incidents...');
    await client.callTool('select_app_id', { appId: DEVELOPMENT_APP_ID });
    
    const devAnomalyResult = await client.callTool('get_anomaly_incidents', {
      states: ['OPEN'],
      limit: 10,
    });
    const devAnomalyData = JSON.parse(devAnomalyResult.content[0].text);
    console.log(`   ✓ Development app anomaly incidents: ${devAnomalyData.total} (expected 0)`);
    expect(devAnomalyData.total).toBe(0);

    console.log('\n✅ All bug fixes verified!');
    console.log('   - Production app returns results (not development app)');
    console.log('   - Singular incident queries work without 400 errors');
  });
});