import type { IPulseMCPAdminClient } from './server.js';

// Listings only render on the public site once status is "live". Edits to draft
// rows have no public surface to invalidate; archived rows are intentionally
// out of cache. Only "live" needs the recache nudge.
function buildRecacheReminder(slug: string): string {
  return `\n\n⚠️ This edit will not appear on \`pulsemcp.com/servers/${slug}\` until you call \`recache_mcp_server\` with this slug. Recache before declaring the work done.`;
}

export function recacheReminderIfLive(
  status: string | undefined | null,
  slug: string | undefined | null
): string {
  if (status === 'live' && slug) {
    return buildRecacheReminder(slug);
  }
  return '';
}

export async function recacheReminderForParentServer(
  client: IPulseMCPAdminClient,
  parentSlug: string | undefined | null
): Promise<string> {
  if (!parentSlug) return '';
  try {
    const server = await client.getUnifiedMCPServer(parentSlug);
    return recacheReminderIfLive(server.status, server.slug);
  } catch {
    // If the parent lookup fails, omit the reminder rather than failing the
    // write. The write itself succeeded, and a missing reminder is recoverable;
    // a thrown error would mask the success.
    return '';
  }
}

export async function recacheReminderForMirrorParent(
  client: IPulseMCPAdminClient,
  mirrorId: number | undefined | null
): Promise<string> {
  if (!mirrorId) return '';
  try {
    const mirror = await client.getUnofficialMirror(mirrorId);
    return await recacheReminderForParentServer(client, mirror.mcp_server_slug);
  } catch {
    return '';
  }
}
