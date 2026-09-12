import { vi, type Mock } from 'vitest';

/**
 * Canonical fixtures for the five store hooks that MainApp/AppShell consume.
 * Returns fresh objects (and fresh vi.fn()s) on every call so tests can't
 * leak state into each other.
 *
 * Usage in a test file that mocks the store module:
 *
 *   vi.mock('../store', () => ({
 *     useAuth: vi.fn(),
 *     usePlaylistSelection: vi.fn(),
 *     useRatioConfig: vi.fn(),
 *     useMixOptions: vi.fn(),
 *     useUI: vi.fn(),
 *     setUIError: vi.fn(),
 *   }));
 *   import * as store from '../store';
 *   ...
 *   beforeEach(() => { applyStoreMocks(store); });
 *   // per-test override:
 *   applyStoreMocks(store, { useAuth: { isAuthenticated: true } });
 */
export function makeStoreReturns() {
  return {
    useAuth: {
      accessToken: null as string | null,
      refreshToken: null as string | null,
      tokenExpiresAt: null as number | null,
      isAuthenticated: false,
      setAccessToken: vi.fn(),
      setTokens: vi.fn(),
      clearAuth: vi.fn(),
    },
    usePlaylistSelection: {
      selectedPlaylists: [] as any[],
      togglePlaylistSelection: vi.fn(),
      clearAllPlaylists: vi.fn(),
    },
    useRatioConfig: {
      ratioConfig: {},
      setRatioConfigBulk: vi.fn(),
      updateRatioConfig: vi.fn(),
    },
    useMixOptions: {
      mixOptions: {},
      updateMixOptions: vi.fn(),
      applyPresetOptions: vi.fn(),
    },
    useUI: {
      error: null as unknown,
      mixedPlaylists: [] as any[],
      dismissError: vi.fn(),
      dismissSuccessToast: vi.fn(),
      addMixedPlaylist: vi.fn(),
    },
  };
}

export type StoreReturns = ReturnType<typeof makeStoreReturns>;

type StoreOverrides = {
  [K in keyof StoreReturns]?: Partial<StoreReturns[K]>;
};

/**
 * Sets mockReturnValue on the five mocked store hooks and returns the
 * fixtures so tests can assert against the vi.fn()s inside them.
 */
export function applyStoreMocks(
  store: Record<string, unknown>,
  overrides: StoreOverrides = {}
): StoreReturns {
  const returns = makeStoreReturns();
  for (const hook of Object.keys(returns) as (keyof StoreReturns)[]) {
    Object.assign(returns[hook], overrides[hook]);
    (store[hook] as Mock).mockReturnValue(returns[hook]);
  }
  return returns;
}
