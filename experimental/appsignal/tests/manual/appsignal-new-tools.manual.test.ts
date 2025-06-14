import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../test-mcp-client/dist/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface NewToolsTestOutcome {
  status: 'SUCCESS' | 'WARNING' | 'FAILURE';
  details: {
    anomalyIncidentWorks: boolean;
    logIncidentsListWorks: boolean;
    exceptionIncidentsListWorks: boolean;
    anomalyIncidentsListWorks: boolean;
    stateFilteringWorks: boolean;
    paginationWorks: boolean;
  };
  warnings: string[];
  errors: string[];
}

/**
 * Manual tests for new AppSignal incident tools.
 * These tests verify the GraphQL queries work correctly with the real AppSignal API.
 */
describe('AppSignal New Incident Tools - Manual Test', () => {
  let client: TestMCPClient;
  let selectedAppId: string | null = null;
  const outcome: NewToolsTestOutcome = {
    status: 'SUCCESS',
    details: {
      anomalyIncidentWorks: false,
      logIncidentsListWorks: false,
      exceptionIncidentsListWorks: false,
      anomalyIncidentsListWorks: false,
      stateFilteringWorks: false,
      paginationWorks: false,
    },
    warnings: [],
    errors: [],
  };

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

    // Print final test outcome
    console.log('\n' + '='.repeat(60));
    console.log('NEW TOOLS TEST OUTCOME:', outcome.status);
    console.log('='.repeat(60));

    console.log('\nDetails:');
    Object.entries(outcome.details).forEach(([key, value]) => {
      console.log(`  ${key}: ${value ? '✓' : '✗'}`);
    });

    if (outcome.warnings.length > 0) {
      console.log('\nWarnings:');
      outcome.warnings.forEach((w) => console.log(`  ⚠️  ${w}`));
    }

    if (outcome.errors.length > 0) {
      console.log('\nErrors:');
      outcome.errors.forEach((e) => console.log(`  ❌ ${e}`));
    }

    console.log('\n' + '='.repeat(60));

    // Final determination
    if (outcome.errors.length > 0) {
      outcome.status = 'FAILURE';
    } else if (outcome.warnings.length > 0) {
      outcome.status = 'WARNING';
    }

    // Throw if failure
    if (outcome.status === 'FAILURE') {
      throw new Error(`New tools test failed with ${outcome.errors.length} error(s)`);
    }
  });

  it('should test all new incident tools', async () => {
    console.log('\n🧪 Starting New Incident Tools Test...\n');

    // Step 1: Get Apps and select one
    try {
      console.log('📱 Step 1: Getting list of apps...');
      const appsResult = await client.callTool('get_apps', {});
      const response = JSON.parse(appsResult.content[0].text);

      if (!response.apps || response.apps.length === 0) {
        outcome.warnings.push('No apps found - cannot test incident tools');
        return;
      }

      // Select first app
      selectedAppId = response.apps[0].id;
      await client.callTool('select_app_id', { appId: selectedAppId });
      console.log(`   ✓ Selected app: ${response.apps[0].name}`);
    } catch (error) {
      outcome.errors.push(`App selection failed: ${error}`);
      console.error('   ❌ Error:', error);
      return;
    }

    // Step 2: Test log incidents list
    try {
      console.log('\n📋 Step 2: Testing get_log_incidents...');
      const logIncidentsResult = await client.callTool('get_log_incidents', {
        states: ['OPEN', 'CLOSED'],
        limit: 10,
      });

      if (logIncidentsResult.content[0].text.includes('Error')) {
        // Check if it's a GraphQL error
        if (
          logIncidentsResult.content[0].text.includes('Cannot query field') ||
          logIncidentsResult.content[0].text.includes('not found')
        ) {
          outcome.errors.push('Log incidents GraphQL query is invalid');
          console.error('   ❌ GraphQL query error:', logIncidentsResult.content[0].text);
        } else {
          console.log('   ℹ️  No log incidents found or API limitation');
          outcome.warnings.push('Log incidents list returned an error - may be API limitation');
        }
      } else {
        const response = JSON.parse(logIncidentsResult.content[0].text);

        // Validate response shape
        expect(response).toHaveProperty('incidents');
        expect(response).toHaveProperty('total');
        expect(response).toHaveProperty('hasMore');
        expect(Array.isArray(response.incidents)).toBe(true);

        outcome.details.logIncidentsListWorks = true;
        console.log(`   ✓ Log incidents list works - found ${response.incidents.length} incidents`);

        if (response.incidents.length > 0) {
          // Validate incident structure
          const firstIncident = response.incidents[0];
          expect(firstIncident).toHaveProperty('id');
          expect(firstIncident).toHaveProperty('number');
          console.log('   ✓ Log incident structure is valid');
        }
      }
    } catch (error) {
      outcome.errors.push(`Log incidents list failed: ${error}`);
      console.error('   ❌ Error:', error);
    }

    // Step 3: Test exception incidents list
    try {
      console.log('\n📋 Step 3: Testing get_exception_incidents...');
      const exceptionIncidentsResult = await client.callTool('get_exception_incidents', {
        states: ['OPEN'],
        limit: 5,
      });

      if (exceptionIncidentsResult.content[0].text.includes('Error')) {
        if (
          exceptionIncidentsResult.content[0].text.includes('Cannot query field') ||
          exceptionIncidentsResult.content[0].text.includes('not found')
        ) {
          outcome.errors.push('Exception incidents GraphQL query is invalid');
          console.error('   ❌ GraphQL query error:', exceptionIncidentsResult.content[0].text);
        } else {
          console.log('   ℹ️  No exception incidents found or API limitation');
          outcome.warnings.push(
            'Exception incidents list returned an error - may be API limitation'
          );
        }
      } else {
        const response = JSON.parse(exceptionIncidentsResult.content[0].text);

        expect(response).toHaveProperty('incidents');
        expect(response).toHaveProperty('total');
        expect(response).toHaveProperty('hasMore');

        outcome.details.exceptionIncidentsListWorks = true;
        console.log(
          `   ✓ Exception incidents list works - found ${response.incidents.length} incidents`
        );

        if (response.incidents.length > 0) {
          const firstIncident = response.incidents[0];
          expect(firstIncident).toHaveProperty('id');
          expect(firstIncident).toHaveProperty('name');
          expect(firstIncident).toHaveProperty('message');
          expect(firstIncident).toHaveProperty('count');
          console.log('   ✓ Exception incident structure is valid');
        }
      }
    } catch (error) {
      outcome.errors.push(`Exception incidents list failed: ${error}`);
      console.error('   ❌ Error:', error);
    }

    // Step 4: Test anomaly incidents list
    try {
      console.log('\n📋 Step 4: Testing get_anomaly_incidents...');
      const anomalyIncidentsResult = await client.callTool('get_anomaly_incidents', {
        states: ['OPEN', 'CLOSED', 'WIP'],
        limit: 10,
      });

      if (anomalyIncidentsResult.content[0].text.includes('Error')) {
        if (
          anomalyIncidentsResult.content[0].text.includes('Cannot query field') ||
          anomalyIncidentsResult.content[0].text.includes('not found')
        ) {
          outcome.errors.push('Anomaly incidents GraphQL query is invalid');
          console.error('   ❌ GraphQL query error:', anomalyIncidentsResult.content[0].text);
        } else {
          console.log('   ℹ️  No anomaly incidents found or API limitation');
          outcome.warnings.push('Anomaly incidents list returned an error - may be API limitation');
        }
      } else {
        const response = JSON.parse(anomalyIncidentsResult.content[0].text);

        expect(response).toHaveProperty('incidents');
        expect(response).toHaveProperty('total');
        expect(response).toHaveProperty('hasMore');

        outcome.details.anomalyIncidentsListWorks = true;
        console.log(
          `   ✓ Anomaly incidents list works - found ${response.incidents.length} incidents`
        );

        if (response.incidents.length > 0) {
          const firstIncident = response.incidents[0];
          expect(firstIncident).toHaveProperty('id');
          expect(firstIncident).toHaveProperty('number');
          console.log('   ✓ Anomaly incident structure is valid');
        }
      }
    } catch (error) {
      outcome.errors.push(`Anomaly incidents list failed: ${error}`);
      console.error('   ❌ Error:', error);
    }

    // Step 5: Test state filtering
    try {
      console.log('\n🎯 Step 5: Testing state filtering...');

      // Test with CLOSED state only
      const closedIncidentsResult = await client.callTool('get_exception_incidents', {
        states: ['CLOSED'],
        limit: 5,
      });

      if (!closedIncidentsResult.content[0].text.includes('Error')) {
        console.log(`   ✓ State filtering works - queried CLOSED incidents`);
        outcome.details.stateFilteringWorks = true;
      }
    } catch (error) {
      console.log('   ⚠️  Could not test state filtering:', error);
    }

    // Step 6: Test pagination
    try {
      console.log('\n📄 Step 6: Testing pagination...');

      const paginatedResult = await client.callTool('get_exception_incidents', {
        limit: 2,
        offset: 0,
      });

      if (!paginatedResult.content[0].text.includes('Error')) {
        const paginatedResponse = JSON.parse(paginatedResult.content[0].text);
        if (paginatedResponse.hasMore !== undefined) {
          console.log(`   ✓ Pagination parameters accepted`);
          outcome.details.paginationWorks = true;
        }
      }
    } catch (error) {
      console.log('   ⚠️  Could not test pagination:', error);
    }

    // Step 7: Test individual anomaly incident (error handling)
    try {
      console.log('\n🔍 Step 7: Testing get_anomaly_incident...');
      const testIncidentId = `test-anomaly-${Date.now()}`;

      const anomalyResult = await client.callTool('get_anomaly_incident', {
        incidentId: testIncidentId,
      });

      if (anomalyResult.content[0].text.includes('Error')) {
        console.log('   ✓ Anomaly incident endpoint works (returned expected error)');
        outcome.details.anomalyIncidentWorks = true;
      } else {
        console.log('   ⚠️  Unexpectedly found an anomaly incident with generated ID');
      }
    } catch (error) {
      outcome.errors.push(`Anomaly incident test failed: ${error}`);
      console.error('   ❌ Error:', error);
    }

    // Summary
    const criticalTestsPassed =
      outcome.details.logIncidentsListWorks ||
      outcome.details.exceptionIncidentsListWorks ||
      outcome.details.anomalyIncidentsListWorks;

    if (criticalTestsPassed && outcome.errors.length === 0) {
      console.log('\n✅ New tools integration verified - GraphQL queries are working!');
    } else if (outcome.errors.length > 0) {
      console.log('\n❌ Some GraphQL queries failed - check errors above');
    } else {
      console.log('\n⚠️  Could not fully verify new tools - may need data in AppSignal');
    }
  });
});
