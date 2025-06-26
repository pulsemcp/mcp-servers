import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * Create a JSON schema from a Zod schema with standard options
 */
export function createInputSchema<T>(schema: z.ZodType<T>): unknown {
  return zodToJsonSchema(schema, {
    target: 'openApi3',
  });
}

/**
 * Validate environment variables against a schema
 */
export function validateEnvironment<T>(
  schema: z.ZodType<T>,
  env: NodeJS.ProcessEnv = process.env
): T {
  try {
    return schema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
        .join('\n');
      throw new Error(`Environment validation failed:\n${issues}`);
    }
    throw error;
  }
}

/**
 * Parse a resource URI with an expected prefix
 */
export function parseResourceUri(uri: string, expectedPrefix: string): string | null {
  if (!uri.startsWith(expectedPrefix)) {
    return null;
  }
  return uri.slice(expectedPrefix.length);
}

/**
 * Build a resource URI with consistent format
 */
export function buildResourceUri(protocol: string, type: string, id: string): string {
  return `${protocol}://${type}/${id}`;
}
