import { OnePasswordCommandError, OnePasswordShareResult } from '../../types.js';
import { executeCommandText } from './execute-command.js';

/**
 * Share a 1Password item and return a shareable URL.
 *
 * Wraps `op item share <item> [flags]`. The CLI's share subcommand returns a
 * plain URL on stdout by default; with `--format=json` it may return a JSON
 * payload. This helper asks for JSON, then falls back to parsing a plain URL
 * if JSON parsing fails, so it works across CLI versions.
 *
 * @param serviceAccountToken - The service account token for authentication
 * @param item - The item title or ID
 * @param vaultId - Optional vault name or ID to narrow the lookup
 * @param options - Optional share controls
 */
export async function shareItem(
  serviceAccountToken: string,
  item: string,
  vaultId?: string,
  options?: {
    expiresIn?: string;
    emails?: string[];
    viewOnce?: boolean;
  }
): Promise<OnePasswordShareResult> {
  const args = ['item', 'share', item];

  if (vaultId) {
    args.push('--vault', vaultId);
  }

  if (options?.expiresIn) {
    args.push('--expires-in', options.expiresIn);
  }

  if (options?.emails && options.emails.length > 0) {
    args.push('--emails', options.emails.join(','));
  }

  if (options?.viewOnce) {
    args.push('--view-once');
  }

  args.push('--format', 'json');

  const stdout = await executeCommandText(serviceAccountToken, args);
  const trimmed = stdout.trim();

  // Try JSON first — newer CLI versions may return a JSON payload.
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const shareUrl =
      (typeof parsed.share_url === 'string' && parsed.share_url) ||
      (typeof parsed.url === 'string' && parsed.url) ||
      (typeof parsed.href === 'string' && parsed.href);

    if (shareUrl) {
      return {
        share_url: shareUrl,
        expires_at: typeof parsed.expires_at === 'string' ? parsed.expires_at : undefined,
        created_at: typeof parsed.created_at === 'string' ? parsed.created_at : undefined,
      };
    }
  } catch {
    // Fall through to plain-URL parsing.
  }

  // Plain text fallback: the CLI typically prints the share URL on its own line.
  // Prefer share.1password.com URLs; fall back to the last URL in output to avoid
  // matching stray log lines that happen to contain a URL.
  const shareMatch = trimmed.match(/https?:\/\/share\.1password\.com\/\S+/i);
  if (shareMatch) {
    return { share_url: shareMatch[0] };
  }
  const urlMatches = trimmed.match(/https?:\/\/\S+/g);
  if (urlMatches && urlMatches.length > 0) {
    return { share_url: urlMatches[urlMatches.length - 1] };
  }

  throw new OnePasswordCommandError(
    `Unable to parse share URL from 1Password CLI output: ${trimmed}`,
    0
  );
}
