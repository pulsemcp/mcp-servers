import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getAppsTool } from './tools/get-apps.js';
import { selectAppIdTool } from './tools/select-app-id.js';
import { getExceptionIncidentTool } from './tools/get-exception-incident.js';
import { getExceptionIncidentSamplesTool } from './tools/get-exception-incident-samples.js';
import { getLogIncidentTool } from './tools/get-log-incident.js';
import { searchLogsTool } from './tools/search-logs.js';
import { IAppsignalClient } from './appsignal-client/appsignal-client.js';

export type ClientFactory = () => IAppsignalClient;

export function createRegisterTools(clientFactory: ClientFactory) {
  return function registerTools(server: McpServer) {
    // Check for required environment variables
    const apiKey = process.env.APPSIGNAL_API_KEY;
    const envAppId = process.env.APPSIGNAL_APP_ID;

    if (!apiKey) {
      throw new Error("APPSIGNAL_API_KEY environment variable must be configured");
    }

    // Store references to main tools
    let mainTools: { getExceptionIncident?: any; getExceptionIncidentSamples?: any; getLogIncident?: any; searchLogs?: any } = {};

    // Enable function for selectAppId to call
    const enableMainTools = () => {
      if (mainTools.getExceptionIncident) mainTools.getExceptionIncident.enable();
      if (mainTools.getExceptionIncidentSamples) mainTools.getExceptionIncidentSamples.enable();
      if (mainTools.getLogIncident) mainTools.getLogIncident.enable();
      if (mainTools.searchLogs) mainTools.searchLogs.enable();
    };

    // Register tools that are always available
    const getApps = getAppsTool(server, clientFactory);
    const selectAppId = selectAppIdTool(server, enableMainTools, clientFactory);

    // Register main tools
    mainTools.getExceptionIncident = getExceptionIncidentTool(server, clientFactory);
    mainTools.getExceptionIncidentSamples = getExceptionIncidentSamplesTool(server, clientFactory);
    mainTools.getLogIncident = getLogIncidentTool(server, clientFactory);
    mainTools.searchLogs = searchLogsTool(server, clientFactory);

    // If no app ID is provided via environment, disable the main tools initially
    if (!envAppId) {
      mainTools.getExceptionIncident.disable();
      mainTools.getExceptionIncidentSamples.disable();
      mainTools.getLogIncident.disable();
      mainTools.searchLogs.disable();
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