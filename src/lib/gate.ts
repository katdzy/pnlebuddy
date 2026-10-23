/*
 * Password gate for the deployed site. Her review content is paid material,
 * so every page and content file sits behind one shared password
 * (SITE_PASSWORD, set in the host's environment). Unlocking sets a long-lived
 * cookie holding a hash of the password, so changing the password signs
 * every device out.
 *
 * Cookie-based rather than HTTP Basic Auth because Home Screen web apps on
 * iPad handle Basic Auth prompts poorly.
 */

export const GATE_COOKIE = "pnlebuddy_pass";
/** Browsers cap cookie lifetime at 400 days. */
export const GATE_MAX_AGE = 400 * 24 * 60 * 60;

export function sitePassword(): string | null {
  return process.env.SITE_PASSWORD || null;
}

/** Hex SHA-256 of the password, salted with the app name. Web Crypto, so it runs in any runtime. */
export async function gateToken(password: string): Promise<string> {
  const bytes = new TextEncoder().encode(`pnlebuddy-gate:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string comparison. */
export function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Only same-site paths are allowed as a post-unlock destination. */
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}
