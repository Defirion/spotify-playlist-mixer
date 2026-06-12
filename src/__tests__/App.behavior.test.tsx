import React from 'react';
import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MainApp } from '../App';
import * as store from '../store';
import * as spotifyAuth from '../services/spotifyAuth';

// Mock the store hooks
jest.mock('../store', () => ({
  useAuth: jest.fn(),
  usePlaylistSelection: jest.fn(),
  useRatioConfig: jest.fn(),
  useMixOptions: jest.fn(),
  useUI: jest.fn(),
  setUIError: jest.fn(),
}));

// Mock the auth service so no real token exchange happens
jest.mock('../services/spotifyAuth', () => ({
  ...jest.requireActual('../services/spotifyAuth'),
  completeAuthorization: jest.fn(),
  refreshAccessToken: jest.fn(),
}));

// Mock AppShell to capture and expose handler props
let mockAppShellProps: any = {};
jest.mock('../AppShell', () => {
  return function MockAppShell(props: any) {
    mockAppShellProps = props;
    return <div data-testid="app-shell" />;
  };
});

describe('MainApp behavioral coverage', () => {
  const mockStoreReturns = {
    useAuth: {
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      isAuthenticated: false,
      setAccessToken: jest.fn(),
      setTokens: jest.fn(),
      clearAuth: jest.fn(),
    },
    usePlaylistSelection: {
      selectedPlaylists: [],
      togglePlaylistSelection: jest.fn(),
      clearAllPlaylists: jest.fn(),
    },
    useRatioConfig: {
      ratioConfig: {},
      setRatioConfigBulk: jest.fn(),
      updateRatioConfig: jest.fn(),
    },
    useMixOptions: {
      mixOptions: {},
      updateMixOptions: jest.fn(),
      applyPresetOptions: jest.fn(),
    },
    useUI: {
      error: null,
      mixedPlaylists: [],
      dismissError: jest.fn(),
      dismissSuccessToast: jest.fn(),
      addMixedPlaylist: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAppShellProps = {}; // Reset mock props

    // Setup default mock returns
    (store.useAuth as jest.Mock).mockReturnValue(mockStoreReturns.useAuth);
    (store.usePlaylistSelection as jest.Mock).mockReturnValue(
      mockStoreReturns.usePlaylistSelection
    );
    (store.useRatioConfig as jest.Mock).mockReturnValue(
      mockStoreReturns.useRatioConfig
    );
    (store.useMixOptions as jest.Mock).mockReturnValue(
      mockStoreReturns.useMixOptions
    );
    (store.useUI as jest.Mock).mockReturnValue(mockStoreReturns.useUI);
  });

  afterEach(() => {
    // Restore a clean URL between tests
    window.history.replaceState({}, '', '/');
  });

  describe('authorization code callback behavior', () => {
    beforeEach(() => {
      process.env.REACT_APP_SPOTIFY_CLIENT_ID = 'test-client-id';
      (spotifyAuth.completeAuthorization as jest.Mock).mockResolvedValue({
        accessToken: 'FAKE_TOKEN',
        refreshToken: 'FAKE_REFRESH',
        expiresAt: Date.now() + 3600_000,
      });
    });

    it('does not exchange a code when user is already authenticated', () => {
      (store.useAuth as jest.Mock).mockReturnValue({
        ...mockStoreReturns.useAuth,
        isAuthenticated: true,
      });

      window.history.replaceState({}, '', '/?code=FAKE_CODE&state=STATE');

      render(<MainApp />);

      expect(spotifyAuth.completeAuthorization).not.toHaveBeenCalled();
    });

    it('does nothing when there is no code or error param', () => {
      window.history.replaceState({}, '', '/?other_param=value');

      render(<MainApp />);

      expect(spotifyAuth.completeAuthorization).not.toHaveBeenCalled();
      expect(store.setUIError).not.toHaveBeenCalled();
      // unrelated params are left alone
      expect(window.location.search).toBe('?other_param=value');
    });

    it('exchanges the code and stores tokens on success', async () => {
      const setTokens = jest.fn();
      (store.useAuth as jest.Mock).mockReturnValue({
        ...mockStoreReturns.useAuth,
        setTokens,
      });

      window.history.replaceState({}, '', '/?code=FAKE_CODE&state=STATE');

      render(<MainApp />);

      await waitFor(() => {
        expect(setTokens).toHaveBeenCalledWith(
          expect.objectContaining({ accessToken: 'FAKE_TOKEN' })
        );
      });
      expect(spotifyAuth.completeAuthorization).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'FAKE_CODE', state: 'STATE' })
      );
    });

    it('surfaces an error when Spotify redirects back with ?error=', () => {
      window.history.replaceState({}, '', '/?error=access_denied');

      render(<MainApp />);

      expect(store.setUIError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Spotify authorization failed: access_denied',
        })
      );
      expect(spotifyAuth.completeAuthorization).not.toHaveBeenCalled();
    });

    it('surfaces an error when the token exchange fails', async () => {
      (spotifyAuth.completeAuthorization as jest.Mock).mockRejectedValue(
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
      delete process.env.REACT_APP_SPOTIFY_CLIENT_ID;

      window.history.replaceState({}, '', '/?code=FAKE_CODE&state=STATE');

      render(<MainApp />);

      expect(store.setUIError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Spotify Client ID is not configured',
        })
      );
      expect(spotifyAuth.completeAuthorization).not.toHaveBeenCalled();
    });

    it('removes the one-time code and state params from the URL', async () => {
      window.history.replaceState({}, '', '/?code=FAKE_CODE&state=STATE');

      render(<MainApp />);

      await waitFor(() => {
        expect(window.location.search).toBe('');
      });
    });
  });

  describe('preset application behavior', () => {
    it('clears UI error when applying preset and error exists', () => {
      const setUIError = jest.fn();
      (store.setUIError as jest.Mock).mockImplementation(setUIError);

      (store.useUI as jest.Mock).mockReturnValue({
        ...mockStoreReturns.useUI,
        error: 'Some existing error',
      });

      render(<MainApp />);

      // Use the captured handler from mock
      mockAppShellProps.onApplyPreset({
        ratioConfig: { playlist1: 0.5 },
        strategy: 'balanced',
        settings: {},
        presetName: 'test-preset',
      });

      expect(setUIError).toHaveBeenCalledWith(null);
    });

    it('does not clear UI error when applying preset and no error exists', () => {
      const setUIError = jest.fn();
      (store.setUIError as jest.Mock).mockImplementation(setUIError);

      (store.useUI as jest.Mock).mockReturnValue({
        ...mockStoreReturns.useUI,
        error: null,
      });

      render(<MainApp />);

      // Use the captured handler from mock
      mockAppShellProps.onApplyPreset({
        ratioConfig: { playlist1: 0.5 },
        strategy: 'balanced',
        settings: {},
        presetName: 'test-preset',
      });

      expect(setUIError).not.toHaveBeenCalled();
    });
  });

  describe('playlist removal behavior', () => {
    it('removes playlist when it exists in selectedPlaylists', () => {
      const mockPlaylist = { id: 'playlist1', name: 'Test Playlist' };
      const togglePlaylistSelection = jest.fn();

      (store.usePlaylistSelection as jest.Mock).mockReturnValue({
        ...mockStoreReturns.usePlaylistSelection,
        selectedPlaylists: [mockPlaylist],
        togglePlaylistSelection,
      });

      render(<MainApp />);

      // Use the captured handler from mock
      mockAppShellProps.onPlaylistRemove('playlist1');

      expect(togglePlaylistSelection).toHaveBeenCalledWith(mockPlaylist);
    });

    it('does not remove playlist when it does not exist in selectedPlaylists', () => {
      const togglePlaylistSelection = jest.fn();

      (store.usePlaylistSelection as jest.Mock).mockReturnValue({
        ...mockStoreReturns.usePlaylistSelection,
        selectedPlaylists: [],
        togglePlaylistSelection,
      });

      render(<MainApp />);

      // Use the captured handler from mock
      mockAppShellProps.onPlaylistRemove('non-existent-playlist');

      expect(togglePlaylistSelection).not.toHaveBeenCalled();
    });
  });
});
