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

      // Switch from select_app_id to change_app_id
      if (selectAppTool) {
        selectAppTool.disable();
      }
      if (changeAppTool) {
        changeAppTool.enable();
      }
    };

    // Check if app ID is locked (configured via env var)
    const locked = isAppIdLocked();

    // Register tools that are always available (unless locked)
    if (!locked) {
      getAppsTool(server, clientFactory);

      // Register both select and change tools, but only enable the appropriate one
      selectAppTool = selectAppIdTool(server, 'select_app_id', enableMainTools, clientFactory);
      changeAppTool = selectAppIdTool(server, 'change_app_id', enableMainTools, clientFactory);
    }

    // Register main tools
    mainTools.getExceptionIncident = getExceptionIncidentTool(server, clientFactory);
    mainTools.getExceptionIncidentSample = getExceptionIncidentSampleTool(server, clientFactory);
    mainTools.getLogIncident = getLogIncidentTool(server, clientFactory);
    mainTools.searchLogs = searchLogsTool(server, clientFactory);
    mainTools.getAnomalyIncident = getAnomalyIncidentTool(server, clientFactory);
    mainTools.getLogIncidents = getLogIncidentsTool(server, clientFactory);
    mainTools.getExceptionIncidents = getExceptionIncidentsTool(server, clientFactory);
    mainTools.getAnomalyIncidents = getAnomalyIncidentsTool(server, clientFactory);
    mainTools.getPerformanceIncidents = getPerformanceIncidentsTool(server, clientFactory);
    mainTools.getPerformanceIncident = getPerformanceIncidentTool(server, clientFactory);
    mainTools.getPerformanceIncidentSample = getPerformanceIncidentSampleTool(
      server,
      clientFactory
    );
    mainTools.getPerformanceIncidentSampleTimeline = getPerformanceIncidentSampleTimelineTool(
      server,
      clientFactory
    );

    // Configure initial state based on whether an app ID is already set
    const hasAppId = getEffectiveAppId();
    if (locked) {
      // App ID is locked via env var - all main tools are enabled, no app selection tools
      // Main tools are enabled by default
    } else if (!hasAppId) {
      // No app ID set - show select_app_id, hide change_app_id and main tools
      if (changeAppTool) changeAppTool.disable();
      mainTools.getExceptionIncident.disable();
      mainTools.getExceptionIncidentSample.disable();
      mainTools.getLogIncident.disable();
      mainTools.searchLogs.disable();
      mainTools.getAnomalyIncident.disable();
      mainTools.getLogIncidents.disable();
      mainTools.getExceptionIncidents.disable();
      mainTools.getAnomalyIncidents.disable();
      mainTools.getPerformanceIncidents.disable();
      mainTools.getPerformanceIncident.disable();
      mainTools.getPerformanceIncidentSample.disable();
      mainTools.getPerformanceIncidentSampleTimeline.disable();
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
