// Core server exports
export { registerResources } from './resources.js';
export {
  registerTools,
  createRegisterTools,
  type ToolGroup,
  parseEnabledToolGroups,
} from './tools.js';
export {
  createMCPServer,
  type CreateMCPServerOptions,
  type ClientFactory,
  type IOnePasswordClient,
  OnePasswordClient,
} from './server.js';

// Type exports
export {
  type OnePasswordVault,
  type OnePasswordItem,
  type OnePasswordItemDetails,
  type OnePasswordField,
  type OnePasswordSection,
  type OnePasswordURL,
  OnePasswordNotFoundError,
  OnePasswordAuthenticationError,
  OnePasswordCommandError,
} from './types.js';

// URL parsing exports
export {
  parseOnePasswordUrl,
  extractItemIdFromUrl,
  type ParsedOnePasswordUrl,
} from './url-parser.js';

// Unlocked items management exports
export {
  unlockItem,
  lockItem,
  isItemUnlocked,
  getUnlockedItems,
  clearUnlockedItems,
  getUnlockedItemCount,
} from './unlocked-items.js';

// Logging exports (re-exported for convenience)
export { logServerStart, logError, logWarning, logDebug } from './logging.js';
