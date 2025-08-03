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
  accessToken:
    typeof window !== 'undefined'
      ? localStorage.getItem('spotify_access_token')
      : null,
  isAuthenticated:
    typeof window !== 'undefined'
      ? !!localStorage.getItem('spotify_access_token')
      : false,

  // Actions
  setAccessToken: token =>
    set({
      accessToken: token,
      isAuthenticated: !!token,
    }),

  clearAuth: () =>
    set({
      accessToken: null,
      isAuthenticated: false,
    }),
});
