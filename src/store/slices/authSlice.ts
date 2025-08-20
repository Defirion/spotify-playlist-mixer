import { StateCreator } from 'zustand';

export interface AuthSlice {
  // State
  accessToken: string | null;
  isAuthenticated: boolean;

  // Actions
  setAccessToken: (token: string | null) => void;
  clearAuth: () => void;
}

export const createAuthSlice: StateCreator<
  AuthSlice,
  [['zustand/devtools', never], ['zustand/subscribeWithSelector', never]],
  [],
  AuthSlice
> = set => ({
  // Initial state
  // Do NOT persist access tokens across page reloads for the live app.
  // Keep initial state unauthenticated so users must connect each session.
  accessToken: null,
  isAuthenticated: false,

  // Actions
  setAccessToken: token => {
    // Do not persist to localStorage here. Keep auth in memory only so the
    // app requires a fresh Spotify connection each time it starts.
    set({
      accessToken: token,
      isAuthenticated: !!token,
    });
  },

  clearAuth: () =>
    set(() => {
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('spotify_access_token');
        }
      } catch (e) {
        // ignore
      }
      return {
        accessToken: null,
        isAuthenticated: false,
      };
    }),
});
