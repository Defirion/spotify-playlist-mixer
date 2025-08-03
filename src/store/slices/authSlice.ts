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
  accessToken: null,
  isAuthenticated: false,

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
