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
import { getPerfIncidentsTool } from './tools/get-perf-incidents.js';
import { getPerfIncidentTool } from './tools/get-perf-incident.js';
import { getPerfIncidentSampleTool } from './tools/get-perf-incident-sample.js';
import { getPerfIncidentSampleTimelineTool } from './tools/get-perf-incident-sample-timeline.js';
import { getSlowRequestsTool } from './tools/get-slow-requests.js';
import { getDeployMarkersTool } from './tools/get-deploy-markers.js';
import { getMetricsTool } from './tools/get-metrics.js';
import { getPerfSamplesTool } from './tools/get-perf-samples.js';
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
      getPerfIncidents?: RegisteredTool;
      getPerfIncident?: RegisteredTool;
      getPerfIncidentSample?: RegisteredTool;
      getPerfIncidentSampleTimeline?: RegisteredTool;
      getSlowRequests?: RegisteredTool;
      getDeployMarkers?: RegisteredTool;
      getMetrics?: RegisteredTool;
      getPerfSamples?: RegisteredTool;
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
      if (mainTools.getPerfIncidents) mainTools.getPerfIncidents.enable();
      if (mainTools.getPerfIncident) mainTools.getPerfIncident.enable();
      if (mainTools.getPerfIncidentSample) mainTools.getPerfIncidentSample.enable();
      if (mainTools.getPerfIncidentSampleTimeline) mainTools.getPerfIncidentSampleTimeline.enable();
      if (mainTools.getSlowRequests) mainTools.getSlowRequests.enable();
      if (mainTools.getDeployMarkers) mainTools.getDeployMarkers.enable();
      if (mainTools.getMetrics) mainTools.getMetrics.enable();
      if (mainTools.getPerfSamples) mainTools.getPerfSamples.enable();
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
      { def: getPerfIncidentsTool(server, clientFactory), key: 'getPerfIncidents' },
      { def: getPerfIncidentTool(server, clientFactory), key: 'getPerfIncident' },
      {
        def: getPerfIncidentSampleTool(server, clientFactory),
        key: 'getPerfIncidentSample',
      },
      {
        def: getPerfIncidentSampleTimelineTool(server, clientFactory),
        key: 'getPerfIncidentSampleTimeline',
      },
      { def: getSlowRequestsTool(server, clientFactory), key: 'getSlowRequests' },
      { def: getDeployMarkersTool(server, clientFactory), key: 'getDeployMarkers' },
      { def: getMetricsTool(server, clientFactory), key: 'getMetrics' },
      { def: getPerfSamplesTool(server, clientFactory), key: 'getPerfSamples' },
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
      if (mainTools.getPerfIncidents) mainTools.getPerfIncidents.disable();
      if (mainTools.getPerfIncident) mainTools.getPerfIncident.disable();
      if (mainTools.getPerfIncidentSample) mainTools.getPerfIncidentSample.disable();
      if (mainTools.getPerfIncidentSampleTimeline)
        mainTools.getPerfIncidentSampleTimeline.disable();
      if (mainTools.getSlowRequests) mainTools.getSlowRequests.disable();
      if (mainTools.getDeployMarkers) mainTools.getDeployMarkers.disable();
      if (mainTools.getMetrics) mainTools.getMetrics.disable();
      if (mainTools.getPerfSamples) mainTools.getPerfSamples.disable();
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
