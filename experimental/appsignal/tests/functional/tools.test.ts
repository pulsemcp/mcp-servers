import { vi } from 'vitest';

// Mock the state module - must be before any imports that use it
vi.mock('../../shared/src/state', () => ({
  setSelectedAppId: vi.fn(),
  getSelectedAppId: vi.fn(),
  clearSelectedAppId: vi.fn(),
  getEffectiveAppId: vi.fn(),
  isAppIdLocked: vi.fn(),
}));

// Import all the modularized test suites
import './tools/tool-registration.test';
import './tools/exception-incident.test';
import './tools/log-incident.test';
import './tools/search-logs.test';
