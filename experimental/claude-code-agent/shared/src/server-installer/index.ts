/**
 * MCP Server Installation Module
 *
 * This module provides a clean, testable interface for installing MCP servers
 * with intelligent transport and runtime selection based on priority order.
 */

export { installServers } from './installer.js';
export { createInstaller } from './installer-factory.js';
export * from './types.js';
export * from './config.js';
