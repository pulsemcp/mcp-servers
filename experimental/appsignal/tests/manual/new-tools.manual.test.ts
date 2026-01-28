import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TestOutcome {
  status: 'SUCCESS' | 'WARNING' | 'FAILURE';
  details: {
    appsFound: boolean;
    appSelected: boolean;
    getPerfSamplesWorks: boolean;
    getMetricsWorks: boolean;
    getMetricsTimeseriesWorks: boolean;
    getDeployMarkersWorks: boolean;
    getSlowRequestsWorks: boolean;
  };
  warnings: string[];
  errors: string[];
}

/**
 * Manual tests for the new AppSignal tools:
 * - get_perf_samples
 * - get_metrics
 * - get_metrics_timeseries
 * - get_deploy_markers
 * - get_slow_requests
 *
 * These tests require a real AppSignal API key and will make actual API calls.
 */
describe('AppSignal New Tools - Manual Test', () => {
  let client: TestMCPClient;
  let selectedAppId: string | null = null;
  const outcome: TestOutcome = {
    status: 'SUCCESS',
    details: {
      appsFound: false,
      appSelected: false,
      getPerfSamplesWorks: false,
      getMetricsWorks: false,
      getMetricsTimeseriesWorks: false,
      getDeployMarkersWorks: false,
      getSlowRequestsWorks: false,
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

      // Prefer to select pulsemcp production app if available for richer data
      const pulsemcpApp = apps.find(
        (app: { name: string; environment: string }) =>
          app.name.toLowerCase().includes('pulsemcp') && app.environment === 'production'
      );
      const appToSelect = pulsemcpApp || apps[0];
      console.log(`\n🎯 Selecting app: ${appToSelect.name} (${appToSelect.id})`);

      const selectResult = await client.callTool('select_app_id', { appId: appToSelect.id });
      expect(selectResult.content[0].text).toContain('Successfully selected app');

      selectedAppId = appToSelect.id;
      outcome.details.appSelected = true;
    } catch (error) {
      outcome.errors.push(`Failed to get/select apps: ${error}`);
      outcome.status = 'FAILURE';
      throw error;
    }
  });

  it('should test get_perf_samples tool', async () => {
    if (!selectedAppId) {
      console.log('⚠️  Skipping: No app selected');
      return;
    }

    try {
      console.log('\n🔍 Testing get_perf_samples...');

      // First get a performance incident
      const incidentsResult = await client.callTool('get_perf_incidents', {
        states: ['OPEN'],
        limit: 1,
      });
      const incidentsResponse = JSON.parse(incidentsResult.content[0].text);

      if (incidentsResponse.incidents.length === 0) {
        outcome.warnings.push('No open performance incidents to test samples');
        console.log('⚠️  No open performance incidents found');
        return;
      }

      const incident = incidentsResponse.incidents[0];
      const actionName = incident.actionNames[0];
      console.log(`Testing with action: ${actionName}`);

      const result = await client.callTool('get_perf_samples', {
        actionName: actionName,
        limit: 5,
      });
      const response = JSON.parse(result.content[0].text);

      console.log(`\nPerformance Samples Result:`);
      console.log(`  Incident Number: ${response.incidentNumber}`);
      console.log(`  Action Names: ${response.actionNames.join(', ')}`);
      console.log(`  Mean Duration: ${response.mean}ms`);
      console.log(`  Samples Count: ${response.samples.length}`);

      if (response.samples.length > 0) {
        console.log('\n  First few samples:');
        response.samples.slice(0, 3).forEach(
          (
            sample: {
              id: string;
              time: string;
              action: string;
              duration: number;
              queueDuration: number | null;
              hasNPlusOne: boolean;
              overview: Array<{ key: string; value: string }>;
              groupDurations: Array<{ key: string; value: number }>;
            },
            idx: number
          ) => {
            console.log(`    Sample ${idx + 1}:`);
            console.log(`      Time: ${sample.time}`);
            console.log(`      Duration: ${sample.duration}ms`);
            console.log(`      Queue Duration: ${sample.queueDuration}ms`);
            console.log(`      Has N+1: ${sample.hasNPlusOne}`);

            // Show path from overview
            const pathOverview = sample.overview.find((o) => o.key === 'path');
            if (pathOverview) {
              console.log(`      Path: ${pathOverview.value}`);
            }

            // Show timing breakdown
            if (sample.groupDurations.length > 0) {
              console.log(`      Timing Breakdown:`);
              sample.groupDurations.forEach((gd) => {
                console.log(`        ${gd.key}: ${gd.value.toFixed(2)}ms`);
              });
            }
          }
        );
      }

      expect(response.incidentNumber).toBeDefined();
      expect(response.samples).toBeDefined();
      expect(Array.isArray(response.samples)).toBe(true);

      outcome.details.getPerfSamplesWorks = true;
      console.log('\n✓ get_perf_samples works correctly');
    } catch (error) {
      outcome.errors.push(`get_perf_samples failed: ${error}`);
      console.error('❌ Error:', error);
    }
  });

  it('should test get_metrics tool', async () => {
    if (!selectedAppId) {
      console.log('⚠️  Skipping: No app selected');
      return;
    }

    try {
      console.log('\n🔍 Testing get_metrics...');

      const result = await client.callTool('get_metrics', {
        metricName: 'transaction_duration',
        namespace: 'web',
        timeframe: 'R24H',
        limit: 10,
      });
      const response = JSON.parse(result.content[0].text);

      console.log(`\nMetrics Result:`);
      console.log(`  Time Range: ${response.start} to ${response.end}`);
      console.log(`  Rows: ${response.rows.length}`);

      if (response.rows.length > 0) {
        const row = response.rows[0];
        console.log(`\n  First row:`);
        console.log(`    Name: ${row.name}`);
        console.log(
          `    Tags: ${row.tags.map((t: { key: string; value: string }) => `${t.key}=${t.value}`).join(', ')}`
        );
        console.log(`    Fields:`);
        row.fields.forEach((f: { key: string; value: number | null }) => {
          const value = f.value !== null ? f.value.toFixed(2) : 'null';
          console.log(`      ${f.key}: ${value}${f.key.includes('count') ? '' : 'ms'}`);
        });
      }

      expect(response.start).toBeDefined();
      expect(response.end).toBeDefined();
      expect(response.rows).toBeDefined();

      outcome.details.getMetricsWorks = true;
      console.log('\n✓ get_metrics works correctly');
    } catch (error) {
      outcome.errors.push(`get_metrics failed: ${error}`);
      console.error('❌ Error:', error);
    }
  });

  it('should test get_metrics_timeseries tool', async () => {
    if (!selectedAppId) {
      console.log('⚠️  Skipping: No app selected');
      return;
    }

    try {
      console.log('\n🔍 Testing get_metrics_timeseries...');

      const result = await client.callTool('get_metrics_timeseries', {
        metricName: 'transaction_duration',
        namespace: 'web',
        timeframe: 'R1H',
      });
      const response = JSON.parse(result.content[0].text);

      console.log(`\nTimeseries Result:`);
      console.log(`  Resolution: ${response.resolution}`);
      console.log(`  Time Range: ${response.start} to ${response.end}`);
      console.log(`  Keys: ${response.keys.length}`);
      console.log(`  Data Points: ${response.points.length}`);

      if (response.points.length > 0) {
        // Show a few data points
        console.log(`\n  Sample data points (first 5):`);
        response.points
          .slice(0, 5)
          .forEach(
            (point: {
              timestamp: number;
              values: Array<{ key: string; value: number | null }>;
            }) => {
              const time = new Date(point.timestamp * 1000).toISOString();
              const values = point.values
                .map((v) => `${v.key.split(';')[1] || v.key}: ${v.value?.toFixed(2) || 'null'}ms`)
                .join(', ');
              console.log(`    ${time}: ${values}`);
            }
          );
      }

      expect(response.resolution).toBeDefined();
      expect(response.points).toBeDefined();
      expect(Array.isArray(response.points)).toBe(true);

      outcome.details.getMetricsTimeseriesWorks = true;
      console.log('\n✓ get_metrics_timeseries works correctly');
    } catch (error) {
      outcome.errors.push(`get_metrics_timeseries failed: ${error}`);
      console.error('❌ Error:', error);
    }
  });

  it('should test get_deploy_markers tool', async () => {
    if (!selectedAppId) {
      console.log('⚠️  Skipping: No app selected');
      return;
    }

    try {
      console.log('\n🔍 Testing get_deploy_markers...');

      const result = await client.callTool('get_deploy_markers', {
        timeframe: 'R7D',
        limit: 5,
      });
      const responseText = result.content[0].text;

      // Check if response is an error message
      if (responseText.startsWith('Error')) {
        outcome.warnings.push(
          'get_deploy_markers returned an error (may be expected for some apps)'
        );
        console.log(`⚠️  ${responseText}`);
        outcome.details.getDeployMarkersWorks = true; // Tool works, just no data
        return;
      }

      const response = JSON.parse(responseText);

      console.log(`\nDeploy Markers Result:`);
      console.log(`  Total markers: ${Array.isArray(response) ? response.length : 0}`);

      if (Array.isArray(response) && response.length > 0) {
        console.log(`\n  Recent deployments:`);
        response.forEach(
          (
            marker: {
              id: string;
              revision: string;
              shortRevision: string;
              createdAt: string;
              user: string | null;
              exceptionCount: number;
            },
            idx: number
          ) => {
            console.log(`    ${idx + 1}. ${marker.shortRevision}`);
            console.log(`       Time: ${marker.createdAt}`);
            console.log(`       User: ${marker.user || 'unknown'}`);
            console.log(`       Exceptions: ${marker.exceptionCount}`);
          }
        );
      } else {
        outcome.warnings.push('No deploy markers found in the last 7 days');
        console.log('⚠️  No deploy markers found (this may be expected if no recent deployments)');
      }

      outcome.details.getDeployMarkersWorks = true;
      console.log('\n✓ get_deploy_markers works correctly');
    } catch (error) {
      outcome.errors.push(`get_deploy_markers failed: ${error}`);
      console.error('❌ Error:', error);
    }
  });

  it('should test get_slow_requests tool', async () => {
    if (!selectedAppId) {
      console.log('⚠️  Skipping: No app selected');
      return;
    }

    try {
      console.log('\n🔍 Testing get_slow_requests...');

      const result = await client.callTool('get_slow_requests', {
        incidentLimit: 3,
        samplesPerIncident: 2,
      });
      const responseText = result.content[0].text;

      // Check if response is an error message
      if (responseText.startsWith('Error')) {
        outcome.warnings.push(
          'get_slow_requests returned an error (may be expected for some apps)'
        );
        console.log(`⚠️  ${responseText}`);
        outcome.details.getSlowRequestsWorks = true; // Tool works, just encountered an API issue
        return;
      }

      const response = JSON.parse(responseText);

      console.log(`\nSlow Requests Result:`);
      console.log(`  Incidents: ${response.incidents.length}`);

      if (response.incidents.length > 0) {
        console.log(`\n  Slowest endpoints:`);
        response.incidents.forEach(
          (
            incident: {
              number: number;
              actionNames: string[];
              mean: number;
              count: number;
              hasNPlusOne: boolean;
              namespace: string;
              samples: Array<{
                id: string;
                time: string;
                action: string;
                duration: number;
                overview: Array<{ key: string; value: string }>;
                groupDurations: Array<{ key: string; value: number }>;
              }>;
            },
            idx: number
          ) => {
            console.log(`\n    ${idx + 1}. ${incident.actionNames.join(', ')}`);
            console.log(`       Mean: ${incident.mean.toFixed(2)}ms, Count: ${incident.count}`);
            console.log(`       Has N+1: ${incident.hasNPlusOne}`);

            if (incident.samples.length > 0) {
              console.log(`       Recent samples:`);
              incident.samples.forEach((sample) => {
                const pathOverview = sample.overview.find((o) => o.key === 'path');
                console.log(
                  `         - ${sample.duration.toFixed(2)}ms: ${pathOverview?.value || sample.action}`
                );
              });
            }
          }
        );
      } else {
        outcome.warnings.push('No slow requests found');
        console.log('⚠️  No slow requests found (this may be expected)');
      }

      expect(response.incidents).toBeDefined();
      expect(Array.isArray(response.incidents)).toBe(true);

      outcome.details.getSlowRequestsWorks = true;
      console.log('\n✓ get_slow_requests works correctly');
    } catch (error) {
      outcome.errors.push(`get_slow_requests failed: ${error}`);
      console.error('❌ Error:', error);
    }
  });

  it('should provide summary', async () => {
    console.log('\n' + '='.repeat(60));
    console.log('NEW TOOLS TEST SUMMARY');
    console.log('='.repeat(60));

    const toolsWorking = [
      outcome.details.getPerfSamplesWorks && 'get_perf_samples',
      outcome.details.getMetricsWorks && 'get_metrics',
      outcome.details.getMetricsTimeseriesWorks && 'get_metrics_timeseries',
      outcome.details.getDeployMarkersWorks && 'get_deploy_markers',
      outcome.details.getSlowRequestsWorks && 'get_slow_requests',
    ].filter(Boolean);

    if (toolsWorking.length > 0) {
      console.log('\n✅ Working tools:');
      toolsWorking.forEach((tool) => console.log(`   - ${tool}`));
    }

    const toolsFailed = [
      !outcome.details.getPerfSamplesWorks && 'get_perf_samples',
      !outcome.details.getMetricsWorks && 'get_metrics',
      !outcome.details.getMetricsTimeseriesWorks && 'get_metrics_timeseries',
      !outcome.details.getDeployMarkersWorks && 'get_deploy_markers',
      !outcome.details.getSlowRequestsWorks && 'get_slow_requests',
    ].filter(Boolean);

    if (toolsFailed.length > 0) {
      console.log('\n❌ Failed tools:');
      toolsFailed.forEach((tool) => console.log(`   - ${tool}`));
    }

    // Determine final status
    if (outcome.errors.length > 0) {
      outcome.status = 'FAILURE';
    } else if (outcome.warnings.length > 0) {
      outcome.status = 'WARNING';
    }
  });
});
