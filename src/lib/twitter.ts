/**
 * Twitter integration has been removed and disabled.
 * Token refreshes and OAuth logic are disabled.
 */

export function generateCodeVerifier(): string {
  return '';
}

export function generateCodeChallenge(): string {
  return '';
}

export async function refreshTwitterToken(): Promise<null> {
  // Disabled: No refresh requests are sent to Twitter
  return null;
}
