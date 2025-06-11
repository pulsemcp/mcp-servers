import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getAppIdsTool } from './tools/get-app-ids.js';
import { selectAppIdTool } from './tools/select-app-id.js';
import { getAlertDetailsTool } from './tools/get-alert-details.js';
import { searchLogsTool } from './tools/search-logs.js';
import { getLogsInDatetimeRangeTool } from './tools/get-logs-in-datetime-range.js';

export function registerTools(server: McpServer) {
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
  const getAppIds = getAppIdsTool(server);
  const selectAppId = selectAppIdTool(server, enableMainTools);

  // Register main tools
  mainTools.getAlertDetails = getAlertDetailsTool(server);
  mainTools.searchLogs = searchLogsTool(server);
  mainTools.getLogsInDatetimeRange = getLogsInDatetimeRangeTool(server);

  // If no app ID is provided via environment, disable the main tools initially
  if (!envAppId) {
    mainTools.getAlertDetails.disable();
    mainTools.searchLogs.disable();
    mainTools.getLogsInDatetimeRange.disable();
  }
}