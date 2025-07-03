import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import type { TimelineEvent } from '../../shared/src/appsignal-client/lib/performance-incident-sample-timeline.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TestOutcome {
  status: 'SUCCESS' | 'WARNING' | 'FAILURE';
  details: {
    appsFound: boolean;
    appSelected: boolean;
    performanceIncidentsFound: boolean;
    performanceIncidentDetailWorks: boolean;
    performanceSampleWorks: boolean;
    performanceTimelineWorks: boolean;
    nPlusOneDetectionWorks: boolean;
    errorHandlingWorks: boolean;
  };
  warnings: string[];
  errors: string[];
}

/**
 * Manual tests for AppSignal Performance Tools.
 *
 * These tests require a real AppSignal API key and will make actual API calls.
 * They verify that the performance monitoring tools work correctly with the real API.
 */
describe('AppSignal Performance Tools - Manual Test', () => {
  let client: TestMCPClient;
  let selectedAppId: string | null = null;
  const outcome: TestOutcome = {
    status: 'SUCCESS',
    details: {
      appsFound: false,
      appSelected: false,
      performanceIncidentsFound: false,
      performanceIncidentDetailWorks: false,
      performanceSampleWorks: false,
      performanceTimelineWorks: false,
      nPlusOneDetectionWorks: false,
      errorHandlingWorks: false,
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
    console.log('PERFORMANCE TOOLS TEST OUTCOME:', outcome.status);
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
      outcome.errors.forEach((e) => console.log(`  ❌  ${e}`));
    }
  });

  it('should get list of apps and select first available', async () => {
    try {
      console.log('\n🔍 Fetching available apps...');

      const appsResult = await client.callTool('get_apps', {});
      const response = JSON.parse(appsResult.content[0].text);
      const apps = response.apps;

      console.log(`Found ${apps.length} apps`);

      expect(apps).toBeDefined();
      expect(Array.isArray(apps)).toBe(true);

      if (apps.length === 0) {
        outcome.warnings.push('No apps found in AppSignal account');
        outcome.status = 'WARNING';
        return;
      }

      outcome.details.appsFound = true;

      // Select the first app
      const firstApp = apps[0];
      console.log(`\n🎯 Selecting app: ${firstApp.name} (${firstApp.id})`);

      const selectResult = await client.callTool('select_app_id', { appId: firstApp.id });
      expect(selectResult.content[0].text).toContain('Successfully selected app');

      selectedAppId = firstApp.id;
      outcome.details.appSelected = true;

      // Log all apps for reference
      console.log('\nAvailable apps:');
      apps.forEach((app: { id: string; name: string; environment?: string }) => {
        console.log(`  - ${app.name} (${app.id}) - ${app.environment || 'no env'}`);
      });
    } catch (error) {
      outcome.errors.push(`Failed to get/select apps: ${error}`);
      outcome.status = 'FAILURE';
      throw error;
    }
  });

  it('should retrieve performance incidents list', async () => {
    if (!selectedAppId) {
      console.log('⚠️  Skipping: No app selected');
      return;
    }

    try {
      console.log('\n🔍 Fetching performance incidents...');

      // Test 1: Default call (should return OPEN incidents)
      const result = await client.callTool('get_performance_incidents', {});
      const response = JSON.parse(result.content[0].text);

      console.log(
        `Found ${response.incidents.length} performance incidents (total: ${response.total})`
      );

      expect(response).toHaveProperty('incidents');
      expect(response).toHaveProperty('total');
      expect(response).toHaveProperty('hasMore');
      expect(Array.isArray(response.incidents)).toBe(true);

      // Test 2: Verify states are uppercase in response
      if (response.incidents.length > 0) {
        response.incidents.forEach((incident: { state: string }) => {
          expect(['OPEN', 'CLOSED', 'WIP']).toContain(incident.state);
        });
        console.log('✓ All incident states are properly uppercase');
      }

      // Test 3: Empty states array should default to OPEN
      console.log('\n🔍 Testing empty states array handling...');
      const emptyStatesResult = await client.callTool('get_performance_incidents', {
        states: [],
      });
      const emptyStatesResponse = JSON.parse(emptyStatesResult.content[0].text);
      console.log(`Empty states array returned ${emptyStatesResponse.incidents.length} incidents`);

      // Should return same as default (OPEN only)
      expect(emptyStatesResponse.total).toBe(response.total);

      if (response.incidents.length === 0) {
        // Test 4: If no OPEN incidents, try ALL states to ensure API is working
        console.log('\n🔍 No OPEN incidents found, trying all states...');
        const allStatesResult = await client.callTool('get_performance_incidents', {
          states: ['OPEN', 'CLOSED', 'WIP'],
        });
        const allStatesResponse = JSON.parse(allStatesResult.content[0].text);
        console.log(`All states returned ${allStatesResponse.incidents.length} incidents`);

        if (allStatesResponse.incidents.length === 0) {
          outcome.warnings.push(
            'No performance incidents found in any state - need performance data in AppSignal'
          );
          console.log(
            '⚠️  No performance incidents found. This may be expected if the app has no performance issues.'
          );
          return;
        } else {
          console.log('✓ Found incidents in non-OPEN states');
          response.incidents = allStatesResponse.incidents;
          response.total = allStatesResponse.total;
        }
      }

      outcome.details.performanceIncidentsFound = true;

      // Log first few incidents
      console.log('\nFirst few performance incidents:');
      response.incidents
        .slice(0, 3)
        .forEach(
          (incident: {
            id: string;
            actionNames: string[];
            state: string;
            mean: number;
            count: number;
            hasNPlusOne: boolean;
            hasSamplesInRetention: boolean;
          }) => {
            console.log(`  - ${incident.actionNames.join(', ')} (${incident.id})`);
            console.log(
              `    State: ${incident.state}, Mean: ${incident.mean}ms, Count: ${incident.count}`
            );
            console.log(
              `    N+1: ${incident.hasNPlusOne ? 'YES' : 'NO'}, Samples: ${incident.hasSamplesInRetention ? 'YES' : 'NO'}`
            );
          }
        );

      // Store first incident ID for detail tests
      const firstIncidentId = response.incidents[0].id;

      // Test filtering by state
      console.log('\n🔍 Testing state filtering...');
      const closedResult = await client.callTool('get_performance_incidents', {
        states: ['CLOSED'],
      });
      const closedResponse = JSON.parse(closedResult.content[0].text);
      console.log(`Found ${closedResponse.incidents.length} closed incidents`);

      // Test pagination
      console.log('\n🔍 Testing pagination...');
      const paginatedResult = await client.callTool('get_performance_incidents', {
        limit: 5,
        offset: 0,
      });
      const paginatedResponse = JSON.parse(paginatedResult.content[0].text);
      console.log(`Paginated result: ${paginatedResponse.incidents.length} incidents`);

      // Test getting incident details
      if (firstIncidentId) {
        console.log(`\n🔍 Getting details for incident ${firstIncidentId}...`);
        await testPerformanceIncidentDetail(firstIncidentId);
      }
    } catch (error) {
      outcome.errors.push(`Failed to get performance incidents: ${error}`);
      console.error('❌ Error:', error);
    }
  });

  async function testPerformanceIncidentDetail(incidentNumber: string) {
    try {
      const result = await client.callTool('get_performance_incident', { incidentNumber });
      const incident = JSON.parse(result.content[0].text);

      console.log('Performance incident details:');
      console.log(`  ID: ${incident.id}`);
      console.log(`  Actions: ${incident.actionNames.join(', ')}`);
      console.log(`  Mean duration: ${incident.mean}ms`);
      console.log(`  Total duration: ${incident.totalDuration}ms`);
      console.log(`  Has N+1: ${incident.hasNPlusOne}`);
      console.log(`  Description: ${incident.description}`);

      outcome.details.performanceIncidentDetailWorks = true;

      // Try to get sample if available
      if (incident.hasSamplesInRetention) {
        await testPerformanceIncidentSample(incidentNumber);
      } else {
        outcome.warnings.push(`Incident ${incidentNumber} has no samples in retention`);
        console.log('⚠️  No samples available for this incident');
      }
    } catch (error) {
      outcome.errors.push(`Failed to get performance incident details: ${error}`);
      console.error('❌ Error getting incident details:', error);
    }
  }

  async function testPerformanceIncidentSample(incidentNumber: string) {
    try {
      console.log(`\n🔍 Getting sample for incident ${incidentNumber}...`);

      const result = await client.callTool('get_performance_incident_sample', { incidentNumber });
      const sample = JSON.parse(result.content[0].text);

      console.log('Performance sample details:');
      console.log(`  Sample ID: ${sample.id}`);
      console.log(`  Action: ${sample.action}`);
      console.log(`  Duration: ${sample.duration}ms`);
      console.log(`  Queue duration: ${sample.queueDuration}ms`);
      console.log(`  Has N+1: ${sample.hasNPlusOne}`);
      console.log(`  Timeline truncated events: ${sample.timelineTruncatedEvents}`);

      if (sample.customData) {
        console.log(`  Custom data: ${JSON.stringify(sample.customData)}`);
      }
      if (sample.params) {
        console.log(`  Params: ${JSON.stringify(sample.params)}`);
      }

      outcome.details.performanceSampleWorks = true;

      // Track N+1 detection
      if (sample.hasNPlusOne) {
        outcome.details.nPlusOneDetectionWorks = true;
        console.log('✓ N+1 query detection is working');
      }

      // Get timeline for this sample
      await testPerformanceIncidentTimeline(incidentNumber);
    } catch (error) {
      outcome.errors.push(`Failed to get performance sample: ${error}`);
      console.error('❌ Error getting sample:', error);
    }
  }

  async function testPerformanceIncidentTimeline(incidentNumber: string) {
    try {
      console.log(`\n🔍 Getting timeline for incident ${incidentNumber}...`);

      const result = await client.callTool('get_performance_incident_sample_timeline', {
        incidentNumber,
      });
      const timeline = JSON.parse(result.content[0].text);

      console.log(`Timeline for sample ${timeline.sampleId}:`);
      console.log(`  Total events: ${timeline.timeline.length}`);

      // Group events by level for better visualization
      const eventsByLevel: Record<number, TimelineEvent[]> = {};
      timeline.timeline.forEach((event: TimelineEvent) => {
        if (!eventsByLevel[event.level]) {
          eventsByLevel[event.level] = [];
        }
        eventsByLevel[event.level].push(event);
      });

      // Display timeline hierarchy
      console.log('\nTimeline hierarchy:');
      Object.keys(eventsByLevel)
        .sort()
        .forEach((level) => {
          const events = eventsByLevel[Number(level)];
          const indent = '  '.repeat(Number(level));
          events.forEach((event: TimelineEvent) => {
            console.log(`${indent}└─ ${event.name} (${event.duration}ms)`);
            if (event.count > 1) {
              console.log(`${indent}   ⚠️  Called ${event.count} times (possible N+1)`);
              outcome.details.nPlusOneDetectionWorks = true;
            }
            if (event.payload?.body) {
              console.log(`${indent}   SQL: ${event.payload.body.substring(0, 60)}...`);
            }
          });
        });

      outcome.details.performanceTimelineWorks = true;

      // Look for performance issues
      const slowQueries = timeline.timeline.filter((e: TimelineEvent) => e.duration > 100);
      if (slowQueries.length > 0) {
        console.log(`\n⚠️  Found ${slowQueries.length} slow operations (>100ms)`);
      }

      const nPlusOneQueries = timeline.timeline.filter((e: TimelineEvent) => e.count > 5);
      if (nPlusOneQueries.length > 0) {
        console.log(`⚠️  Found ${nPlusOneQueries.length} potential N+1 queries`);
      }
    } catch (error) {
      outcome.errors.push(`Failed to get performance timeline: ${error}`);
      console.error('❌ Error getting timeline:', error);
    }
  }

  it('should handle error cases gracefully', async () => {
    if (!selectedAppId) {
      console.log('⚠️  Skipping: No app selected');
      return;
    }

    try {
      console.log('\n🔍 Testing error handling...');

      // Test non-existent incident
      console.log('Testing non-existent incident...');
      const result = await client.callTool('get_performance_incident', {
        incidentNumber: 'non-existent-id-12345',
      });

      expect(result.content[0].text).toContain('Error');
      console.log('✓ Error handling for non-existent incident works');

      // Test non-existent sample
      console.log('Testing non-existent sample...');
      const sampleResult = await client.callTool('get_performance_incident_sample', {
        incidentNumber: 'non-existent-id-12345',
      });

      expect(sampleResult.content[0].text).toContain('Error');
      console.log('✓ Error handling for non-existent sample works');

      outcome.details.errorHandlingWorks = true;
    } catch (error) {
      outcome.errors.push(`Error handling test failed: ${error}`);
      console.error('❌ Error:', error);
    }
  });

  it('should provide summary and recommendations', async () => {
    console.log('\n' + '='.repeat(60));
    console.log('PERFORMANCE TOOLS TEST SUMMARY');
    console.log('='.repeat(60));

    if (outcome.details.performanceIncidentsFound) {
      console.log('\n✅ Performance monitoring is working correctly');
      console.log('   - Can retrieve performance incidents');
      console.log('   - Can get incident details');

      if (outcome.details.performanceSampleWorks) {
        console.log('   - Can retrieve performance samples');
      }

      if (outcome.details.performanceTimelineWorks) {
        console.log('   - Can retrieve and analyze timelines');
      }

      if (outcome.details.nPlusOneDetectionWorks) {
        console.log('   - N+1 query detection is functional');
      }
    } else {
      console.log('\n⚠️  No performance data found to test with');
      console.log('   To fully test performance tools:');
      console.log('   1. Ensure your app has performance monitoring enabled');
      console.log('   2. Generate some slow requests or N+1 queries');
      console.log('   3. Wait for data to appear in AppSignal');
    }

    // Determine final status
    if (outcome.errors.length > 0) {
      outcome.status = 'FAILURE';
    } else if (outcome.warnings.length > 0 || !outcome.details.performanceIncidentsFound) {
      outcome.status = 'WARNING';
    }
  });
});
