import React from 'react';
import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';
import * as store from '../store';
import * as spotifyAuth from '../services/spotifyAuth';

jest.spyOn(store, 'useAuth') as any;
jest.spyOn(store, 'usePlaylistSelection') as any;
jest.spyOn(store, 'useRatioConfig') as any;
jest.spyOn(store, 'useMixOptions') as any;
jest.spyOn(store, 'useUI') as any;

jest.mock('../services/spotifyAuth', () => ({
  ...jest.requireActual('../services/spotifyAuth'),
  completeAuthorization: jest.fn(),
}));

describe('App auth code callback handling (fixed file)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.REACT_APP_SPOTIFY_CLIENT_ID = 'test-client-id';
    window.history.replaceState({}, '', '/');
  });

  it('exchanges the authorization code and stores the tokens when not authenticated', async () => {
    const setAccessToken = jest.fn();
    const setTokens = jest.fn();
    const fakeTokens = {
      accessToken: 'FAKE_TOKEN',
      refreshToken: 'FAKE_REFRESH',
      expiresAt: Date.now() + 3600_000,
    };
    (spotifyAuth.completeAuthorization as jest.Mock).mockResolvedValue(
      fakeTokens
    );

    (store.useAuth as any).mockReturnValue({
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      isAuthenticated: false,
      setAccessToken,
      setTokens,
      clearAuth: jest.fn(),
    });
    (store.usePlaylistSelection as any).mockReturnValue({
      selectedPlaylists: [],
      togglePlaylistSelection: jest.fn(),
      clearAllPlaylists: jest.fn(),
    });
    (store.useRatioConfig as any).mockReturnValue({
      ratioConfig: {},
      setRatioConfigBulk: jest.fn(),
    });
    (store.useMixOptions as any).mockReturnValue({
      mixOptions: {},
      updateMixOptions: jest.fn(),
      applyPresetOptions: jest.fn(),
    });
    (store.useUI as any).mockReturnValue({
      error: null,
      mixedPlaylists: [],
      dismissError: jest.fn(),
      addMixedPlaylist: jest.fn(),
    });

    window.history.replaceState({}, '', '/?code=FAKE_CODE&state=FAKE_STATE');

    render(<App />);

    await waitFor(() => {
      expect(setTokens).toHaveBeenCalledWith(fakeTokens);
    });
    expect(spotifyAuth.completeAuthorization).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'test-client-id',
        code: 'FAKE_CODE',
        state: 'FAKE_STATE',
      })
    );
    // one-time code is removed from the address bar
    expect(window.location.search).toBe('');
  });
});
