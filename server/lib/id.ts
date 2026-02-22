// ═══════════════════════════════════════════════════
// neoAI — ID Generation Utilities
// ═══════════════════════════════════════════════════

/**
 * Generates a unique ID with an optional prefix.
 * Uses crypto.randomUUID (available in Workers runtime).
 * Format: prefix_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 */
export function generateId(prefix?: string): string {
  const uuid = crypto.randomUUID();
  return prefix ? `${prefix}_${uuid}` : uuid;
}

/**
 * Creates a deterministic hash for a user ID (for usage tracking without storing PII).
 */
export async function hashUserId(userId: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(userId);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(hash);
  return Array.from(bytes.slice(0, 16))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
