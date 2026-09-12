import { StateCreator } from 'zustand';
import type { TokenResponse } from '../../services/spotifyAuth';

export interface AuthSlice {
  // State
  accessToken: string | null;
  refreshToken: string | null;
  /** Epoch milliseconds at which the access token expires (null = unknown). */
  tokenExpiresAt: number | null;
  /** Scopes Spotify reported as granted for the current access token. */
  grantedScopes: string[];
  isAuthenticated: boolean;

  // Actions
  setAccessToken: (token: string | null) => void;
  setTokens: (tokens: TokenResponse) => void;
  clearAuth: () => void;
}

export const createAuthSlice: StateCreator<
  AuthSlice,
  [['zustand/devtools', never], ['zustand/subscribeWithSelector', never]],
  [],
  AuthSlice
> = set => ({
  // Initial state
  // Do NOT persist tokens across page reloads for the live app.
  // Keep initial state unauthenticated so users must connect each session.
  accessToken: null,
  refreshToken: null,
  tokenExpiresAt: null,
  grantedScopes: [],
  isAuthenticated: false,

  // Actions
  setAccessToken: token => {
    // Kept for compatibility with callers that only have an access token.
    // Auth state lives in memory only — never persisted to localStorage.
    set({
      accessToken: token,
      isAuthenticated: !!token,
      ...(token
        ? {}
        : { refreshToken: null, tokenExpiresAt: null, grantedScopes: [] }),
    });
  },

  setTokens: tokens =>
    set({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt: tokens.expiresAt,
      grantedScopes: tokens.grantedScopes,
      isAuthenticated: !!tokens.accessToken,
    }),

  clearAuth: () =>
    set(() => {
      try {
        if (typeof window !== 'undefined') {
          // Clean up any token persisted by older versions of the app.
          localStorage.removeItem('spotify_access_token');
        }
      } catch (e) {
        // ignore
      }
      return {
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null,
        grantedScopes: [],
        isAuthenticated: false,
      };
    }),
});
