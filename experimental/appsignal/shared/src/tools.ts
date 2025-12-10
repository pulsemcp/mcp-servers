import { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getAppsTool } from './tools/get-apps.js';
import { selectAppIdTool } from './tools/select-app-id.js';
import { getExceptionIncidentTool } from './tools/get-exception-incident.js';
import { getExceptionIncidentSampleTool } from './tools/get-exception-incident-sample.js';
import { getLogIncidentTool } from './tools/get-log-incident.js';
import { searchLogsTool } from './tools/search-logs.js';
import { getAnomalyIncidentTool } from './tools/get-anomaly-incident.js';
import { getLogIncidentsTool } from './tools/get-log-incidents.js';
import { getExceptionIncidentsTool } from './tools/get-exception-incidents.js';
import { getAnomalyIncidentsTool } from './tools/get-anomaly-incidents.js';
import { IAppsignalClient } from './appsignal-client/appsignal-client.js';
import { getEffectiveAppId, isAppIdLocked } from './state.js';
import { getPerformanceIncidentsTool } from './tools/get-performance-incidents.js';
import { getPerformanceIncidentTool } from './tools/get-performance-incident.js';
import { getPerformanceIncidentSampleTool } from './tools/get-performance-incident-sample.js';
import { getPerformanceIncidentSampleTimelineTool } from './tools/get-performance-incident-sample-timeline.js';
import { getSlowRequestsTool } from './tools/get-slow-requests.js';
import { getDeployMarkersTool } from './tools/get-deploy-markers.js';
import { getMetricsTool } from './tools/get-metrics.js';
import { getPerformanceSamplesTool } from './tools/get-performance-samples.js';
import { getMetricsTimeseriesTool } from './tools/get-metrics-timeseries.js';
import { getGraphqlSchemaTool } from './tools/get-graphql-schema.js';
import { getGraphqlSchemaDetailsTool } from './tools/get-graphql-schema-details.js';
import { customGraphqlQueryTool } from './tools/custom-graphql-query.js';

export type ClientFactory = () => IAppsignalClient;

