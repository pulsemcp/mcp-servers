import { describe, it, expect } from 'vitest';
import {
  InstallationConfig,
  REGISTRY_TO_RUNTIME_MAP,
  RUNTIME_TO_COMMAND_MAP,
} from '../../../shared/src/server-installer/config.js';

describe('InstallationConfig', () => {
  const config = new InstallationConfig();

  describe('transport priorities', () => {
    it('should prioritize http over sse over stdio', () => {
      expect(config.getTransportPriority('http')).toBeGreaterThan(
        config.getTransportPriority('sse')
      );
      expect(config.getTransportPriority('sse')).toBeGreaterThan(
        config.getTransportPriority('stdio')
      );
    });

    it('should select best transport from available options', () => {
      expect(config.selectBestTransport(['stdio', 'http'])).toBe('http');
      expect(config.selectBestTransport(['stdio', 'sse'])).toBe('sse');
      expect(config.selectBestTransport(['stdio'])).toBe('stdio');
      expect(config.selectBestTransport([])).toBeUndefined();
    });
  });

  describe('runtime priorities', () => {
    it('should prioritize npx over uvx over docker over dnx', () => {
      expect(config.getRuntimePriority('npx')).toBeGreaterThan(config.getRuntimePriority('uvx'));
      expect(config.getRuntimePriority('uvx')).toBeGreaterThan(config.getRuntimePriority('docker'));
      expect(config.getRuntimePriority('docker')).toBeGreaterThan(config.getRuntimePriority('dnx'));
    });

    it('should select best runtime from available options', () => {
      expect(config.selectBestRuntime(['docker', 'npx'])).toBe('npx');
      expect(config.selectBestRuntime(['uvx', 'docker'])).toBe('uvx');
      expect(config.selectBestRuntime(['dnx'])).toBe('dnx');
      expect(config.selectBestRuntime([])).toBeUndefined();
    });
  });
});

describe('registry to runtime mapping', () => {
  it('should map npm to npx', () => {
    expect(REGISTRY_TO_RUNTIME_MAP.npm).toEqual(['npx']);
  });

  it('should map pypi to uvx', () => {
    expect(REGISTRY_TO_RUNTIME_MAP.pypi).toEqual(['uvx']);
  });

  it('should map oci to docker', () => {
    expect(REGISTRY_TO_RUNTIME_MAP.oci).toEqual(['docker']);
  });

  it('should map nuget to dnx', () => {
    expect(REGISTRY_TO_RUNTIME_MAP.nuget).toEqual(['dnx']);
  });

  it('should map mcpb to multiple runtimes', () => {
    expect(REGISTRY_TO_RUNTIME_MAP.mcpb).toEqual(['npx', 'uvx', 'docker']);
  });
});

describe('runtime to command mapping', () => {
  it('should map runtime hints to correct commands', () => {
    expect(RUNTIME_TO_COMMAND_MAP.npx).toBe('npx');
    expect(RUNTIME_TO_COMMAND_MAP.uvx).toBe('uvx');
    expect(RUNTIME_TO_COMMAND_MAP.docker).toBe('docker');
    expect(RUNTIME_TO_COMMAND_MAP.dnx).toBe('dotnet');
  });
});
