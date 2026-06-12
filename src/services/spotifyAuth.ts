// Spotify Authorization Code with PKCE flow.
//
// Spotify removed support for the Implicit Grant flow (`response_type=token`)
// for new and updated apps; the recommended flow for browser-based apps is
// Authorization Code with PKCE. This module implements that flow:
//
//   1. `beginAuthorization()` generates a code verifier + state, stashes them
//      in sessionStorage (they must survive the redirect), and returns the
//      authorize URL to navigate to.
//   2. Spotify redirects back with `?code=...&state=...`.
//   3. `completeAuthorization()` validates the state, exchanges the code for
//      tokens at the token endpoint, and clears the stashed values.
//   4. `refreshAccessToken()` can be used before the access token expires.
//
// No long-lived secrets are stored: the verifier/state live in sessionStorage
// only between the redirect out and back, and tokens are kept in memory by
// the auth store.

export const SPOTIFY_AUTHORIZE_URL = 'https://accounts.spotify.com/authorize';
export const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

const VERIFIER_STORAGE_KEY = 'spotify_pkce_code_verifier';
const STATE_STORAGE_KEY = 'spotify_auth_state';

export const DEFAULT_SCOPES = [
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-modify-private',
];

export interface TokenResponse {
  accessToken: string;
  refreshToken: string | null;
  /** Epoch milliseconds at which the access token expires. */
  expiresAt: number;
}

const base64UrlEncode = (bytes: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

export const generateRandomString = (length = 64): string => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  const charset =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  return Array.from(bytes, b => charset[b % charset.length]).join('');
};

export const computeCodeChallenge = async (
  verifier: string
): Promise<string> => {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier)
  );
  return base64UrlEncode(new Uint8Array(digest));
};

export interface BeginAuthorizationOptions {
  clientId: string;
  redirectUri: string;
  scopes?: string[];
}

/**
 * Generates and stashes the PKCE verifier and state, then returns the
 * Spotify authorize URL the browser should navigate to.
 */
export const beginAuthorization = async ({
  clientId,
  redirectUri,
  scopes = DEFAULT_SCOPES,
}: BeginAuthorizationOptions): Promise<string> => {
  const verifier = generateRandomString(64);
  const state = generateRandomString(32);
  const challenge = await computeCodeChallenge(verifier);

  sessionStorage.setItem(VERIFIER_STORAGE_KEY, verifier);
  sessionStorage.setItem(STATE_STORAGE_KEY, state);

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
    scope: scopes.join(' '),
  });

  return `${SPOTIFY_AUTHORIZE_URL}?${params.toString()}`;
};

const parseTokenResponse = (data: any): TokenResponse => {
  if (!data || typeof data.access_token !== 'string') {
    throw new Error('Spotify token response did not include an access token');
  }
  const expiresInSeconds =
    typeof data.expires_in === 'number' ? data.expires_in : 3600;
  return {
    accessToken: data.access_token,
    refreshToken:
      typeof data.refresh_token === 'string' ? data.refresh_token : null,
    expiresAt: Date.now() + expiresInSeconds * 1000,
  };
};

const postTokenRequest = async (
  body: URLSearchParams
): Promise<TokenResponse> => {
  const resp = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  let data: any = null;
  try {
    data = await resp.json();
  } catch (_) {
    // non-JSON body; fall through to status check below
  }

  if (!resp.ok) {
    const description =
      data?.error_description || data?.error || `HTTP ${resp.status}`;
    throw new Error(`Spotify token request failed: ${description}`);
  }

  return parseTokenResponse(data);
};

export interface CompleteAuthorizationOptions {
  clientId: string;
  redirectUri: string;
  code: string;
  /** The `state` query parameter returned by Spotify. */
  state: string | null;
}

/**
 * Validates the returned state and exchanges the authorization code for
 * tokens. Clears the stashed verifier/state regardless of outcome so a
 * failed exchange cannot be replayed.
 */
export const completeAuthorization = async ({
  clientId,
  redirectUri,
  code,
  state,
}: CompleteAuthorizationOptions): Promise<TokenResponse> => {
  const storedState = sessionStorage.getItem(STATE_STORAGE_KEY);
  const verifier = sessionStorage.getItem(VERIFIER_STORAGE_KEY);
  sessionStorage.removeItem(STATE_STORAGE_KEY);
  sessionStorage.removeItem(VERIFIER_STORAGE_KEY);

  if (!verifier) {
    throw new Error(
      'Missing PKCE code verifier — the login flow was not started in this browser session'
    );
  }
  if (!storedState || state !== storedState) {
    throw new Error('State mismatch in Spotify authorization response');
  }

  return postTokenRequest(
    new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    })
  );
};

export const refreshAccessToken = async (
  clientId: string,
  refreshToken: string
): Promise<TokenResponse> => {
  const result = await postTokenRequest(
    new URLSearchParams({
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    })
  );
  // Spotify may omit refresh_token on refresh; keep using the current one.
  return { ...result, refreshToken: result.refreshToken ?? refreshToken };
};
