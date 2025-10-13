import { z } from 'zod';

/**
 * Transport types supported by MCP in order of priority (lowest to highest index = lowest to highest priority)
 */
export const TRANSPORT_PRIORITIES = ['stdio', 'sse', 'http'] as const;
export type TransportType = (typeof TRANSPORT_PRIORITIES)[number];

/**
 * Runtime hints in order of preference (lowest to highest index = lowest to highest priority)
 */
export const RUNTIME_PRIORITIES = ['dnx', 'docker', 'uvx', 'npx'] as const;
export type RuntimeHint = (typeof RUNTIME_PRIORITIES)[number];

/**
 * Registry types supported by MCP
 */
export const REGISTRY_TYPES = ['npm', 'pypi', 'oci', 'nuget', 'mcpb', 'local'] as const;
export type RegistryType = (typeof REGISTRY_TYPES)[number];

/**
 * Server configuration from servers.json
 */
export const ServerConfigSchema = z.object({
  name: z.string(),
  description: z.string(),
  version: z.string().optional(),
  repository: z
    .object({
      url: z.string(),
      source: z.enum(['github', 'gitlab']).optional(),
      id: z.string().optional(),
      subfolder: z.string().optional(),
    })
    .optional(),
  packages: z
    .array(
      z.object({
        registryType: z.enum(REGISTRY_TYPES),
        registryBaseUrl: z.string().optional(),
        identifier: z.string(),
        version: z.string().optional(),
        runtimeHint: z.enum(RUNTIME_PRIORITIES).optional(),
        transport: z
          .object({
            type: z.enum(['stdio', 'streamable-http', 'sse']),
            url: z.string().optional(),
            headers: z
              .array(
                z.object({
                  name: z.string(),
                  value: z.string(),
                })
              )
              .optional(),
          })
          .optional(),
        packageArguments: z
          .array(
            z.object({
              type: z.enum(['named', 'positional']),
              name: z.string().optional(),
              value: z.string(),
              description: z.string().optional(),
            })
          )
          .optional(),
        runtimeArguments: z
          .array(
            z.object({
              type: z.enum(['named', 'positional']),
              name: z.string().optional(),
              value: z.string(),
              description: z.string().optional(),
            })
          )
          .optional(),
        environmentVariables: z
          .array(
            z.object({
              name: z.string(),
              value: z.string().optional(),
              default: z.string().optional(),
              required: z.boolean().optional(),
              isRequired: z.boolean().optional(),
              isSecret: z.boolean().optional(),
              description: z.string().optional(),
            })
          )
          .optional(),
      })
    )
    .optional(),
  remotes: z
    .array(
      z.object({
        type: z.enum(['streamable-http', 'sse']),
        url: z.string(),
        headers: z
          .array(
            z.object({
              name: z.string(),
              value: z.string(),
            })
          )
          .optional(),
      })
    )
    .optional(),
});

export type ServerConfig = z.infer<typeof ServerConfigSchema>;

/**
 * Installation context for inference
 */
export const InstallationContextSchema = z.object({
  purpose: z.string().optional(),
});

export type InstallationContext = z.infer<typeof InstallationContextSchema>;

/**
 * Inference request for environment variable configuration
 */
export const InferenceRequestSchema = z.object({
  servers: z.array(
    z.object({
      name: z.string(),
      config: ServerConfigSchema,
    })
  ),
  context: InstallationContextSchema.optional(),
  secretsAvailable: z.array(z.string()).optional(),
});

export type InferenceRequest = z.infer<typeof InferenceRequestSchema>;

/**
 * Inference response with configuration decisions
 */
export const InferenceResponseSchema = z.object({
  serverConfigurations: z.array(
    z.object({
      serverName: z.string(),
      selectedPackage: z.object({
        registryType: z.enum(REGISTRY_TYPES),
        identifier: z.string(),
        version: z.string().optional(),
        runtimeHint: z.string().optional(), // Allow custom runtime paths, not just enum values
      }),
      selectedTransport: z.object({
        type: z.enum(['stdio', 'streamable-http', 'sse']),
        url: z.string().optional(),
      }),
      environmentVariables: z.record(z.string(), z.string()),
      runtimeArguments: z.array(z.string()).optional(),
      rationale: z.string().optional(),
    })
  ),
  warnings: z.array(z.string()).optional(),
});

export type InferenceResponse = z.infer<typeof InferenceResponseSchema>;

/**
 * Final .mcp.json server entry
 */
export const McpServerEntrySchema = z.object({
  type: z.literal('stdio'),
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
  transport: z
    .object({
      type: z.enum(['stdio', 'streamable-http', 'sse']),
      url: z.string().optional(),
      headers: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
});

export type McpServerEntry = z.infer<typeof McpServerEntrySchema>;

/**
 * Complete .mcp.json configuration
 */
export const McpConfigSchema = z.object({
  mcpServers: z.record(z.string(), McpServerEntrySchema),
});

export type McpConfig = z.infer<typeof McpConfigSchema>;

/**
 * Installation result
 */
export const InstallationResultSchema = z.object({
  installations: z.array(
    z.object({
      serverName: z.string(),
      status: z.enum(['success', 'failed']),
      error: z.string().optional(),
      mcpEntry: McpServerEntrySchema.optional(),
    })
  ),
  mcpConfig: McpConfigSchema,
  warnings: z.array(z.string()).optional(),
});

export type InstallationResult = z.infer<typeof InstallationResultSchema>;

/**
 * Claude Code client interface for inference
 */
export interface IClaudeCodeInferenceClient {
  runInference(prompt: string): Promise<string>;
}

/**
 * Secrets provider interface
 */
export interface ISecretsProvider {
  getSecret(key: string): Promise<string | undefined>;
  listAvailableSecrets(): Promise<string[]>;
}
