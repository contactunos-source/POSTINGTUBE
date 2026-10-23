import crypto from 'crypto';

/**
 * Generates a high-entropy cryptographic code_verifier for OAuth 2.0 PKCE (RFC 7636)
 */
export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Computes the S256 code_challenge from a code_verifier
 */
export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

/**
 * Refreshes an expired X (Twitter) OAuth 2.0 User Access Token using a refresh token
 */
export async function refreshTwitterToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
} | null> {
  const clientId = process.env.TWITTER_CLIENT_ID || process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;

  if (!clientId || !refreshToken) return null;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (clientSecret) {
      headers['Authorization'] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
    });

    const res = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers,
      body: params,
    });

    const data = await res.json();
    if (data.access_token) {
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in || 7200,
      };
    }
  } catch (err) {
    console.warn('[Twitter Auth] Token refresh exception:', err);
  }

  return null;
}
