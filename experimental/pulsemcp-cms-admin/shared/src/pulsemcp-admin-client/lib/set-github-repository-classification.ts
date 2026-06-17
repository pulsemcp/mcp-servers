import type {
  GithubRepositoryClassification,
  SetGithubRepositoryClassificationResponse,
} from '../../types.js';
import { adminFetch } from './admin-fetch.js';

export async function setGithubRepositoryClassification(
  apiKey: string,
  baseUrl: string,
  id: number,
  classification: GithubRepositoryClassification
): Promise<SetGithubRepositoryClassificationResponse> {
  const url = new URL(`/api/github_repositories/${id}/classification`, baseUrl);

  const body: Record<string, unknown> = {
    classification,
  };

  const response = await adminFetch(url.toString(), {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API key');
    }
    if (response.status === 403) {
      throw new Error('User lacks write privileges');
    }
    if (response.status === 404) {
      throw new Error(`GitHub repository not found: ${id}`);
    }
    if (response.status === 400) {
      const errBody = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(errBody.error ?? 'Bad request');
    }
    if (response.status === 422) {
      const errBody = (await response.json().catch(() => ({}))) as {
        error?: string;
        details?: string[];
      };
      const detailStr = errBody.details?.length ? ` (${errBody.details.join(', ')})` : '';
      throw new Error(`${errBody.error ?? 'Validation failed'}${detailStr}`);
    }
    throw new Error(
      `Failed to set github_repository classification: ${response.status} ${response.statusText}`
    );
  }

  return (await response.json()) as SetGithubRepositoryClassificationResponse;
}