export function createRegisterTools(clientFactory: ClientFactory) {
  return function registerTools(server: McpServer) {
    // Check for required environment variables
    const apiKey = process.env.APPSIGNAL_API_KEY;

    if (!apiKey) {
      throw new Error('APPSIGNAL_API_KEY environment variable must be configured');
    }

    // Store references to main tools
    const mainTools: {
      getExceptionIncident?: RegisteredTool;
      getExceptionIncidentSample?: RegisteredTool;
      getLogIncident?: RegisteredTool;
      searchLogs?: RegisteredTool;
      getAnomalyIncident?: RegisteredTool;
      getLogIncidents?: RegisteredTool;
      getExceptionIncidents?: RegisteredTool;
      getAnomalyIncidents?: RegisteredTool;
      getPerformanceIncidents?: RegisteredTool;
      getPerformanceIncident?: RegisteredTool;
      getPerformanceIncidentSample?: RegisteredTool;
      getPerformanceIncidentSampleTimeline?: RegisteredTool;
      getSlowRequests?: RegisteredTool;
      getDeployMarkers?: RegisteredTool;
      getMetrics?: RegisteredTool;
      getPerformanceSamples?: RegisteredTool;
      getMetricsTimeseries?: RegisteredTool;
      customGraphqlQuery?: RegisteredTool;
      [key: string]: RegisteredTool | undefined;
    } = {};

    // Store references to app selection tools
    let selectAppTool: RegisteredTool | undefined;
    let changeAppTool: RegisteredTool | undefined;

    // Enable function for selectAppId to call
    const enableMainTools = () => {
      if (mainTools.getExceptionIncident) mainTools.getExceptionIncident.enable();
      if (mainTools.getExceptionIncidentSample) mainTools.getExceptionIncidentSample.enable();
      if (mainTools.getLogIncident) mainTools.getLogIncident.enable();
      if (mainTools.searchLogs) mainTools.searchLogs.enable();
      if (mainTools.getAnomalyIncident) mainTools.getAnomalyIncident.enable();
      if (mainTools.getLogIncidents) mainTools.getLogIncidents.enable();
      if (mainTools.getExceptionIncidents) mainTools.getExceptionIncidents.enable();
      if (mainTools.getAnomalyIncidents) mainTools.getAnomalyIncidents.enable();
      if (mainTools.getPerformanceIncidents) mainTools.getPerformanceIncidents.enable();
      if (mainTools.getPerformanceIncident) mainTools.getPerformanceIncident.enable();
      if (mainTools.getPerformanceIncidentSample) mainTools.getPerformanceIncidentSample.enable();
      if (mainTools.getPerformanceIncidentSampleTimeline)
        mainTools.getPerformanceIncidentSampleTimeline.enable();
      if (mainTools.getSlowRequests) mainTools.getSlowRequests.enable();
      if (mainTools.getDeployMarkers) mainTools.getDeployMarkers.enable();
      if (mainTools.getMetrics) mainTools.getMetrics.enable();
      if (mainTools.getPerformanceSamples) mainTools.getPerformanceSamples.enable();
      if (mainTools.getMetricsTimeseries) mainTools.getMetricsTimeseries.enable();
      if (mainTools.customGraphqlQuery) mainTools.customGraphqlQuery.enable();

      // Switch from select_app_id to change_app_id
      if (selectAppTool) {
        selectAppTool.disable();
      }
      if (changeAppTool) {
        changeAppTool.enable();
      }
    };

    // Register GraphQL schema tools (always available, don't require app selection)
    const schemaTool = getGraphqlSchemaTool(server, clientFactory);
    server.tool(
      schemaTool.name,
      schemaTool.description,
      schemaTool.inputSchema,
      schemaTool.handler
    );

    const schemaDetailsTool = getGraphqlSchemaDetailsTool(server, clientFactory);
    server.tool(
      schemaDetailsTool.name,
      schemaDetailsTool.description,
      schemaDetailsTool.inputSchema,
      schemaDetailsTool.handler
    );

    // Check if app ID is locked (configured via env var)
    const locked = isAppIdLocked();

    // Register tools that are always available (unless locked)
    if (!locked) {
      const appsTool = getAppsTool(server, clientFactory);
      server.tool(appsTool.name, appsTool.description, appsTool.inputSchema, appsTool.handler);

      // Register both select and change tools, but only enable the appropriate one
      const selectToolDef = selectAppIdTool(
        server,
        'select_app_id',
        enableMainTools,
        clientFactory
      );
      const changeToolDef = selectAppIdTool(
        server,
        'change_app_id',
        enableMainTools,
        clientFactory
      );
      selectAppTool = server.tool(
        selectToolDef.name,
        selectToolDef.description,
        selectToolDef.inputSchema,
        selectToolDef.handler
      );
      changeAppTool = server.tool(
        changeToolDef.name,
        changeToolDef.description,
        changeToolDef.inputSchema,
        changeToolDef.handler
      );
    }

    // Register main tools
    const toolDefs = [
      { def: getExceptionIncidentTool(server, clientFactory), key: 'getExceptionIncident' },
      {
        def: getExceptionIncidentSampleTool(server, clientFactory),
        key: 'getExceptionIncidentSample',
      },
      { def: getLogIncidentTool(server, clientFactory), key: 'getLogIncident' },
      { def: searchLogsTool(server, clientFactory), key: 'searchLogs' },
      { def: getAnomalyIncidentTool(server, clientFactory), key: 'getAnomalyIncident' },
      { def: getLogIncidentsTool(server, clientFactory), key: 'getLogIncidents' },
      { def: getExceptionIncidentsTool(server, clientFactory), key: 'getExceptionIncidents' },
      { def: getAnomalyIncidentsTool(server, clientFactory), key: 'getAnomalyIncidents' },
      { def: getPerformanceIncidentsTool(server, clientFactory), key: 'getPerformanceIncidents' },
      { def: getPerformanceIncidentTool(server, clientFactory), key: 'getPerformanceIncident' },
      {
        def: getPerformanceIncidentSampleTool(server, clientFactory),
        key: 'getPerformanceIncidentSample',
      },
      {
        def: getPerformanceIncidentSampleTimelineTool(server, clientFactory),
        key: 'getPerformanceIncidentSampleTimeline',
      },
      { def: getSlowRequestsTool(server, clientFactory), key: 'getSlowRequests' },
      { def: getDeployMarkersTool(server, clientFactory), key: 'getDeployMarkers' },
      { def: getMetricsTool(server, clientFactory), key: 'getMetrics' },
      { def: getPerformanceSamplesTool(server, clientFactory), key: 'getPerformanceSamples' },
      { def: getMetricsTimeseriesTool(server, clientFactory), key: 'getMetricsTimeseries' },
      { def: customGraphqlQueryTool(server, clientFactory), key: 'customGraphqlQuery' },
    ];

    toolDefs.forEach(({ def, key }) => {
      mainTools[key as keyof typeof mainTools] = server.tool(
        def.name,
        def.description,
        def.inputSchema,
        def.handler
      );
    });

    // Configure initial state based on whether an app ID is already set
    const hasAppId = getEffectiveAppId();
    if (locked) {
      // App ID is locked via env var - all main tools are enabled, no app selection tools
      // Main tools are enabled by default
    } else if (!hasAppId) {
      // No app ID set - show select_app_id, hide change_app_id and main tools
      if (changeAppTool) changeAppTool.disable();
      if (mainTools.getExceptionIncident) mainTools.getExceptionIncident.disable();
      if (mainTools.getExceptionIncidentSample) mainTools.getExceptionIncidentSample.disable();
      if (mainTools.getLogIncident) mainTools.getLogIncident.disable();
      if (mainTools.searchLogs) mainTools.searchLogs.disable();
      if (mainTools.getAnomalyIncident) mainTools.getAnomalyIncident.disable();
      if (mainTools.getLogIncidents) mainTools.getLogIncidents.disable();
      if (mainTools.getExceptionIncidents) mainTools.getExceptionIncidents.disable();
      if (mainTools.getAnomalyIncidents) mainTools.getAnomalyIncidents.disable();
      if (mainTools.getPerformanceIncidents) mainTools.getPerformanceIncidents.disable();
      if (mainTools.getPerformanceIncident) mainTools.getPerformanceIncident.disable();
      if (mainTools.getPerformanceIncidentSample) mainTools.getPerformanceIncidentSample.disable();
      if (mainTools.getPerformanceIncidentSampleTimeline)
        mainTools.getPerformanceIncidentSampleTimeline.disable();
      if (mainTools.getSlowRequests) mainTools.getSlowRequests.disable();
      if (mainTools.getDeployMarkers) mainTools.getDeployMarkers.disable();
      if (mainTools.getMetrics) mainTools.getMetrics.disable();
      if (mainTools.getPerformanceSamples) mainTools.getPerformanceSamples.disable();
      if (mainTools.getMetricsTimeseries) mainTools.getMetricsTimeseries.disable();
      if (mainTools.customGraphqlQuery) mainTools.customGraphqlQuery.disable();
    } else {
      // App ID already set - show change_app_id, hide select_app_id
      if (selectAppTool) selectAppTool.disable();
    }
  };
}

// Legacy function for backward compatibility
export function registerTools(server: McpServer) {
  // Default factory that throws "Not implemented"
  const defaultFactory = () => {
    throw new Error('AppsignalClient not provided - use createRegisterTools with a client factory');
  };

  const register = createRegisterTools(defaultFactory);
  register(server);
}
