import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getAppIdsTool } from './tools/get-app-ids.js';
import { selectAppIdTool } from './tools/select-app-id.js';
import { getAlertDetailsTool } from './tools/get-alert-details.js';
import { searchLogsTool } from './tools/search-logs.js';
import { getLogsInDatetimeRangeTool } from './tools/get-logs-in-datetime-range.js';
import { IAppsignalClient } from './appsignal-client.js';

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
    let mainTools: { getAlertDetails?: any; searchLogs?: any; getLogsInDatetimeRange?: any } = {};

    // Enable function for selectAppId to call
    const enableMainTools = () => {
      if (mainTools.getAlertDetails) mainTools.getAlertDetails.enable();
      if (mainTools.searchLogs) mainTools.searchLogs.enable();
      if (mainTools.getLogsInDatetimeRange) mainTools.getLogsInDatetimeRange.enable();
    };

    // Register tools that are always available
    const getAppIds = getAppIdsTool(server, clientFactory);
    const selectAppId = selectAppIdTool(server, enableMainTools, clientFactory);

    // Register main tools
    mainTools.getAlertDetails = getAlertDetailsTool(server, clientFactory);
    mainTools.searchLogs = searchLogsTool(server, clientFactory);
    mainTools.getLogsInDatetimeRange = getLogsInDatetimeRangeTool(server, clientFactory);

    // If no app ID is provided via environment, disable the main tools initially
    if (!envAppId) {
      mainTools.getAlertDetails.disable();
      mainTools.searchLogs.disable();
      mainTools.getLogsInDatetimeRange.disable();
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