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

    it('clears auth when the refresh fails', async () => {
      refreshAccessToken.mockRejectedValue(new Error('revoked'));
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
      expect(useAuth.setTokens).not.toHaveBeenCalled();
    });

    it('does not schedule a refresh without a refresh token', async () => {
      applyStoreMocks(store, {
        useAuth: { isAuthenticated: true, accessToken: 't' },
      });

      render(<MainApp />);

      await vi.runAllTimersAsync();

      expect(refreshAccessToken).not.toHaveBeenCalled();
    });
  });

  describe('handlers passed to AppShell', () => {
    it('onPlaylistSelect toggles the playlist in the store', () => {
      const { usePlaylistSelection } = applyStoreMocks(store);

      render(<MainApp />);
      appShellProps.onPlaylistSelect({ id: 'p-mock', name: 'Mock' });

      expect(usePlaylistSelection.togglePlaylistSelection).toHaveBeenCalledWith(
        { id: 'p-mock', name: 'Mock' }
      );
    });

    it('onPlaylistRemove toggles a playlist that is selected and ignores one that is not', () => {
      const playlist = { id: 'p1', name: 'Test Playlist' };
      const { usePlaylistSelection } = applyStoreMocks(store, {
        usePlaylistSelection: { selectedPlaylists: [playlist] },
      });

      render(<MainApp />);

      appShellProps.onPlaylistRemove('p1');
      expect(usePlaylistSelection.togglePlaylistSelection).toHaveBeenCalledWith(
        playlist
      );

      usePlaylistSelection.togglePlaylistSelection.mockClear();
      appShellProps.onPlaylistRemove('not-selected');
      expect(
        usePlaylistSelection.togglePlaylistSelection
      ).not.toHaveBeenCalled();
    });

    it('onClearAll clears all playlists', () => {
      const { usePlaylistSelection } = applyStoreMocks(store);

      render(<MainApp />);
      appShellProps.onClearAll();

      expect(usePlaylistSelection.clearAllPlaylists).toHaveBeenCalled();
    });

    it('onApplyPreset applies ratio config and options, clearing an existing UI error', () => {
      const { useRatioConfig, useMixOptions } = applyStoreMocks(store, {
        useUI: { error: { message: 'previous error' } },
      });

      render(<MainApp />);
      appShellProps.onApplyPreset({
        ratioConfig: {
          'p-mock': { min: 1, max: 2, weight: 1, weightType: 'frequency' },
        },
        strategy: 'mid-peak',
        settings: { shuffleTracks: true },
        presetName: 'Mock Preset',
      });

      expect(useRatioConfig.setRatioConfigBulk).toHaveBeenCalledWith({
        'p-mock': { min: 1, max: 2, weight: 1, weightType: 'frequency' },
      });
      expect(useMixOptions.applyPresetOptions).toHaveBeenCalledWith({
        settings: { shuffleTracks: true },
        presetName: 'Mock Preset',
      });
      expect(store.setUIError).toHaveBeenCalledWith(null);
    });

    it('onApplyPreset does not touch the UI error when none exists', () => {
      applyStoreMocks(store, { useUI: { error: null } });

      render(<MainApp />);
      appShellProps.onApplyPreset({
        ratioConfig: {},
        strategy: 'balanced',
        settings: {},
        presetName: 'p',
      });

      expect(store.setUIError).not.toHaveBeenCalled();
    });

    it('onDismissError, onDismissSuccess, and onMixedPlaylist forward to the store', () => {
      const { useUI } = applyStoreMocks(store, {
        useUI: { error: { message: 'err' }, mixedPlaylists: ['m1'] },
      });

      render(<MainApp />);

      appShellProps.onDismissError();
      expect(useUI.dismissError).toHaveBeenCalled();

      appShellProps.onDismissSuccess();
      expect(useUI.dismissSuccessToast).toHaveBeenCalledWith('');

      appShellProps.onMixedPlaylist({ id: 'mixed-1' });
      expect(useUI.addMixedPlaylist).toHaveBeenCalledWith({ id: 'mixed-1' });
    });
  });
});

describe('App routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    applyStoreMocks(store);
    window.history.replaceState({}, '', '/');
  });

  it('renders the footer route links', () => {
    render(<App />);

    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    expect(screen.getByText('Terms of Service')).toBeInTheDocument();
    expect(screen.getByText('Back to Mixer')).toBeInTheDocument();
  });
});
