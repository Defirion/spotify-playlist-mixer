import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App, { MainApp } from '../App';
import * as store from '../store';
import * as spotifyAuth from '../services/spotifyAuth';
import { applyStoreMocks } from '../test-utils/mockStoreReturns';

// Unit tests for App/MainApp: the store module and AppShell are mocked, so
// these cover the auth-callback/refresh effects and the handler props MainApp
// wires into AppShell. App.integration.test.tsx covers the same surface
// against the real store.

vi.mock('../store', () => ({
  useAuth: vi.fn(),
  usePlaylistSelection: vi.fn(),
  useRatioConfig: vi.fn(),
  useMixOptions: vi.fn(),
  useUI: vi.fn(),
  setUIError: vi.fn(),
}));

vi.mock('../services/spotifyAuth', async () => ({
  ...(await vi.importActual('../services/spotifyAuth')),
  completeAuthorization: vi.fn(),
  refreshAccessToken: vi.fn(),
}));

// Mock AppShell to capture the props MainApp passes down.
let appShellProps: any = {};
vi.mock('../AppShell', () => ({
  __esModule: true,
  default: function MockAppShell(props: any) {
    appShellProps = props;
    return <div data-testid="app-shell" />;
  },
}));

const completeAuthorization =
  spotifyAuth.completeAuthorization as import('vitest').Mock;
const refreshAccessToken =
  spotifyAuth.refreshAccessToken as import('vitest').Mock;

const FAKE_TOKENS = {
  accessToken: 'FAKE_TOKEN',
  refreshToken: 'FAKE_REFRESH',
  expiresAt: Date.now() + 3600_000,
  grantedScopes: ['playlist-read-private', 'user-read-private'],
};

describe('MainApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appShellProps = {};
    applyStoreMocks(store);
    vi.stubEnv('REACT_APP_SPOTIFY_CLIENT_ID', 'test-client-id');
    completeAuthorization.mockResolvedValue(FAKE_TOKENS);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    window.history.replaceState({}, '', '/');
  });

  describe('authorization code callback', () => {
    it('exchanges the code, stores tokens, and removes the one-time params from the URL', async () => {
      const { useAuth } = applyStoreMocks(store);
      window.history.replaceState({}, '', '/?code=FAKE_CODE&state=FAKE_STATE');

      render(<MainApp />);

      await waitFor(() => {
        expect(useAuth.setTokens).toHaveBeenCalledWith(FAKE_TOKENS);
      });
      expect(completeAuthorization).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 'test-client-id',
          code: 'FAKE_CODE',
          state: 'FAKE_STATE',
        })
      );
      // one-time code is removed from the address bar
      expect(window.location.search).toBe('');
    });

    it('does not exchange a code when already authenticated', () => {
      applyStoreMocks(store, { useAuth: { isAuthenticated: true } });
      window.history.replaceState({}, '', '/?code=FAKE_CODE&state=STATE');

      render(<MainApp />);

      expect(completeAuthorization).not.toHaveBeenCalled();
    });

    it('does nothing when there is no code or error param', () => {
      window.history.replaceState({}, '', '/?other_param=value');

      render(<MainApp />);

      expect(completeAuthorization).not.toHaveBeenCalled();
      expect(store.setUIError).not.toHaveBeenCalled();
      // unrelated params are left alone
      expect(window.location.search).toBe('?other_param=value');
    });

    it('surfaces an error when Spotify redirects back with ?error=', () => {
      window.history.replaceState({}, '', '/?error=access_denied');

      render(<MainApp />);

      expect(store.setUIError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Spotify authorization failed: access_denied',
        })
      );
      expect(completeAuthorization).not.toHaveBeenCalled();
      expect(window.location.search).toBe('');
    });

    it('surfaces an error when the token exchange fails', async () => {
      completeAuthorization.mockRejectedValue(
        new Error('State mismatch in Spotify authorization response')
      );
      window.history.replaceState({}, '', '/?code=FAKE_CODE&state=BAD');

      render(<MainApp />);

      await waitFor(() => {
        expect(store.setUIError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'State mismatch in Spotify authorization response',
          })
        );
      });
    });

    it('surfaces an error when the client ID is not configured', () => {
      vi.stubEnv('REACT_APP_SPOTIFY_CLIENT_ID', undefined as any);
      window.history.replaceState({}, '', '/?code=FAKE_CODE&state=STATE');

      render(<MainApp />);

      expect(store.setUIError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Spotify Client ID is not configured',
        })
      );
      expect(completeAuthorization).not.toHaveBeenCalled();
    });
  });

  describe('proactive token refresh', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('refreshes the access token shortly before expiry', async () => {
      refreshAccessToken.mockResolvedValue(FAKE_TOKENS);
      const { useAuth } = applyStoreMocks(store, {
        useAuth: {
          isAuthenticated: true,
          accessToken: 'old',
          refreshToken: 'REFRESH',
          tokenExpiresAt: Date.now() + 120_000,
        },
      });

      render(<MainApp />);

      await vi.runAllTimersAsync();

      expect(refreshAccessToken).toHaveBeenCalledWith(
        'test-client-id',
        'REFRESH'
      );
      expect(useAuth.setTokens).toHaveBeenCalledWith(FAKE_TOKENS);
    });

    it('clears auth if proactive refresh fails', async () => {
      refreshAccessToken.mockRejectedValue(new Error('refresh failed'));
      const { useAuth } = applyStoreMocks(store, {
        useAuth: {
          isAuthenticated: true,
          accessToken: 'old',
          refreshToken: 'REFRESH',
          tokenExpiresAt: Date.now() + 120_000,
        },
      });

      render(<MainApp />);

      await vi.runAllTimersAsync();

      expect(useAuth.clearAuth).toHaveBeenCalled();
    });
  });

  describe('handler wiring', () => {
    it('passes the store data and handlers into AppShell', () => {
      const mocked = applyStoreMocks(store, {
        useAuth: { isAuthenticated: true, accessToken: 'TOKEN' },
        usePlaylistSelection: {
          selectedPlaylists: [{ id: 'p1' }],
        },
        useRatioConfig: { ratioConfig: { p1: { ratio: 1 } } },
        useMixOptions: { mixOptions: { shuffle: true } },
        useUI: { mixedPlaylists: [{ id: 'mixed' }] },
      });

      render(<MainApp />);

      expect(appShellProps.isAuthenticated).toBe(true);
      expect(appShellProps.accessToken).toBe('TOKEN');
      expect(appShellProps.selectedPlaylists).toEqual([{ id: 'p1' }]);
      expect(appShellProps.ratioConfig).toEqual({ p1: { ratio: 1 } });
      expect(appShellProps.mixOptions).toEqual({ shuffle: true });
      expect(appShellProps.mixedPlaylists).toEqual([{ id: 'mixed' }]);
      expect(appShellProps.onClearAll).toBe(
        mocked.usePlaylistSelection.clearAllPlaylists
      );
    });
  });
});

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    applyStoreMocks(store);
  });

  it('renders routes and footer links', () => {
    render(<App />);

    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    expect(screen.getByText('Terms of Service')).toBeInTheDocument();
    expect(screen.getByText('Back to Mixer')).toBeInTheDocument();
  });
});
